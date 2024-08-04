import { PestType, PestTypeInternal } from "./types.js";

const decoder = new TextDecoder();

// prettier-ignore
const definitions = [
    (ptr, dv) => dv.getInt8(ptr),  (ptr, dv) => dv.getInt16(ptr, true),  (ptr, dv) => dv.getInt32(ptr, true),  (ptr, dv) => dv.getBigInt64(ptr, true),
    (ptr, dv) => dv.getUint8(ptr), (ptr, dv) => dv.getUint16(ptr, true), (ptr, dv) => dv.getUint32(ptr, true), (ptr, dv) => dv.getBigUint64(ptr, true),
    (ptr, dv) => dv.getFloat32(ptr, true), (ptr, dv) => dv.getFloat64(ptr, true),
    (ptr, dv) => dv.getUint8(ptr) !== 0,
    (ptr, dv) => new Date(dv.getFloat64(ptr, true)),
    (ptr, dv) => decoder.decode(new Uint8Array(dv.buffer, ptr + 4, dv.getUint32(ptr, true))),
    ((ptr, dv) => {
        const [flags, source] = definitions[12](ptr, dv).split('\0', 2);
        return new RegExp(source, flags);
    }),
] as const satisfies ((ptr: number, dv: DataView) => any)[];

const TypedArrays = [
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
];
function PestArray(ptr: number, dv: DataView, ty: PestTypeInternal) {
    const len = dv.getUint32(ptr, true);
    ptr += 4;
    if (0 <= ty.i && ty.i < 10 && !ty.n) {
        // align to ty.z bytes
        ptr += -ptr & (ty.z - 1);
        return new TypedArrays[ty.i](dv.buffer, ptr, len);
    }

    const arr = Array(len);
    for (let i = 0; i < len; i++) {
        if (
            ty.n &&
            dv.getUint8(ptr + (ty.z ? 0 : len * 4) + (i >>> 3)) & (1 << (i & 7))
        ) {
            arr[i] = null;
        } else {
            arr[i] = get_materialized(
                ptr +
                    (ty.n ? (len + 7) >>> 3 : 0) +
                    (ty.z
                        ? i * ty.z
                        : len * 4 + dv.getUint32(ptr + i * 4, true)),
                dv,
                ty
            );
        }
    }
    return arr;
}

function get_materialized(
    ptr: number,
    dv: DataView,
    ty: PestTypeInternal
): any {
    if (ty.i === -1) return PestArray(ptr, dv, ty.f.e);
    if (ty.i < 0) return get_materialized(ptr, dv, ty.f.e);
    if (ty.i < definitions.length) return definitions[ty.i](ptr, dv);
    if (ty.m) return ty.m(ptr, dv, ty.f, get_materialized);

    // values start after the offset table
    let pos = ty.y + ty.u;
    let dynamics = 0;
    let nulls = 0;

    let fn = `return{`;
    for (const name in ty.f) {
        const field = ty.f[name];
        fn += `${name}:`;
        if (field.n) {
            fn += `d.getUint8(p+${ty.y + (nulls >>> 3)})&${
                1 << (nulls & 7)
            }?null:`;
        }
        if (!ty.z && dynamics !== 0) {
            const table_offset = (dynamics - 1) * 4;
            fn += `g(p+${pos}+d.getUint32(p+${table_offset},1),d,f.${name}),`;
        } else {
            fn += `g(p+${pos},d,f.${name}),`;
        }
        pos += field.z;
        // @ts-expect-error complain to brendan eich
        dynamics += !field.z;
        if (field.n) nulls++;
    }
    fn += `}`;

    ty.m = new Function("p", "d", "f", "g", fn) as unknown as (typeof ty)["m"];
    return ty.m!(ptr, dv, ty.f, get_materialized);
}

export function materialize<T>(msg: Uint8Array, schema: PestType<T>): T {
    const internal = schema as unknown as PestTypeInternal;
    const buffer = msg.buffer;
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
        if ((type_id & 0x7fffffff) !== internal.f.m.i) {
            throw new Error("Type mismatch");
        }
    } else if (type_id !== Math.abs(internal.i)) {
        throw new Error("Type mismatch");
    }
    // 8 = skip over type id and depth
    return get_materialized(8, dv, internal) as T;
}
