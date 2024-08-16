import { nofunc } from "./index.js";
import { materialize_array } from "./materialize.js";
import { reserve, serialize_array } from "./serialize.js";
import { BufferWriters, Deserializer, PestType, PestTypeInternal, Serializer } from "./types.js";

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

export const i8 =      /* @__PURE__ */ primitive( 0, 1, (w, ptr, data) => (w.d.setInt8     (ptr, data),        ptr + 1), (ptr, dv) =>          dv.getInt8     (ptr)       ) as PestType<number>;
export const i16 =     /* @__PURE__ */ primitive( 1, 2, (w, ptr, data) => (w.d.setInt16    (ptr, data, true),  ptr + 2), (ptr, dv) =>          dv.getInt16    (ptr, true )) as PestType<number>;
export const i32 =     /* @__PURE__ */ primitive( 2, 4, (w, ptr, data) => (w.d.setInt32    (ptr, data, true),  ptr + 4), (ptr, dv) =>          dv.getInt32    (ptr, true )) as PestType<number>;
export const i64 =     /* @__PURE__ */ primitive( 3, 8, (w, ptr, data) => (w.d.setBigInt64 (ptr, data, true),  ptr + 8), (ptr, dv) =>          dv.getBigInt64 (ptr, true )) as PestType<bigint>;
export const u8 =      /* @__PURE__ */ primitive( 4, 1, (w, ptr, data) => (w.d.setUint8    (ptr, data),        ptr + 1), (ptr, dv) =>          dv.getUint8    (ptr)       ) as PestType<number>;
export const u16 =     /* @__PURE__ */ primitive( 5, 2, (w, ptr, data) => (w.d.setUint16   (ptr, data, true),  ptr + 2), (ptr, dv) =>          dv.getUint16   (ptr, true )) as PestType<number>;
export const u32 =     /* @__PURE__ */ primitive( 6, 4, (w, ptr, data) => (w.d.setUint32   (ptr, data, true),  ptr + 4), (ptr, dv) =>          dv.getUint32   (ptr, true )) as PestType<number>;
export const u64 =     /* @__PURE__ */ primitive( 7, 8, (w, ptr, data) => (w.d.setBigUint64(ptr, data, true),  ptr + 8), (ptr, dv) =>          dv.getBigUint64(ptr, true )) as PestType<bigint>;
export const f32 =     /* @__PURE__ */ primitive( 8, 4, (w, ptr, data) => (w.d.setFloat32  (ptr, data, true),  ptr + 4), (ptr, dv) =>          dv.getFloat32  (ptr, true )) as PestType<number>;
export const f64 =     /* @__PURE__ */ primitive( 9, 8, (w, ptr, data) => (w.d.setFloat64  (ptr, data, true),  ptr + 8), (ptr, dv) =>          dv.getFloat64  (ptr, true )) as PestType<number>;
export const boolean = /* @__PURE__ */ primitive(10, 1, (w, ptr, data) => (w.d.setUint8    (ptr, data? 1 : 0), ptr + 1), (ptr, dv) =>          dv.getUint8    (ptr) !== 0 ) as PestType<boolean>;
export const date =    /* @__PURE__ */ primitive(11, 8, (w, ptr, data) => (w.d.setFloat64  (ptr, +data, true), ptr + 8), (ptr, dv) => new Date(dv.getFloat64  (ptr, true))) as PestType<Date>;
export const string =  /* @__PURE__ */ primitive(12, 0, encode_string, (ptr, dv) => decoder.decode(new Uint8Array(dv.buffer, ptr + 4, dv.getUint32(ptr, true))))            as PestType<string>;
export const regexp =  /* @__PURE__ */ primitive(13, 0, (w, ptr, data): number => encode_string(w, ptr,`${data.flags}\0${data.source}`), (ptr, dv) => {
    const [flags, source] = (string as any).m(ptr, dv).split('\0', 2);
    return RegExp(source, flags);
}) as PestType<RegExp>;

function string_hash(s: string) {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        hash = (Math.imul(hash, 31) + s.charCodeAt(i)) | 0;
    }
    return hash;
}

export function struct<T>(fields: { [K in keyof T]: PestType<T[K]> }): PestType<T> {
    let dynamics = 0;
    let nulls = 0;
    let size = 0;
    const entries = Object.entries(fields) as [string, PestTypeInternal][];

    let hash = 0;
    for (const [k, v] of entries) {
        if (!v.z) dynamics++;
        if (v.n) nulls++;
        size += v.z;
        hash = (Math.imul(hash, 31) + (string_hash(k) ^ v.i)) | 0;
    }

    return {
        i: hash,
        y: dynamics && (dynamics - 1) * 4,
        u: (nulls + 7) >>> 3,
        f: entries.sort((a, b) => b[1].z - a[1].z),
        z: size * +!dynamics,
        n: 0,
        e: null,
        s: nofunc,
        d: nofunc,
        m: nofunc
    } satisfies PestTypeInternal as unknown as ReturnType<typeof struct<T>>;
}

type DeepArray<E, T extends number, Counter extends any[] = []> = Counter["length"] extends T? E : DeepArray<E[], T, [...Counter, 0]>;

// @ts-expect-error
export function array<E, D extends number = 1>(e: PestType<E>, depth: D = 1): PestType<number extends D ? unknown : DeepArray<E, D>> {
    // @ts-expect-error
    depth |= 0;
    if (!depth) return e as unknown as ReturnType<typeof array<E, D>>;
    const el = array(e, depth - 1) as unknown as PestTypeInternal;
    return {
        i: ((e as unknown as PestTypeInternal).i + depth) | 0,
        y: 0,
        u: 0,
        f: [],
        z: 0,
        n: 0,
        e: el,
        s: (writers, ptr, data) => serialize_array(el, writers, ptr, data),
        // the same as the above isn't done because i don't want ./deserialize.ts to be shipped unless explicitly imported
        d: nofunc,
        m: (ptr, dv) => materialize_array(ptr, dv, el)
    } satisfies PestTypeInternal as unknown as ReturnType<typeof array<E, D>>;
}

export function nullable<T>(t: PestType<T>): PestType<T | undefined> {
    return {
        ...(t as unknown as PestTypeInternal),
        i: ~(t as unknown as PestTypeInternal).i,
        n: 1
    } satisfies PestTypeInternal as unknown as ReturnType<typeof nullable<T>>;
}

export { enum_ as enum };
export function enum_<const T extends string[]>(...values: T): PestType<T[number]> {
    let hash = 0;
    for (const v of values) {
        hash = (Math.imul(hash, 31) ^ string_hash(v)) | 0;
    }

    return {
        i: hash,
        y: 0,
        u: 0,
        f: [],
        z: 1,
        n: 0,
        e: null,
        s: (writers, ptr, data) => writers.u[ptr] = values.indexOf(data as any),
        d: (ptr, dv) => values[dv.getUint8(ptr)],
        m: (ptr, dv) => values[dv.getUint8(ptr)],
    } satisfies PestTypeInternal as unknown as ReturnType<typeof enum_<T>>;
}
