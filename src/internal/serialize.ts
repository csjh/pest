import { nofunc } from "./primitives.js";
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
    if (ty.i < 0) return (ty.s = get_serializer(ty.e!));

    let prelude = "var _";
    let fn = `var f,s=p;p+=${ty.y + ty.u};`;

    let dynamics = 0;
    let nulls = 0;
    let static_size = 0;
    for (const name in ty.f) {
        const type = ty.f[name];
        get_serializer(type); // ensure serializer is cached

        static_size += type.z;
        if (!type.z) {
            if (dynamics !== 0) {
                fn += `w.d.setUint32(s+${(dynamics - 1) * 4},p-f,1);`;
            } else {
                fn += `f=p;`;
            }
            dynamics++;
        }
        if (type.n) {
            fn += `a.${name}==null?(p+=${type.z},w.u[s+${
                ty.y + (nulls >>> 3)
            }]|=${1 << (nulls & 7)}):`;
            nulls++;
        }
        prelude += `,_${name}=t.${name}.s`;
        fn += `p=_${name}(w,p,a.${name});`;
    }

    fn = `${prelude};return(w,p,a)=>{r(p,${static_size},w);${fn}return p}`;

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

    if (_schema.i === -1) {
        let e = _schema;
        while (e.i === -1) e = e.e!;
        writers.d.setInt32(0, Math.abs(e.i) | (1 << 31), true);
        writers.d.setUint32(4, _schema.y, true);
    } else {
        writers.d.setInt32(0, Math.abs(_schema.i), true);
    }
    const ptr = get_serializer(_schema)(writers, 8, data);
    return writers.u.subarray(0, ptr);
}
