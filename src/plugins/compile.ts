type CompileOptions =
    | {
          as: "javascript";
      }
    | {
          as: "dts";
      };

export function compile(code: string, opts: CompileOptions): string {
    const definitions = parse(code);

    if (opts.as === "javascript") {
        const sizes: Record<string, number> = {
            i8: 1,
            i16: 2,
            i32: 4,
            i64: 8,
            u8: 1,
            u16: 2,
            u32: 4,
            u64: 8,
            f32: 4,
            f64: 8,
            boolean: 1,
            Date: 8,
            string: 0,
            RegExp: 0
        };
        const primitives = Object.keys(sizes).length;

        for (const [name, members] of Object.entries(definitions)) {
            let size = 0;
            let nulls = 0;
            for (const maybenull_member of Object.values(members)) {
                const member = unnull(maybenull_member);
                if (member.type !== "array") {
                    if (!(member.inner in sizes)) {
                        throw new Error(
                            `Type ${name} must be defined before type ${member.inner}`
                        );
                    }
                    if (!sizes[member.inner]) {
                        size = 0;
                        break;
                    }
                    size += sizes[member.inner];
                    nulls += maybenull_member.type === "nullable" ? 1 : 0;
                } else {
                    size = 0;
                    break;
                }
            }
            sizes[name] = size + ((nulls + 7) >>> 3);
        }

        return (
            `export { serialize, deserialize } from "pest/internal";
import { array, nullable, i8, i16, i32, i64, u8, u16, u32, u64, f32, f64, boolean, Date, string, RegExp } from "pest/internal";
` +
            Object.entries(definitions)
                .map(([name, members], i) => {
                    const num_dynamics = Object.values(members)
                        .map(unnull)
                        .filter(
                            (v) => v.type === "array" || sizes[v.inner] === 0
                        ).length;
                    const num_nulls = Object.values(members).filter(
                        (v) => v.type === "nullable"
                    ).length;
                    return `
export const ${name} = {
    i: ${i + primitives},
    y: ${num_dynamics && (num_dynamics - 1) * 4},
    u: ${(num_nulls + 7) >>> 3},
    f: { ${Object.entries(members)
        .map(([k, v]) => `${k}: ${typeToJS(v)}`)
        .join(", ")} },
    z: ${sizes[name]}
};`;
                })
                .join("\n")
        );
    } else if (opts.as === "dts") {
        return (
            `import type { PestType, Unwrap } from "pest/internal";
export { serialize, deserialize, array } from "pest/internal";

declare const i8: number;
declare const i16: number;
declare const i32: number;
declare const i64: bigint;
declare const u8: number;
declare const u16: number;
declare const u32: number;
declare const u64: bigint;
declare const f32: number;
declare const f64: number;
` +
            Object.entries(definitions)
                .map(([name, members]) => {
                    return `
export interface ${name} extends Unwrap<{ ${Object.entries(members)
                        .map(([k, v]) => `${k}: ${fixType(typeToTS(v))}`)
                        .join(", ")} }> {}
export declare const ${name}: PestType<${name}>;`;
                })
                .join("\n")
        );
    }

    throw new Error(`Unknown compile option: ${opts}`);
}

interface Base {
    type: "base";
    inner: string;
}

interface Array {
    type: "array";
    inner: Type;
}

interface Nullable {
    type: "nullable";
    inner: Type;
}

type Type = Base | Array | Nullable;

function typeToTS(type: Type): string {
    switch (type.type) {
        case "base":
            return type.inner;
        case "array":
            return `${typeToTS(type.inner)}[]`;
        case "nullable":
            return `(${typeToTS(type.inner)} | null)`;
    }
}

function typeToJS(type: Type): string {
    switch (type.type) {
        case "base":
            return type.inner;
        case "array":
            let ty: Type = type;
            let depth = 0;
            while (ty.type === "array") {
                ty = ty.inner;
                depth++;
            }
            const el = typeToJS(ty);
            return depth == 1 ? `array(${el})` : `array(${el}, ${depth})`;
        case "nullable":
            return `nullable(${typeToJS(type.inner)})`;
    }
}

function unnull(type: Type): Base | Array {
    if (type.type === "nullable") {
        return unnull(type.inner);
    }
    return type;
}

function parse(code: string): Record<string, Record<string, Type>> {
    const keyword = "interface";

    const module: Record<string, Record<string, Type>> = {};

    let i = 0;
    function skip() {
        while (i < code.length && /[\s\n\r]/.test(code[i])) i++;
    }

    function read_identifier(): string {
        let start = i;
        while (i < code.length && /\w/.test(code[i])) i++;
        const identifier = code.slice(start, i);
        skip();
        return identifier;
    }

    function expect(str: string) {
        if (code.slice(i, i + str.length) !== str) {
            throw new Error(`Expected "${str}", found ` + code[i]);
        }
        i += str.length;
        skip();
    }

    skip();
    while (i < code.length) {
        const interface_ = read_identifier();
        if (interface_ !== keyword) {
            throw new Error(`Expected "${keyword}", found ` + interface_);
        }

        const typename = read_identifier();
        expect("{");

        const members: Record<string, Type> = {};
        while (code[i] !== "}") {
            const key = read_identifier();
            expect(":");
            const name = read_identifier();

            let ty: Type = { type: "base", inner: name };
            while (true) {
                if (code[i] === "?") {
                    i++;
                    ty = { type: "nullable", inner: ty };
                } else if (code[i] === "[" && code[i + 1] === "]") {
                    i += 2;
                    ty = { type: "array", inner: ty };
                } else break;
            }
            skip();

            expect(";");

            members[key] = ty;
        }
        i++;
        skip();

        module[typename] = members;
    }

    return module;
}

function fixType(type: string): string {
    return type
        .replaceAll("u8[]", "Uint8Array")
        .replaceAll("u16[]", "Uint16Array")
        .replaceAll("u32[]", "Uint32Array")
        .replaceAll("u64[]", "BigUint64Array")
        .replaceAll("i8[]", "Int8Array")
        .replaceAll("i16[]", "Int16Array")
        .replaceAll("i32[]", "Int32Array")
        .replaceAll("i64[]", "BigInt64Array")
        .replaceAll("f32[]", "Float32Array")
        .replaceAll("f64[]", "Float64Array");
}
