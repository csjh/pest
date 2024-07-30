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

    let uint8 = new Uint8Array(1);
    let dv = new DataView(uint8.buffer);
    let ptr = 0;

    function num(ty: string, size: number): Serializer {
        return (data) => {
            reserve(size);
            // @ts-expect-error wah wah
            dv[`set${ty}${size * 8}`](ptr, data, true);
            ptr += size;
        };
    }

    // prettier-ignore
    const definitions = [
        num("Int", 1), num("Int", 2), num("Int", 4), num("BigInt", 8),
        num("Uint", 1), num("Uint", 2), num("Uint", 4), num("BigUint", 8),
        num("Float", 4), num("Float", 8),
        num("Uint", 1),
        num("Float", 8),
        (data) => {
            // i think this is enough for utf-16
            reserve(4 + data.length * 2);
            const length = encoder.encodeInto(
                data,
                uint8.subarray(ptr + 4)
            ).written;
            dv.setUint32(ptr, length, true);
            ptr += 4 + length;
        }
    ] satisfies Serializer[];

    function get_serializer(ty: PestTypeInternal): Serializer {
        if (ty.i < definitions.length) return definitions[ty.i];
        if (ty.e) {
            return !ty.e.z || ty.y > 1
                ? (data) => {
                      emit(data.length, 4);
                      const start = ptr;
                      reserve(4 * data.length);
                      ptr += 4 * data.length; // offset table
                      for (let i = 0; i < data.length; i++) {
                          dv.setUint32(
                              start + 4 * i,
                              ptr - 4 * data.length - start,
                              true
                          );
                          get_serializer(
                              ty.y == 1 ? ty.e! : { ...ty, y: ty.y - 1 }
                          )(data[i]);
                      }
                  }
                : (data) => {
                      emit(data.length, 4);
                      // align to ty.e.z bytes
                      if (ty.e!.i < 10) ptr += -ptr & (ty.e!.z - 1);
                      for (let i = 0; i < data.length; i++) {
                          get_serializer(ty.e!)(data[i]);
                      }
                  };
        }

        return ty.y
            ? (data) => {
                  const start = ptr;
                  let first_dyn = 0;
                  ptr += (ty.y - 1) * 4;
                  let dynamics = 0;
                  for (const [name, type] of Object.entries(ty.f).sort(
                      (a, b) => b[1].z - a[1].z
                  )) {
                      if (!type.z) {
                          if (dynamics === 0) {
                              first_dyn = ptr;
                          } else {
                              dv.setUint32(
                                  start + (dynamics - 1) * 4,
                                  ptr - first_dyn,
                                  true
                              );
                          }
                          dynamics++;
                      }
                      get_serializer(type)(data[name]);
                  }
              }
            : (data) => {
                  for (const name in ty.f) {
                      get_serializer(ty.f[name])(data[name]);
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
    }

    function emit(value: number, size: number = 1) {
        reserve(size);
        for (let i = 0; i < size; i++) {
            uint8[ptr++] = (value >>> (i * 8)) & 0xff;
        }
    }

    function encode(value: number) {
        const bytes = ((Math.clz32(value) - 2) / 8) >>> 0;
        emit(((value << 2) | bytes) >>> 0, 4 - bytes);
    }

    function encode_s(value: number) {
        const sign = value >>> 31;
        value &= 0x7fffffff;

        const bytes = ((Math.clz32(value) - 3) >>> 2) & 0b110;
        emit((value << 3) | bytes | sign, 4 - (bytes >>> 1));
    }

    if (_schema.e) {
        encode_s(_schema.e.i | (1 << 31));
        encode(_schema.y);
    } else {
        encode_s(_schema.i);
    }
    while (ptr % 8 !== 0) emit(0);
    get_serializer(_schema)(data);
    return uint8.subarray(0, ptr);
}
