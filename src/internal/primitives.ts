import { PestArray } from "./materialize.js";
import { reserve, serialize_array } from "./serialize.js";
import { BufferWriters, Deserializer, PestType, PestTypeInternal, Serializer } from "./types.js";

export const nofunc = function (): any {};

/* @__PURE__ */
function primitive(i: number, size: number, s: Serializer, d: Deserializer): PestType<unknown> {
    // @ts-expect-error i'm lying!
    return { i, y: 0, u: 0, f: {}, z: size, n: 0, e: null, s, d, m: d };
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encode_string(w: BufferWriters, ptr: number, data: string): number {
    // i think this is enough for utf-16
    reserve(ptr, 4 + data.length * 3, w);

    ptr += 4;

    // stolen from [wasm-bindgen](https://github.com/rustwasm/wasm-bindgen/blob/cf186acf48c4b0649934d19ba1aa18282bd2ec44/crates/cli/tests/reference/string-arg.js#L46)
    let length = 0;
    for (; length < data.length; length++) {
        const code = data.charCodeAt(length);
        if (code > 0x7f) break;
        w.u[ptr + length] = code;
    }

    if (length !== data.length) {
        if (length !== 0) {
            data = data.slice(length);
        }

        length += encoder.encodeInto(
            data,
            w.u.subarray(ptr + length, ptr + length + data.length * 3)
        ).written;
    }

    w.d.setUint32(ptr - 4, length, true);
    return ptr + length;
}

export const i8 =      primitive( 0, 1, (w, ptr, data) => (w.d.setInt8     (ptr, data),        ptr + 1), (ptr, dv) => dv.getInt8     (ptr)      )         as PestType<number>;
export const i16 =     primitive( 1, 2, (w, ptr, data) => (w.d.setInt16    (ptr, data, true),  ptr + 2), (ptr, dv) => dv.getInt16    (ptr, true))         as PestType<number>;
export const i32 =     primitive( 2, 4, (w, ptr, data) => (w.d.setInt32    (ptr, data, true),  ptr + 4), (ptr, dv) => dv.getInt32    (ptr, true))         as PestType<number>;
export const i64 =     primitive( 3, 8, (w, ptr, data) => (w.d.setBigInt64 (ptr, data, true),  ptr + 8), (ptr, dv) => dv.getBigInt64 (ptr, true))         as PestType<bigint>;
export const u8 =      primitive( 4, 1, (w, ptr, data) => (w.d.setUint8    (ptr, data),        ptr + 1), (ptr, dv) => dv.getUint8    (ptr)      )         as PestType<number>;
export const u16 =     primitive( 5, 2, (w, ptr, data) => (w.d.setUint16   (ptr, data, true),  ptr + 2), (ptr, dv) => dv.getUint16   (ptr, true))         as PestType<number>;
export const u32 =     primitive( 6, 4, (w, ptr, data) => (w.d.setUint32   (ptr, data, true),  ptr + 4), (ptr, dv) => dv.getUint32   (ptr, true))         as PestType<number>;
export const u64 =     primitive( 7, 8, (w, ptr, data) => (w.d.setBigUint64(ptr, data, true),  ptr + 8), (ptr, dv) => dv.getBigUint64(ptr, true))         as PestType<bigint>;
export const f32 =     primitive( 8, 4, (w, ptr, data) => (w.d.setFloat32  (ptr, data, true),  ptr + 4), (ptr, dv) => dv.getFloat32  (ptr, true))         as PestType<number>;
export const f64 =     primitive( 9, 8, (w, ptr, data) => (w.d.setFloat64  (ptr, data, true),  ptr + 8), (ptr, dv) => dv.getFloat64  (ptr, true))         as PestType<number>;
export const boolean = primitive(10, 1, (w, ptr, data) => (w.d.setUint8    (ptr, data? 1 : 0), ptr + 1), (ptr, dv) => dv.getUint8    (ptr) !== 0)         as PestType<boolean>;
const _Date =          primitive(11, 8, (w, ptr, data) => (w.d.setFloat64  (ptr, +data, true), ptr + 8), (ptr, dv) => new Date(dv.getFloat64(ptr, true))) as PestType<Date>;
export const string =  primitive(12, 0, encode_string, (ptr, dv) => decoder.decode(new Uint8Array(dv.buffer, ptr + 4, dv.getUint32(ptr, true))))          as PestType<string>;
const _RegExp =        primitive(13, 0, (w, ptr, data): number => encode_string(w, ptr,`${data.flags}\0${data.source}`), (ptr, dv) => {
    const [flags, source] = (string as any).m(ptr, dv).split('\0', 2);
    return globalThis.RegExp(source, flags);
}) as PestType<RegExp>;

export { _Date as Date, _RegExp as RegExp };

export function array<T>(e: PestType<T>, depth: number = 1): PestType<T[]> {
    if (!depth) return e as unknown as PestType<T[]>;
    const el = array(e, depth - 1) as unknown as PestTypeInternal;
    return {
        i: -1,
        y: depth >>> 0,
        u: 0,
        f: {},
        z: 0,
        n: 0,
        e: el,
        s: (writers, ptr, data) => serialize_array(el, writers, ptr, data),
        // the same as the above isn't done because i don't want ./deserialize.ts to be shipped unless explicitly imported
        d: nofunc,
        m: (ptr, dv) => PestArray(ptr, dv, el)
    } satisfies PestTypeInternal as unknown as PestType<T[]>;
}

export function nullable(t: PestTypeInternal): PestTypeInternal {
    return { ...t, n: 1 };
}
