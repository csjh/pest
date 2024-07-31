import { Deserializer, PestType, PestTypeInternal } from "./types.js";

interface Instance {
    $: number;
}

const decoder = new TextDecoder();

export function deserialize<T>(msg: Uint8Array, schema: PestType<T>): T {
    const internal = schema as unknown as PestTypeInternal;
    const buffer = msg.buffer;
    const dv = new DataView(buffer);
    let ptr = 8;

    // prettier-ignore
    const definitions = [
        (ptr) => dv.getInt8(ptr),  (ptr) => dv.getInt16(ptr, true),  (ptr) => dv.getInt32(ptr, true),  (ptr) => dv.getBigInt64(ptr, true),
        (ptr) => dv.getUint8(ptr), (ptr) => dv.getUint16(ptr, true), (ptr) => dv.getUint32(ptr, true), (ptr) => dv.getBigUint64(ptr, true),
        (ptr) => dv.getFloat32(ptr, true), (ptr) => dv.getFloat64(ptr, true),
        (ptr) => dv.getUint8(ptr) !== 0,
        (ptr) => new Date(dv.getFloat64(ptr, true)),
        (ptr) => decoder.decode(new Uint8Array(buffer, ptr + 4, dv.getUint32(ptr, true))),
        ((ptr) => {
            const [flags, source] = definitions[12](ptr).split('\0', 2);
            return new RegExp(source, flags);
        }) as Deserializer,
    ] as const satisfies Deserializer[];

    function PestArray(ptr: number, ty: PestTypeInternal) {
        const len = dv.getUint32(ptr, true);
        ptr += 4;
        if (ty.i < 10) {
            // align to ty.z bytes
            ptr += -ptr & (ty.z - 1);
            return new [
                Int8Array,
                Int16Array,
                Int32Array,
                BigInt64Array,
                Uint8Array,
                Uint16Array,
                Uint32Array,
                BigUint64Array,
                Float32Array,
                Float64Array
            ][ty.i](buffer, ptr, len);
        }

        const deserializer = get_deserializer(ty);
        return new Proxy([], {
            get(target, prop, receiver) {
                if (prop === "length") {
                    return len;
                } else if (typeof prop === "string" && !isNaN(+prop)) {
                    // base + length +
                    const addr =
                        ptr +
                        (ty.z
                            ? +prop * ty.z
                            : len * 4 + dv.getUint32(ptr + +prop * 4, true));
                    return deserializer(addr);
                }
                // @ts-expect-error this is supposed to be an array so if it doesn't fit the pattern it's an error
                return target[prop]?.bind(receiver);
            },
            has(target, prop) {
                return (
                    prop in target || (typeof prop === "string" && +prop < len)
                );
            },
            getPrototypeOf() {
                return Array.prototype;
            }
        });
    }

    function get_deserializer(ty: PestTypeInternal): Deserializer {
        if (ty.i < definitions.length) return definitions[ty.i];
        if (isNaN(ty.i)) return (ptr) => PestArray(ptr, ty.f.e!);

        // values start after the offset table
        let pos = ty.y && (ty.y - 1) * 4;
        let dynamics = 0;

        function fn(this: Instance, ptr: number) {
            // @ts-expect-error technically doesn't have right signature
            if (!this) return new fn(ptr);
            Object.defineProperty(this, "$", { value: ptr });
        }

        for (const [name, field] of Object.entries(ty.f).sort(
            (a, b) => b[1].z - a[1].z
        )) {
            const deserializer = get_deserializer(field);
            const posx = pos;
            if (!ty.z && dynamics !== 0) {
                const table_offset = (dynamics - 1) * 4;
                Object.defineProperty(fn.prototype, name, {
                    get(this: Instance) {
                        return deserializer(
                            this.$! +
                                posx +
                                dv.getUint32(this.$! + table_offset, true)
                        );
                    },
                    enumerable: true
                });
            } else {
                Object.defineProperty(fn.prototype, name, {
                    get(this: Instance) {
                        return deserializer(this.$! + posx);
                    },
                    enumerable: true
                });
            }
            pos += field.z;
            // @ts-expect-error complain to brendan eich
            dynamics += !field.z;
        }

        return fn;
    }

    const type_id = dv.getInt32(0, true);
    const depth = dv.getUint32(4, true);
    if (type_id < 0) {
        if (!isNaN(internal.i)) {
            throw new Error("Expected array type");
        }
        if (depth !== internal.y) {
            throw new Error("Depth mismatch");
        }
        if ((type_id & 0x7fffffff) !== internal.f.m.i) {
            throw new Error("Type mismatch");
        }
    } else if (type_id !== internal.i) {
        throw new Error("Type mismatch");
    }
    return get_deserializer(internal)(ptr) as T;
}

/*
typedef typeid (variable length integer with leading bits indicating depth of array then number indicating type)

struct definitions {
    type id (typeid but no wasted bit for array depth) (0 if done definitions)
    number of dynamic fields (leb128)
    array {
        field name (null terminated string? or fat?)
        field type (typeid)
    }
    null terminator
}
type of payload
--- delimiter (null terminator? implied?)
[payload]
*/

/*
everything aligned to 128 bits (wasm simd size)

representation
----------------
fixed size: (i|u)(8|16|32|64), f(32|64), bool, null, date, structs composed of fixed size types
    - future features: static sized arrays, tuples?, errors?
    - optimization potential: null bitsets in padding bits
dynamic: arrays, strings, structs composed of dynamic types
    - null bitmaps for arrays with null potential
    - in static sized arrays, null bit in padding bits if there's space beside the null bitset
    - dynamic structs:
        - need offset array for dynamic members start?/end
*/
