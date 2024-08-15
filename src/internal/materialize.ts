import { TypedArrays } from "./index.js";
import { nofunc } from "./primitives.js";
import type { Materializer, PestType, PestTypeInternal } from "./types.js";

export function PestArray(ptr: number, dv: DataView, ty: PestTypeInternal) {
    const len = dv.getUint32(ptr, true);
    ptr += 4;
    if (0 <= ty.i && ty.i < 10 && !ty.n) {
        // align to ty.z bytes
        ptr += -ptr & (ty.z - 1);
        return new TypedArrays[ty.i](dv.buffer, ptr, len);
    }

    const arr = Array(len);
    get_materialized(ty); // ensure materializer is cached
    for (let i = 0; i < len; i++) {
        if (
            ty.n &&
            dv.getUint8(ptr + (ty.z ? 0 : len * 4) + (i >>> 3)) & (1 << (i & 7))
        ) {
            arr[i] = null;
        } else {
            arr[i] = ty.m(
                ptr +
                    (ty.n ? (len + 7) >>> 3 : 0) +
                    (ty.z
                        ? i * ty.z
                        : len * 4 + dv.getUint32(ptr + i * 4, true)),
                dv
            );
        }
    }
    return arr;
}

function get_materialized(ty: PestTypeInternal): Materializer {
    if (ty.m !== nofunc) return ty.m;
    if (ty.i < 0) return (ty.m = get_materialized(ty.e!));

    // values start after the offset table
    let pos = ty.y + ty.u;
    let dynamics = 0;
    let nulls = 0;

    let prelude = "var _";
    let fn = `{`;
    for (const name in ty.f) {
        const field = ty.f[name];
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
        fn += `${name}:${
            field.n ? `d.getUint8(p+${ty.y + (nulls >>> 3)})&${1 << (nulls & 7)}?null:` : ""
        }_${name}(p+${pos}${
            dynamics ? `+d.getUint32(p+${(dynamics - 1) * 4},!0)` : ""
        },d),`;
        prelude += `,_${name}=f.${name}.m`;

        pos += field.z;
        // @ts-expect-error cry
        dynamics += !field.z;
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
    const internal = schema as unknown as PestTypeInternal;
    // @ts-expect-error
    const buffer = (msg.buffer ?? msg) as ArrayBuffer;
    const dv = new DataView(buffer);

    const type_id = dv.getInt32(0, true);
    const depth = dv.getUint32(4, true);
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
        // typedefs are negative
    } else if (type_id !== Math.abs(internal.i)) {
        throw new Error("Type mismatch");
    }
    // 8 = skip over type id and depth
    return get_materialized(internal)(8, dv) as T;
}
