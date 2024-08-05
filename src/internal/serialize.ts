import {
    AcceptBroad,
    BufferWriters,
    PestType,
    PestTypeInternal,
    Serializer
} from "./types.js";

const encoder = new TextEncoder();

function reserve(ptr: number, size: number, writers: BufferWriters) {
    while (ptr + size >= writers.u.length) {
        const len = writers.u.length;
        // @ts-expect-error
        const buffer = writers.u.buffer.transfer(len * 2);
        writers.d = new DataView(buffer);
        writers.u = new Uint8Array(buffer);
    }
    return size;
}

// prettier-ignore
const definitions = [
    (writers, ptr, data) => (writers.d.setInt8(ptr, data), ptr + 1),  (writers, ptr, data) => (writers.d.setInt16(ptr, data, true), ptr + 2),  (writers, ptr, data) => (writers.d.setInt32(ptr, data, true), ptr + 4),  (writers, ptr, data) => (writers.d.setBigInt64(ptr, data, true), ptr + 8),
    (writers, ptr, data) => (writers.d.setUint8(ptr, data), ptr + 1), (writers, ptr, data) => (writers.d.setUint16(ptr, data, true), ptr + 2), (writers, ptr, data) => (writers.d.setUint32(ptr, data, true), ptr + 4), (writers, ptr, data) => (writers.d.setBigUint64(ptr, data, true), ptr + 8),
    (writers, ptr, data) => (writers.d.setFloat32(ptr, data, true), ptr + 4), (writers, ptr, data) => (writers.d.setFloat64(ptr, data, true), ptr + 8),
    (writers, ptr, data) => (writers.d.setUint8(ptr, data? 1 : 0), ptr + 1),
    (writers, ptr, data) => (writers.d.setFloat64(ptr, data, true), ptr + 8),
    (writers, ptr, data) => {
        // i think this is enough for utf-16
        reserve(ptr, 4 + data.length * 3, writers);

        // stolen from [wasm-bindgen](https://github.com/rustwasm/wasm-bindgen/blob/cf186acf48c4b0649934d19ba1aa18282bd2ec44/crates/cli/tests/reference/string-arg.js#L46)
        let length = 0;
        for (; length < data.length; length++) {
            const code = data.charCodeAt(length);
            if (code > 0x7f) break;
            writers.u[ptr + 4 + length] = code;
        }
    
        if (length !== data.length) {
            if (length !== 0) {
                data = data.slice(length);
            }
    
            length += encoder.encodeInto(
                data,
                writers.u.subarray(ptr + 4 + length, ptr + data.length)
            ).written;
        }
    
        writers.d.setUint32(ptr, length, true);
        return ptr + 4 + length;
    },
    // serialized as string
    (writers, ptr, data): number => definitions[12](writers, ptr,`${data.flags}\0${data.source}`)
] as const satisfies Serializer[];

function get_serializer(ty: PestTypeInternal): Serializer {
    if (ty.i === -1) {
        return (writers, ptr, data) => {
            // set length
            reserve(ptr, 4, writers);
            writers.d.setUint32(ptr, data.length, true);
            ptr += 4;

            // skip over dynamic offset table
            const start_of_offsets = ptr;
            if (!ty.f.e.z) {
                ptr += reserve(ptr, 4 * data.length, writers);
            }

            // skip over null table otherwise align if TypedArray is available
            const start_of_nulls = ptr;
            if (ty.f.e.n) {
                ptr += reserve(ptr, (data.length + 7) >>> 3, writers);
            } else if (0 <= ty.f.e.i && ty.f.e.i < 10) {
                ptr += -ptr & (ty.f.e.z - 1);
            }

            const start_of_data = ptr;
            const deserializer = get_serializer(ty.f.e);
            for (let i = 0; i < data.length; i++) {
                if (!ty.f.e.z) {
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
                    ptr += reserve(ptr, ty.f.e.z, writers);
                }
            }
            return ptr;
        };
    }
    if (ty.i < 0) return get_serializer(ty.f.e);
    if (ty.i < definitions.length) {
        return (writers, ptr, data) => {
            reserve(ptr, ty.z, writers);
            return definitions[ty.i](writers, ptr, data);
        };
    }
    if (ty.s)
        return (writers, ptr, data) =>
            ty.s!(writers, ptr, data, ty.f, reserve, get_serializer);

    let fn = `r(p,999,w);var f,s=p;p+=${ty.y + ty.u};`;

    let dynamics = 0;
    let nulls = 0;
    for (const name in ty.f) {
        const type = ty.f[name];
        if (!type.z) {
            if (dynamics !== 0) {
                fn += `w.d.setUint32(s+${(dynamics - 1) * 4},p-f,1);`;
            } else {
                fn += `f=p;`;
            }
            dynamics++;
        }
        if (type.n) fn += `if(a.${name}!=null)`;
        fn += `p=g(t.${name})(w,p,a.${name});`;
        if (type.n)
            fn += `else{p+=${type.z};w.u[s+${ty.y + (nulls >>> 3)}]|=${
                1 << (nulls & 7)
            }}`;
        if (type.n) nulls++;
    }

    fn += "return p";

    ty.s = new Function("w", "p", "a", "t", "r", "g", fn) as any;
    return get_serializer(ty);
}

export function serialize<T>(
    data: NoInfer<AcceptBroad<T>>,
    schema: PestType<T>
): Uint8Array {
    const _schema = schema as unknown as PestTypeInternal;

    const buffer = new ArrayBuffer(8);
    const writers = {
        d: new DataView(buffer),
        u: new Uint8Array(buffer)
    };

    if (_schema.i === -1) {
        writers.d.setInt32(0, _schema.f.m.i | (1 << 31), true);
        writers.d.setUint32(4, _schema.y, true);
    } else {
        writers.d.setInt32(0, Math.abs(_schema.i), true);
    }
    const ptr = get_serializer(_schema)(writers, 8, data);
    return writers.u.subarray(0, ptr);
}
