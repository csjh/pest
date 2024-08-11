import { nofunc } from "./primitives.js";
import { Deserializer, PestType, PestTypeInternal } from "./types.js";

interface Instance {
    $: number;
    _: DataView;
}

export function deserialize<T>(
    msg: Uint8Array | ArrayBuffer,
    schema: PestType<T>
): T {
    function PestArray(ptr: number, ty: PestTypeInternal, dv: DataView) {
        const len = dv.getUint32(ptr, true);
        ptr += 4;
        if (0 <= ty.i && ty.i < 10 && !ty.n) {
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
            ][ty.i](dv.buffer, ptr, len);
        }

        const deserializer = get_deserializer(ty);
        return new Proxy([], {
            get(target, prop, receiver) {
                if (prop === "length") {
                    return len;
                } else if (typeof prop === "string" && !isNaN(+prop)) {
                    if (
                        ty.n &&
                        dv.getUint8(
                            ptr + (ty.z ? 0 : len * 4) + (+prop >>> 3)
                        ) &
                            (1 << (+prop & 7))
                    )
                        return null;

                    return deserializer(
                        ptr +
                            (ty.n ? (len + 7) >>> 3 : 0) +
                            (ty.z
                                ? +prop * ty.z
                                : len * 4 +
                                  dv.getUint32(ptr + +prop * 4, true)),
                        dv
                    );
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
        if (ty.d !== nofunc) return ty.d;
        if (ty.i === -1) return (ty.d = (ptr, dv) => PestArray(ptr, ty.e!, dv));
        if (ty.i < 0) return (ty.d = get_deserializer(ty.e!));

        // values start after the offset table
        let pos = ty.y + ty.u;
        let dynamics = 0;
        let nulls = 0;

        const creator: Record<string, PropertyDescriptor> = {};

        for (const name in ty.f) {
            const field = ty.f[name];
            const deserializer = get_deserializer(field);
            // make sure the closures capture their own values
            const posx = pos;
            const nullsx = nulls;
            if (!ty.z && dynamics !== 0) {
                const table_offset = (dynamics - 1) * 4;
                creator[name] = {
                    get(this: Instance) {
                        if (
                            field.n &&
                            this._.getUint8(this.$ + ty.y + (nullsx >>> 3)) &
                                (1 << (nullsx & 7))
                        )
                            return null;

                        return deserializer(
                            this.$ +
                                posx +
                                this._.getUint32(this.$ + table_offset, true),
                            this._
                        );
                    },
                    enumerable: true
                };
            } else {
                creator[name] = {
                    get(this: Instance) {
                        if (
                            field.n &&
                            this._.getUint8(this.$ + ty.y + (nullsx >>> 3)) &
                                (1 << (nullsx & 7))
                        )
                            return null;

                        return deserializer(this.$ + posx, this._);
                    },
                    enumerable: true
                };
            }
            pos += field.z;
            // @ts-expect-error complain to brendan eich
            dynamics += !field.z;
            if (field.n) nulls++;
        }

        return (ty.d = (ptr, dv) => {
            return Object.defineProperties(
                Object.create(Object.prototype, creator),
                {
                    $: { value: ptr },
                    _: { value: dv }
                }
            );
        });
    }

    const internal = schema as unknown as PestTypeInternal;
    // @ts-expect-error cry
    const buffer = (msg.buffer ?? msg) as ArrayBuffer;
    const dv = new DataView(buffer);

    const type_id = dv.getInt32(0, true);
    const depth = dv.getUint32(4, true);
    // TODO: make this work with external nested array/nullable stuff
    if (type_id < 0) {
        if (internal.i !== -1) {
            throw new Error("Expected array type");
        }
        if (depth !== internal.y) {
            throw new Error("Depth mismatch");
        }
        let e = internal;
        while (e.i === -1) e = e.e!;
        if ((type_id & 0x7fffffff) !== Math.abs(e.i)) {
            throw new Error("Type mismatch");
        }
    } else if (type_id !== Math.abs(internal.i)) {
        throw new Error("Type mismatch");
    }
    // 8 = skip over type id and depth
    return get_deserializer(internal)(8, dv) as T;
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
