import {
    AcceptBroad,
    PestType,
    PestTypeInternal,
    Serializer
} from "./types.js";

const encoder = new TextEncoder();

export function serialize<T>(
    data: NoInfer<AcceptBroad<T>>,
    schema: PestType<T>
): Uint8Array {
    const _schema = schema as unknown as PestTypeInternal;

    let uint8 = new Uint8Array(8);
    let dv = new DataView(uint8.buffer);
    let ptr = 8;

    // prettier-ignore
    const definitions = [
        (data) => dv.setInt8(ptr, data),  (data) => dv.setInt16(ptr, data, true),  (data) => dv.setInt32(ptr, data, true),  (data) => dv.setBigInt64(ptr, data, true),
        (data) => dv.setUint8(ptr, data), (data) => dv.setUint16(ptr, data, true), (data) => dv.setUint32(ptr, data, true), (data) => dv.setBigUint64(ptr, data, true),
        (data) => dv.setFloat32(ptr, data, true), (data) => dv.setFloat64(ptr, data, true),
        (data) => dv.setUint8(ptr, data? 1 : 0),
        (data) => dv.setFloat64(ptr, data, true),
        (data) => {
            // i think this is enough for utf-16
            reserve(4 + data.length * 2);
            const length = encoder.encodeInto(data, uint8.subarray(ptr + 4)).written;
            dv.setUint32(ptr, length, true);
            ptr += 4 + length;
        },
        // serialized as string
        (data) => definitions[12](`${data.flags}\0${data.source}`)
    ] satisfies Serializer[];

    function get_serializer(ty: PestTypeInternal): Serializer {
        if (ty.i < definitions.length) {
            return (data) => {
                reserve(ty.z);
                definitions[ty.i](data);
                ptr += ty.z;
            };
        }
        if (isNaN(ty.i)) {
            return (data) => {
                // set length
                reserve(4);
                dv.setUint32(ptr, data.length, true);
                ptr += 4;

                // skip over dynamic offset table
                const start_of_offsets = ptr;
                if (!ty.f.e.z) {
                    ptr += reserve(4 * data.length);
                }

                // skip over null table otherwise align if TypedArray is available
                const start_of_nulls = ptr;
                if (ty.f.e.n) {
                    ptr += reserve((data.length + 7) >>> 3);
                } else if (ty.f.e.i < 10) {
                    ptr += -ptr & (ty.f.e.z - 1);
                }

                const start_of_data = ptr;
                for (let i = 0; i < data.length; i++) {
                    if (!ty.f.e.z) {
                        dv.setUint32(
                            start_of_offsets + 4 * i,
                            ptr - start_of_data,
                            true
                        );
                    }
                    if (data[i] != null) {
                        get_serializer(ty.f.e)(data[i]);
                    } else {
                        uint8[start_of_nulls + (i >>> 3)] |= 1 << (i & 7);
                        ptr += reserve(ty.f.e.z);
                    }
                }
            };
        }

        return (data) => {
            // skip over dynamic offset table
            const start_of_offsets = ptr;
            ptr += ty.y;

            // skip over null table
            const start_of_nulls = ptr;
            ptr += ty.u;

            let dynamics = 0;
            let nulls = 0;
            let first_dyn = 0;
            for (const [name, type] of Object.entries(ty.f).sort(
                (a, b) => b[1].z - a[1].z
            )) {
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
                    get_serializer(type)(data[name]);
                } else {
                    ptr += reserve(type.z);
                    uint8[start_of_nulls + (nulls >>> 3)] |= 1 << (nulls & 7);
                }
                if (type.n) {
                    nulls++;
                }
            }
        };
    }

    function reserve(size: number) {
        while (ptr + size >= uint8.length) {
            const old = uint8;
            uint8 = new Uint8Array(old.length * 2);
            uint8.set(old);
            dv = new DataView(uint8.buffer);
        }
        return size;
    }

    if (isNaN(_schema.i)) {
        dv.setInt32(0, _schema.f.m.i | (1 << 31), true);
        dv.setUint32(4, _schema.y, true);
    } else {
        dv.setInt32(0, _schema.i, true);
    }
    // @ts-expect-error something about excessively deep type instantiation
    get_serializer(_schema)(data);
    return uint8.subarray(0, ptr);
}
