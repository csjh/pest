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
            RegExp: 0,
        };
        const primitives = Object.keys(sizes).length;

        for (const [name, members] of Object.entries(definitions)) {
            let size = 0;
            for (const member of Object.values(members)) {
                if (!member.depth) {
                    if (!(member.type in sizes)) {
                        throw new Error(
                            `Type ${name} must be defined before type ${member.type}`
                        );
                    }
                    if (!sizes[member.type]) {
                        size = 0;
                        break;
                    }
                    size += sizes[member.type];
                } else {
                    size = 0;
                    break;
                }
            }
            sizes[name] = size;
        }

        return (
            `export { serialize, deserialize } from "pest/internal";
import { array, i8, i16, i32, i64, u8, u16, u32, u64, f32, f64, boolean, Date, string, RegExp } from "pest/internal";
` +
            Object.entries(definitions)
                .map(([name, members], i) => {
                    return `
export const ${name} = {
    i: ${i + primitives},
    y: ${
        Object.values(members).filter((v) => v.depth || sizes[v.type] === 0)
            .length
    },
    f: { ${Object.entries(members)
        .map(
            ([k, v]) =>
                `${k}: ${v.depth ? `array(${v.type}, ${v.depth})` : v.type}`
        )
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
                        .map(
                            ([k, v]) =>
                                `${k}: ${fixType(
                                    v.type + "[]".repeat(v.depth)
                                )}`
                        )
                        .join(", ")} }> {};
export declare const ${name}: PestType<${name}>;`;
                })
                .join("\n")
        );
    }

    throw new Error(`Unknown compile option: ${opts}`);
}

interface Type {
    type: string;
    // 0 for non-arrays
    depth: number;
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
            const type = read_identifier();

            const ty = { type, depth: 0 };
            while (code[i] === "[" && code[i + 1] === "]") {
                i += 2;
                ty.depth++;
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
