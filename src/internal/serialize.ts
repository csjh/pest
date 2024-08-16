import { nofunc } from "./index.js";
import type {
    AcceptBroad,
    BufferWriters,
    PestType,
    PestTypeInternal,
    Serializer
} from "./types.js";

export function reserve(ptr: number, size: number, writers: BufferWriters) {
    while (ptr + size >= writers.u.length) {
        const len = writers.u.length;
        // @ts-expect-error
        const buffer = writers.u.buffer.transfer(len * 2);
        writers.d = new DataView(buffer);
        writers.u = new Uint8Array(buffer);
    }
    return size;
}

export function serialize_array(
    ty: PestTypeInternal,
    writers: BufferWriters,
    ptr: number,
    data: any[]
) {
    // set length
    reserve(ptr, 4, writers);
    writers.d.setUint32(ptr, data.length, true);
    ptr += 4;

    // skip over dynamic offset table
    const start_of_offsets = ptr;
    if (!ty.z) {
        ptr += reserve(ptr, 4 * data.length, writers);
    }

    // skip over null table otherwise align if TypedArray is available
    const start_of_nulls = ptr;
    if (ty.n) {
        ptr += reserve(ptr, (data.length + 7) >>> 3, writers);
    } else if (0 <= ty.i && ty.i < 10) {
        ptr += -ptr & (ty.z - 1);
    }

    // reserve space for data (only actually matters for static types)
    reserve(ptr, ty.z * data.length, writers);

    const start_of_data = ptr;
    const deserializer = get_serializer(ty);
    for (let i = 0; i < data.length; i++) {
        if (!ty.z) {
            writers.d.setUint32(
                start_of_offsets + 4 * i,
                ptr - start_of_data,
                true
            );
        }
        if (data[i] != null) {
            ptr = deserializer(writers, ptr, data[i]);
        } else {
            writers.u[start_of_nulls + (i >>> 3)] |= 1 << (i & 7);
            ptr += ty.z;
        }
    }
    return ptr;
}

function get_serializer(ty: PestTypeInternal): Serializer {
    if (ty.s !== nofunc) return ty.s;
    if (ty.y === 1) {
        (ty.f as PestTypeInternal[]).forEach(get_serializer);
        return (ty.s = (writers, ptr, data) => {
            let high = 0,
                high_idx = 0;
            for (let i = 0; i < ty.f.length; i++) {
                const w = (ty.f[i] as PestTypeInternal).w(data);
                if (w > high) {
                    high = w;
                    high_idx = i;
                }
            }
            writers.u[ptr] = high_idx;
            return (ty.f[high_idx] as PestTypeInternal).s(
                writers,
                ptr + 1,
                data
            );
        });
    }

    let prelude = "var _";
    let fn = `var f,s=p;p+=${ty.y + ty.u};`;

    let dynamics = 0;
    let nulls = 0;
    let pos = 0;
    let i = 0;
    for (const [name, type] of ty.f as [string, PestTypeInternal][]) {
        get_serializer(type); // ensure serializer is cached

        /*
        data = a.name
        if field is unsized:
            if this is the first dynamic field:
                first_dynamic = ptr;
            else:
                dv.setUint32(start_ptr + <dynamic table offset>, ptr - first_dynamic, true);
        if field is nullable and data == null:
            ptr += type.z;
            uint8[start_ptr + nulls >>> 3] |= 1 << (nulls & 7);
        else:
            type.s(writers, ptr, data)
        */

        // prettier-ignore
        fn += `${
            type.z ? "" : dynamics
                ? `w.d.setUint32(s+${(dynamics - 1) * 4},p-f,!0);`
                : `f=p;`
        }${
            type.n
                ? `a.${name}==null?(p+=${type.z},w.u[s+${ty.y + (nulls >>> 3)}]|=${1 << (nulls & 7)}):` : ""
        }p=_${name}(w,p,a.${name});`;

        // TODO: experiment more with inlining
        prelude += `,_${name}=t[${i++}][1].s`;

        pos += type.z;
        // @ts-expect-error cry
        dynamics += !type.z;
        nulls += type.n;
    }

    fn = `${prelude};return(w,p,a)=>{r(p,${pos},w);${fn}return p}`;

    return (ty.s = new Function("t", "r", fn)(ty.f, reserve));
}

export function serialize<T>(
    data: NoInfer<AcceptBroad<T>>,
    schema: PestType<T>
): Uint8Array {
    const _schema = schema as unknown as PestTypeInternal;

    const buffer = new ArrayBuffer(1024);
    const writers = {
        d: new DataView(buffer),
        u: new Uint8Array(buffer)
    };

    writers.d.setInt32(0, _schema.i, true);
    const ptr = get_serializer(_schema)(writers, 4, data);
    return writers.u.subarray(0, ptr);
}
