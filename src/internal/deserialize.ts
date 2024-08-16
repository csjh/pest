import { TypedArrays } from "./index.js";
import { nofunc } from "./index.js";
import { Deserializer, PestType, PestTypeInternal } from "./types.js";

interface Instance {
    _: DataView;
    $: number;
}
type ProxyArray = [number, PestTypeInternal, DataView, number];

const handler = {
    get(target, prop, receiver) {
        if (prop === "length") {
            return target[0];
        } else if (typeof prop === "string" && !isNaN(+prop)) {
            return index(target, +prop);
        }
        // @ts-expect-error this is supposed to be an array so if it doesn't fit the pattern it's an error
        return target[prop]?.bind(receiver);
    },
    has(target, prop) {
        return (
            prop in target || (typeof prop === "string" && +prop < target[0])
        );
    },
    getPrototypeOf() {
        return Array.prototype;
    }
} satisfies ProxyHandler<ProxyArray>;

for (const p of Object.getOwnPropertyNames(Reflect)) {
    if (!(p in handler)) {
        // @ts-expect-error
        handler[p] = () => {
            throw new Error(`Method ${p} not implemented for Pest arrays`);
        };
    }
}

// this is in a separate function so a new copy isn't allocated for each array
function index(ctx: ProxyArray, i: number) {
    if (
        ctx[1].n &&
        ctx[2].getUint8(ctx[3] + (ctx[1].z ? 0 : ctx[0] * 4) + (i >>> 3)) &
            (1 << (i & 7))
    )
        return null;

    return ctx[1].d(
        ctx[3] +
            (ctx[1].n ? (ctx[0] + 7) >>> 3 : 0) +
            (ctx[1].z
                ? i * ctx[1].z
                : ctx[0] * 4 + ctx[2].getUint32(ctx[3] + i * 4, true)),
        ctx[2]
    );
}

function deserialize_array(ptr: number, dv: DataView, ty: PestTypeInternal) {
    const len = dv.getUint32(ptr, true);
    ptr += 4;
    if (0 <= ty.i && ty.i < 10 && !ty.n) {
        // align to ty.z bytes
        ptr += -ptr & (ty.z - 1);
        return new TypedArrays[ty.i](dv.buffer, ptr, len);
    }

    get_deserializer(ty);
    const arr = [len, ty, dv, ptr] satisfies ProxyArray;
    return new Proxy(arr, handler);
}

const base = {
    $: { value: 0, writable: true },
    _: { value: null, writable: true }
};
function get_deserializer(ty: PestTypeInternal): Deserializer {
    if (ty.d !== nofunc) return ty.d;
    if (ty.e) return (ty.d = (ptr, dv) => deserialize_array(ptr, dv, ty.e!));

    // values start after the offset table
    let pos = ty.y + ty.u;
    let dynamics = 0;
    let nulls = 0;

    const creator: PropertyDescriptorMap = { ...base };

    for (const [name, field] of ty.f) {
        // same as in materialize.ts, but lazily
        creator[name] = {
            get: new Function(
                "d",
                `return function(){return ${
                    field.n
                        ? `(this._.getUint8(this.$+${ty.y + (nulls >>> 3)})&${
                              1 << (nulls & 7)
                          })?null:`
                        : ""
                }d(this.$+${pos}${
                    !ty.z && dynamics
                        ? `+this._.getUint32(this.$+${(dynamics - 1) * 4},!0)`
                        : ""
                },this._)}`
            )(get_deserializer(field)),
            enumerable: true
        };

        pos += field.z;
        // @ts-expect-error complain to brendan eich
        dynamics += !field.z;
        nulls += field.n;
    }

    // a constructor function is necessary to trigger slack tracking
    // https://v8.dev/blog/slack-tracking
    return (ty.d = function fn(this: Instance, ptr: number, dv: DataView) {
        // @ts-expect-error 😹
        if (!new.target) return new fn(ptr, dv);
        Object.defineProperties(this, creator);
        this.$ = ptr;
        this._ = dv;
        Object.setPrototypeOf(this, Object.prototype);
    });
}

export function deserialize<T>(
    msg: Uint8Array | ArrayBuffer,
    schema: PestType<T>
): T {
    const internal = schema as unknown as PestTypeInternal;
    // @ts-expect-error cry
    const buffer = (msg.buffer ?? msg) as ArrayBuffer;
    const dv = new DataView(buffer);

    const type_id = dv.getInt32(0, true);
    if (type_id !== internal.i) {
        throw new Error(
            `Type mismatch: expected ${internal.i}, got ${type_id}`
        );
    }
    // 4 = skip over type hash
    return get_deserializer(internal)(4, dv) as T;
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
