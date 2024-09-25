import { internalize, TypedArrays } from "./shared.js";
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
    },
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
        ctx[2].getUint8(ctx[3] + (ctx[1].z < 0 ? ctx[0] * 4 : 0) + (i >>> 3)) &
            (1 << (i & 7))
    )
        return null;

    return ctx[1].d!(
        ctx[3] +
            (ctx[1].n ? (ctx[0] + 7) >>> 3 : 0) +
            (ctx[1].z < 0
                ? ctx[0] * 4 + ctx[2].getUint32(ctx[3] + i * 4, true)
                : i * ctx[1].z),
        ctx[2]
    );
}

function get_array_view(ptr: number, dv: DataView, ty: PestTypeInternal) {
    const len = dv.getUint32(ptr, true);
    ptr += 4;
    if (0 <= ty.i && ty.i < 10 && !ty.n) {
        // align to ty.z bytes
        ptr += -ptr & (ty.z - 1);
        return new TypedArrays[ty.i](dv.buffer, ptr, len);
    }

    return new Proxy([len, ty, dv, ptr], handler);
}

const base = {
    $: { value: 0, writable: true },
    _: { value: null, writable: true },
};
function get_view(ty: PestTypeInternal): Deserializer {
    if (ty.d !== null) return ty.d;
    if (ty.y === 1) {
        const fields = ty.f as PestTypeInternal[];
        fields.forEach(get_view);
        return (ty.d = (ptr, dv) => fields[dv.getUint8(ptr)].d!(ptr + 1, dv));
    }
    if (ty.e) {
        get_view(ty.e);
        return (ty.d = (ptr, dv) => get_array_view(ptr, dv, ty.e!));
    }

    // values start after the offset table
    let pos = ty.y + ty.u;
    let dynamics = 0;
    let nulls = 0;

    const creator: PropertyDescriptorMap = { ...base };

    // cast is safe because `PestTypeInternal[]` path is blocked behind `ty.y === 1` check
    for (const [name, type] of ty.f as [string, PestTypeInternal][]) {
        // same as in deserialize.ts, but lazily
        creator[name] = {
            get: new Function(
                "d",
                `return function(){var v=this._,$=this.$;return ${
                    type.n
                        ? `(v.getUint8($+${ty.y + (nulls >>> 3)})&${
                              1 << (nulls & 7)
                          })?null:`
                        : ""
                }d($+${pos}${
                    ty.z < 0 && dynamics
                        ? `+v.getUint32($+${(dynamics - 1) * 4},!0)`
                        : ""
                },v)}`
            )(get_view(type)),
            enumerable: true,
        };

        if (type.z < 0) dynamics++;
        else pos += type.z;
        if (type.n) nulls++;
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

export function view<T>(
    msg: ArrayBufferView | ArrayBuffer,
    schema: PestType<T>
): T {
    /* @__PURE__ */ internalize(schema);

    const dv = ArrayBuffer.isView(msg)
        ? new DataView(msg.buffer, msg.byteOffset, msg.byteLength)
        : new DataView(msg);

    const type_id = dv.getInt32(0, true);
    if (type_id !== schema.i) {
        throw new Error(`Type mismatch: expected ${schema.i}, got ${type_id}`);
    }
    // 4 = skip over type hash
    return get_view(schema)(4, dv) as T;
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
