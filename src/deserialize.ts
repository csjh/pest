type Type = {
    (ptr: number): any;
    $?: number;
    sizeof: number;
};

const buffer = new ArrayBuffer(1 << 16);
const dv = new DataView(buffer);
const uint8 = new Uint8Array(buffer);
let ptr = 0;
const decoder = new TextDecoder();
const defineProperty = Object.defineProperty;

type DataViewGetterTypes = Extract<
    keyof DataView,
    `get${string}`
> extends `get${infer T}`
    ? T
    : never;

const nil: Type = (_) => null;
nil.sizeof = 1;
const date: Type = (ptr) => new Date(dv.getFloat64(ptr));
date.sizeof = 8;
// todo: string cache
const string: Type = (ptr) =>
    decoder.decode(new Uint8Array(buffer, ptr + 4, dv.getUint32(ptr, true)));
string.sizeof = 0;

const sized = (size: number, ty: DataViewGetterTypes): Type => {
    const Num: Type = (ptr) => dv[`get${ty}`](ptr);
    Num.sizeof = size;
    return Num;
};

// prettier-ignore
const definitions: Type[] = [
    nil, // 0: null
    sized(1, "Int8"), sized(2, "Int16"), sized(4, "Int32"), sized(8, "BigInt64"), sized(1, "Uint8"), sized(2, "Uint16"), sized(4, "Uint32"), sized(8, "BigUint64"), // 1-8: i8, i16, i32, i64, u8, u16, u32, u64
    sized(4, "Float32"), sized(8, "Float64"), // 9-10: f32, f64
    sized(1, "Uint8"), // 11: bool
    date, // 12: date
    string, // 13: string
];


// @ts-expect-error methods are added on later
class PestArray<T> implements ReadonlyArray<T> {
    length: number;

    constructor(ptr: number, depth: number, ty: Type) {
        // maybe make this a varint?
        const len = (this.length = dv.getUint32(ptr, true));
        return new Proxy(this, {
            get(target, prop) {
                if (typeof prop === "string" && !isNaN(+prop)) {
                    // prettier-ignore
                    const addr = depth === 0 && ty.sizeof
                        // base + length + sizeof(type) * index
                        ? ptr + 4 + +prop * ty.sizeof
                        // base + length + offset_table + offset
                        : ptr + 4 + (len + 1) * 4 + dv.getUint32(ptr + 4 + +prop * 4, true);
                    if (depth === 0) {
                        return ty(addr);
                    } else {
                        return new PestArray(addr, depth - 1, ty);
                    }
                } else if (prop in Array.prototype) {
                    return function (...args: unknown[]) {
                        // @ts-expect-error idek why it's whining
                        return Array.prototype[prop].apply(target, args);
                    };
                }
                return Reflect.get(target, prop);
            },
            set() {
                throw new Error("cannot set values on PreyArray");
            },
            getPrototypeOf() {
                return Array.prototype;
            }
        });
    }
}

export function deserialize(msg: ArrayBuffer): unknown {
    uint8.set(new Uint8Array(msg), ptr);

    function makeArrayer(ty: Type) {
        const depth = decode();
        const fn = (ptr: number) => new PestArray(ptr, depth, ty);
        fn.sizeof = 0;
        return fn;
    }

    function get_definition() {
        const n = decode_s();
        const def = definitions[n & 0x7fffffff];
        return n < 0 ? makeArrayer(def) : def;
    }

    function decode() {
        let n = dv.getUint32(ptr, true);
        let bytes = n & 0b11;
        ptr += 4 - bytes;
        bytes <<= 3;
        n = (n << bytes) >>> bytes;
        n >>= 2;
        return n;
    }

    function decode_s() {
        let n = dv.getUint32(ptr, true);
        const sign = n << 31;
        let bytes = (n & 0b110) >>> 1;
        ptr += 4 - bytes;
        bytes <<= 3;
        n = (n << bytes) >>> bytes;
        n >>= 3;
        return sign | n;
    }

    while (uint8[ptr]) {
        const type_id = decode();
        const total_dynamics = decode();
        let pos = 0;
        let dynamics = 0;

        const fn = (definitions[type_id] = function (this: Type, ptr) {
            if (!this) return new fn(ptr);
            this.$ = ptr;
        } as Type & { new (ptr: number): Type });

        while (uint8[ptr]) {
            const start = ptr;
            while (uint8[++ptr]);
            const str = decoder.decode(uint8.slice(start, ptr));
            ptr++;
            const ty = get_definition();
            let posx = pos;
            if (total_dynamics) {
                // skip offset table
                posx += total_dynamics * 4;
                let table_offset = dynamics * 4;
                defineProperty(fn, str, {
                    get(this: Type) {
                        return ty(
                            this.$! +
                                posx +
                                dv.getUint32(this.$! + table_offset, true)
                        );
                    }
                });
                dynamics++;
            } else {
                defineProperty(fn, str, {
                    get() {
                        return ty(this.$ + posx);
                    }
                });
            }
        }
        ptr++;

        // what we know at this point:
        //   - where the fields start (i.e. size of the end offsets array)
        //   - if there are dynamic fields
        //   - the size of the struct if it's static
        //   - the offsets of static fields relative to the nearest dynamic field
        //   - the nearest dynamic field to each static field <--- !

        // calculate pointer for dynamics with ptr + pos + uint32[ptr+nearest_dynamic_idx]
        //                   for statics  with ptr + pos

        fn.sizeof = total_dynamics ? 0 : pos;
    }
    ptr++;

    const payload_type = get_definition();
    // ptr += (-ptr & 15)
    while (ptr % 16 !== 0) ptr++;
    return payload_type(ptr);
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
