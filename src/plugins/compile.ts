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

        function get_sizeof(type: Type): number {
            type = unnull(type);
            switch (type.type) {
                case "base":
                    if (!(type.inner in sizes)) {
                        throw new Error(
                            `Type ${type.inner} must be defined before usage`
                        );
                    }
                    if (sizes[type.inner] === 0) {
                        return -Infinity;
                    }
                    return sizes[type.inner];
                case "array":
                    return -Infinity;
            }
        }

        for (const def of definitions) {
            let size = 0;
            let nulls = 0;
            if (def.type === "typedef") {
                sizes[def.name] = get_sizeof(def.ty);
            } else if (def.type === "interface") {
                for (const member of Object.values(def.members)) {
                    size += get_sizeof(member);
                    nulls += member.type === "nullable" ? 1 : 0;
                }
                size += (nulls + 7) >>> 3;
                sizes[def.name] = Math.max(size, 0);
            }
        }

        return (
            `export { serialize, deserialize, materialize } from "pest/internal";
import { array, nullable, i8, i16, i32, i64, u8, u16, u32, u64, f32, f64, boolean, Date, string, RegExp, nofunc } from "pest/internal";
` +
            definitions
                .map((def, i) => {
                    if (def.type === "typedef") {
                        return `
export const ${def.name} = {
    i: -${i + primitives},
    y: 0,
    u: 0,
    f: {},
    z: 0,
    n: 0,
    e: ${typeToJS(def.ty)},
    s: nofunc,
    d: nofunc,
    m: nofunc
};`;
                    } else if (def.type === "interface") {
                        const num_dynamics = Object.values(def.members)
                            .map(unnull)
                            .filter(
                                (v) =>
                                    v.type === "array" || sizes[v.inner] === 0
                            ).length;
                        const num_nulls = Object.values(def.members).filter(
                            (v) => v.type === "nullable"
                        ).length;
                        return `
export const ${def.name} = {
    i: ${i + primitives},
    y: ${num_dynamics && (num_dynamics - 1) * 4},
    u: ${(num_nulls + 7) >>> 3},
    f: { ${Object.entries(def.members)
        .sort((a, b) => get_sizeof(b[1]) - get_sizeof(a[1]))
        .map(([k, v]) => `${k}: ${typeToJS(v)}`)
        .join(", ")} },
    z: ${sizes[def.name]},
    n: 0,
    e: null,
    s: nofunc,
    d: nofunc,
    m: nofunc
};`;
                    }
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

interface Interface {
    type: "interface";
    name: string;
    members: Record<string, Type>;
}

interface Typedef {
    type: "typedef";
    name: string;
    ty: Type;
}

type Definition = Interface | Typedef;

function parse(code: string) {
    const module: Definition[] = [];

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

    function read_type(): Type {
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

        return ty;
    }

    skip();
    while (i < code.length) {
        const ident = read_identifier();
        if (ident === "interface") {
            const name = read_identifier();
            expect("{");

            const members: Record<string, Type> = {};
            while (code[i] !== "}") {
                const key = read_identifier();
                expect(":");

                const ty = read_type();

                expect(";");

                members[key] = ty;
            }
            i++;
            skip();

            module.push({ type: "interface", name, members });
        } else if (ident === "typedef") {
            const name = read_identifier();
            expect("=");
            const ty = read_type();
            if (ty.type === "nullable") {
                throw new Error(
                    `typedef ${name} is invalid, only struct members or array elements can be nullable`
                );
            }
            expect(";");
            module.push({ type: "typedef", name, ty });
        } else {
            throw new Error(
                `Unexpected identifier: ${ident}, expected interface or typedef`
            );
        }
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
