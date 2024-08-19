import { internalize, TypedArrays } from "./shared.js";
import type { Materializer, PestType, PestTypeInternal } from "./types.js";

export function materialize_array(
    ptr: number,
    dv: DataView,
    ty: PestTypeInternal
) {
    const len = dv.getUint32(ptr, true);
    ptr += 4;
    if (0 <= ty.i && ty.i < 10 && !ty.n) {
        // align to ty.z bytes
        ptr += -ptr & (ty.z - 1);
        return new TypedArrays[ty.i](dv.buffer, ptr, len);
    }

    const arr = Array.from({ length: len });
    get_materialized(ty); // ensure materializer is cached
    for (let i = 0; i < len; i++) {
        if (
            ty.n &&
            dv.getUint8(ptr + (ty.z < 0 ? len * 4 : 0) + (i >>> 3)) &
                (1 << (i & 7))
        ) {
            arr[i] = null;
        } else {
            arr[i] = ty.m!(
                ptr +
                    (ty.n ? (len + 7) >>> 3 : 0) +
                    (ty.z < 0
                        ? len * 4 + dv.getUint32(ptr + i * 4, true)
                        : i * ty.z),
                dv
            );
        }
    }
    return arr;
}

function get_materialized(ty: PestTypeInternal): Materializer {
    if (ty.m !== null) return ty.m;
    if (ty.y === 1) {
        (ty.f as PestTypeInternal[]).forEach(get_materialized);
        return (ty.m = (ptr, dv) =>
            (ty.f as PestTypeInternal[])[dv.getUint8(ptr)].m!(ptr + 1, dv));
    }

    // values start after the offset table
    let pos = ty.y + ty.u;
    let dynamics = 0;
    let nulls = 0;

    let prelude = "var _";
    let fn = `{`;
    let i = 0;
    for (const [name, field] of ty.f as [string, PestTypeInternal][]) {
        get_materialized(field); // ensure materializer is cached
        /*
        one of four forms:
        if field is nullable and (dv.getUint8(ptr + nulls >>> 3) & (1 << (nulls & 7))) != 0:
            output[name] = null
        else if field is sized:
            output[name] = field.m(p + pos, dv)
        else:
            output[name] = field.m(p + pos + dv.getUint32(p + dynamics * 4, true), dv)
        */
        // prettier-ignore
        fn += `${JSON.stringify(name)}:${
            field.n ? `d.getUint8(p+${ty.y + (nulls >>> 3)})&${1 << (nulls & 7)}?null:` : ""
        }_${i}(p+${pos}${
            dynamics ? `+d.getUint32(p+${(dynamics - 1) * 4},!0)` : ""
        },d),`;
        prelude += `,_${i}=f[${i++}][1].m`;

        if (field.z > 0) pos += field.z;
        if (field.z < 0) dynamics++;
        nulls += field.n;
    }
    fn += `}`;
    fn = `${prelude};return(p,d)=>(${fn})`;

    return (ty.m = new Function("f", fn)(ty.f));
}

export function materialize<T>(
    msg: Uint8Array | ArrayBuffer,
    schema: PestType<T>
): T {
    /* @__PURE__ */ internalize(schema);

    // @ts-expect-error
    const buffer = (msg.buffer ?? msg) as ArrayBuffer;
    const dv = new DataView(buffer);

    const type_id = dv.getInt32(0, true);
    if (type_id !== schema.i) {
        throw new Error(`Type mismatch: expected ${schema.i}, got ${type_id}`);
    }
    // 4 = skip over type id and depth
    return get_materialized(schema)(4, dv) as T;
}