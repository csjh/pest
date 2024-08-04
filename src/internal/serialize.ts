import {
    AcceptBroad,
    PestType,
    PestTypeInternal,
    Serializer
} from "./types.js";

const encoder = new TextEncoder();

function reserve(ptr: number, size: number, dv: DataView) {
    while (ptr + size >= dv.buffer.byteLength) {
        // @ts-expect-error
        dv.buffer.resize(dv.buffer.byteLength * 2);
    }
    return size;
}

export function serialize<T>(
    data: NoInfer<AcceptBroad<T>>,
    schema: PestType<T>
): Uint8Array {
    // prettier-ignore
    const definitions = [
        (dv, ptr, data) => (dv.setInt8(ptr, data), ptr + 1),  (dv, ptr, data) => (dv.setInt16(ptr, data, true), ptr + 2),  (dv, ptr, data) => (dv.setInt32(ptr, data, true), ptr + 4),  (dv, ptr, data) => (dv.setBigInt64(ptr, data, true), ptr + 8),
        (dv, ptr, data) => (dv.setUint8(ptr, data), ptr + 1), (dv, ptr, data) => (dv.setUint16(ptr, data, true), ptr + 2), (dv, ptr, data) => (dv.setUint32(ptr, data, true), ptr + 4), (dv, ptr, data) => (dv.setBigUint64(ptr, data, true), ptr + 8),
        (dv, ptr, data) => (dv.setFloat32(ptr, data, true), ptr + 4), (dv, ptr, data) => (dv.setFloat64(ptr, data, true), ptr + 8),
        (dv, ptr, data) => (dv.setUint8(ptr, data? 1 : 0), ptr + 1),
        (dv, ptr, data) => (dv.setFloat64(ptr, data, true), ptr + 8),
        (dv, ptr, data, uint8) => {
            // i think this is enough for utf-16
            reserve(ptr, 4 + data.length * 3, dv);

            // stolen from [wasm-bindgen](https://github.com/rustwasm/wasm-bindgen/blob/cf186acf48c4b0649934d19ba1aa18282bd2ec44/crates/cli/tests/reference/string-arg.js#L46)
            let length = 0;
            for (; length < data.length; length++) {
                const code = data.charCodeAt(length);
                if (code > 0x7f) break;
                uint8[ptr + 4 + length] = code;
            }
        
            if (length !== data.length) {
                if (length !== 0) {
                    data = data.slice(length);
                }
        
                length += encoder.encodeInto(
                    data,
                    uint8.subarray(ptr + 4 + length, ptr + data.length)
                ).written;
            }
        
            dv.setUint32(ptr, length, true);
            return ptr + 4 + length;
        },
        // serialized as string
        (dv, ptr, data, uint8): number => definitions[12](dv, ptr,`${data.flags}\0${data.source}`, uint8)
    ] as const satisfies Serializer[];

    function get_serializer(ty: PestTypeInternal): Serializer {
        if (ty.i === -1) {
            return (dv, ptr, data, uint8) => {
                // set length
                reserve(ptr, 4, dv);
                dv.setUint32(ptr, data.length, true);
                ptr += 4;

                // skip over dynamic offset table
                const start_of_offsets = ptr;
                if (!ty.f.e.z) {
                    ptr += reserve(ptr, 4 * data.length, dv);
                }

                // skip over null table otherwise align if TypedArray is available
                const start_of_nulls = ptr;
                if (ty.f.e.n) {
                    ptr += reserve(ptr, (data.length + 7) >>> 3, dv);
                } else if (0 <= ty.f.e.i && ty.f.e.i < 10) {
                    ptr += -ptr & (ty.f.e.z - 1);
                }

                const start_of_data = ptr;
                const deserializer = get_serializer(ty.f.e);
                for (let i = 0; i < data.length; i++) {
                    if (!ty.f.e.z) {
                        dv.setUint32(
                            start_of_offsets + 4 * i,
                            ptr - start_of_data,
                            true
                        );
                    }
                    if (data[i] != null) {
                        ptr = deserializer(dv, ptr, data[i], uint8);
                    } else {
                        uint8[start_of_nulls + (i >>> 3)] |= 1 << (i & 7);
                        ptr += reserve(ptr, ty.f.e.z, dv);
                    }
                }
                return ptr;
            };
        }
        if (ty.i < 0) return get_serializer(ty.f.e);
        if (ty.i < definitions.length) {
            return (dv, ptr, data, uint8) => {
                reserve(ptr, ty.z, dv);
                return definitions[ty.i](dv, ptr, data, uint8);
            };
        }

        return (dv, ptr, data, uint8) => {
            // skip over dynamic offset table
            const start_of_offsets = ptr;
            ptr += ty.y;

            // skip over null table
            const start_of_nulls = ptr;
            ptr += ty.u;

            let dynamics = 0;
            let nulls = 0;
            let first_dyn = 0;
            for (const name in ty.f) {
                const type = ty.f[name];
                if (!type.z) {
                    if (dynamics !== 0) {
                        dv.setUint32(
                            start_of_offsets + (dynamics - 1) * 4,
                            ptr - first_dyn,
                            true
                        );
                    } else {
                        first_dyn = ptr;
                    }
                    dynamics++;
                }
                if (data[name] != null) {
                    ptr = get_serializer(type)(dv, ptr, data[name], uint8);
                } else {
                    ptr += reserve(ptr, type.z, dv);
                    uint8[start_of_nulls + (nulls >>> 3)] |= 1 << (nulls & 7);
                }
                if (type.n) {
                    nulls++;
                }
            }
            return ptr;
        };
    }

    const _schema = schema as unknown as PestTypeInternal;

    // TODO: is a super high maxByteLength bad? probably
    // @ts-expect-error
    const buffer = new ArrayBuffer(8, { maxByteLength: 1 << 30 });
    const uint8 = new Uint8Array(buffer);
    const dv = new DataView(buffer);

    if (_schema.i === -1) {
        dv.setInt32(0, _schema.f.m.i | (1 << 31), true);
        dv.setUint32(4, _schema.y, true);
    } else {
        dv.setInt32(0, Math.abs(_schema.i), true);
    }
    const ptr = get_serializer(_schema)(dv, 8, data, uint8);
    return uint8.subarray(0, ptr);
}
