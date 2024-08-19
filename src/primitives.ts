import { materialize_array } from "./materialize.js";
import { reserve, serialize_array } from "./serialize.js";
import {
    BufferWriters,
    Deserializer,
    PestType,
    PestTypeInternal,
    Serializer
} from "./types.js";
import {
    internalize,
    internalize_array
} from "./shared.js";

function primitive(
    i: number,
    size: number,
    s: Serializer,
    d: Deserializer,
    w: PestTypeInternal["w"] = (data) => +(typeof data === "number")
): PestType<unknown> {
    const obj = { i, y: 0, u: 0, f: [], z: size, n: 0, e: null, w, s, d, m: d } satisfies PestTypeInternal;
    // @ts-expect-error i'm lying!
    return obj;
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

export const i8 =      /* @__PURE__ */ primitive( 0,  1, (w, ptr, data) => (w.d.setInt8     (ptr, data),        ptr + 1), (ptr, dv) =>          dv.getInt8     (ptr)                                               ) as PestType<number>;
export const i16 =     /* @__PURE__ */ primitive( 1,  2, (w, ptr, data) => (w.d.setInt16    (ptr, data, true),  ptr + 2), (ptr, dv) =>          dv.getInt16    (ptr, true )                                        ) as PestType<number>;
export const i32 =     /* @__PURE__ */ primitive( 2,  4, (w, ptr, data) => (w.d.setInt32    (ptr, data, true),  ptr + 4), (ptr, dv) =>          dv.getInt32    (ptr, true )                                        ) as PestType<number>;
export const i64 =     /* @__PURE__ */ primitive( 3,  8, (w, ptr, data) => (w.d.setBigInt64 (ptr, data, true),  ptr + 8), (ptr, dv) =>          dv.getBigInt64 (ptr, true ), (data) => +(typeof data === 'bigint') ) as PestType<bigint>;
export const u8 =      /* @__PURE__ */ primitive( 4,  1, (w, ptr, data) => (w.d.setUint8    (ptr, data),        ptr + 1), (ptr, dv) =>          dv.getUint8    (ptr)                                               ) as PestType<number>;
export const u16 =     /* @__PURE__ */ primitive( 5,  2, (w, ptr, data) => (w.d.setUint16   (ptr, data, true),  ptr + 2), (ptr, dv) =>          dv.getUint16   (ptr, true )                                        ) as PestType<number>;
export const u32 =     /* @__PURE__ */ primitive( 6,  4, (w, ptr, data) => (w.d.setUint32   (ptr, data, true),  ptr + 4), (ptr, dv) =>          dv.getUint32   (ptr, true )                                        ) as PestType<number>;
export const u64 =     /* @__PURE__ */ primitive( 7,  8, (w, ptr, data) => (w.d.setBigUint64(ptr, data, true),  ptr + 8), (ptr, dv) =>          dv.getBigUint64(ptr, true ), (data) => +(typeof data === 'bigint') ) as PestType<bigint>;
export const f32 =     /* @__PURE__ */ primitive( 8,  4, (w, ptr, data) => (w.d.setFloat32  (ptr, data, true),  ptr + 4), (ptr, dv) =>          dv.getFloat32  (ptr, true )                                        ) as PestType<number>;
export const f64 =     /* @__PURE__ */ primitive( 9,  8, (w, ptr, data) => (w.d.setFloat64  (ptr, data, true),  ptr + 8), (ptr, dv) =>          dv.getFloat64  (ptr, true )                                        ) as PestType<number>;
export const boolean = /* @__PURE__ */ primitive(10,  1, (w, ptr, data) => (w.d.setUint8    (ptr, data? 1 : 0), ptr + 1), (ptr, dv) =>          dv.getUint8    (ptr) !== 0 , (data) => +(typeof data === 'boolean')) as PestType<boolean>;
export const date =    /* @__PURE__ */ primitive(11,  8, (w, ptr, data) => (w.d.setFloat64  (ptr, +data, true), ptr + 8), (ptr, dv) => new Date(dv.getFloat64  (ptr, true)), (data) => +(data instanceof Date)     ) as PestType<Date>;
export const string =  /* @__PURE__ */ primitive(12, -1, encode_string, (ptr, dv) => decoder.decode(new Uint8Array(dv.buffer, ptr + 4, dv.getUint32(ptr, true))),            (data) => +(typeof data === 'string') ) as PestType<string>;
export const regexp =  /* @__PURE__ */ primitive(13, -1, (w, ptr, data): number => encode_string(w, ptr,`${data.flags}\0${data.source}`), (ptr, dv) => {
    const [flags, source] = (string as any).m(ptr, dv).split('\0', 2);
    return RegExp(source, flags);
}, (data) => +(data instanceof RegExp)) as PestType<RegExp>;

function string_hash(s: string) {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        hash = (Math.imul(hash, 31) + s.charCodeAt(i)) | 0;
    }
    return hash;
}

export function struct<T>(fields: {
    [K in keyof T]: PestType<T[K]>;
}): PestType<T> {
    let dynamics = 0;
    let nulls = 0;
    let size = 0;
    const entries = Object.entries(fields) as [string, PestTypeInternal][];

    let hash = 0;
    for (const [k, v] of entries) {
        if (v.z < 0) dynamics++;
        else size += v.z;
        if (v.n) nulls++;
        hash = (Math.imul(hash, 31) + (string_hash(k) ^ v.i)) | 0;
    }

    return {
        i: hash,
        y: dynamics && (dynamics - 1) * 4,
        u: (nulls + 7) >>> 3,
        f: entries.sort((a, b) => b[1].z - a[1].z),
        z: dynamics ? -1 : size,
        n: 0,
        e: null,
        w: (data) => {
            if (typeof data !== "object" || !data) return 0;
            // if all fields are nullable then any object is a match albeit a shitty one
            if (nulls === entries.length) return 0.01;
            let data_fields = 0,
                score = 0;
            for (const [k, v] of entries) {
                const w = v.w(data[k]);
                if (!w) return 0;
                // a field not in data can be valid if it's nullable
                // but that still won't be counted in the score
                // because a nullable field isn't really a strong indication
                // that the struct is a match
                if (k in data) score += w;
            }
            for (let _ in data) data_fields++;
            // if a struct has more fields than the data then it could be a better match for a different struct but still a match
            return data_fields ? score / data_fields : 1;
        },
        s: null,
        d: null,
        m: null
    } satisfies PestTypeInternal as unknown as ReturnType<typeof struct<T>>;
}

type DeepArray<
    E,
    T extends number,
    Counter extends any[] = []
> = Counter["length"] extends T ? E : DeepArray<E[], T, [...Counter, 0]>;

export function array<E, D extends number = 1>(
    e: PestType<E>,
    // @ts-expect-error
    depth: D = 1
): PestType<number extends D ? unknown : DeepArray<E, D>> {
    // @ts-expect-error
    depth |= 0;
    if (!depth) return e as unknown as ReturnType<typeof array<E, D>>;
    const el = array(e, depth - 1);
    /* @__PURE__ */ internalize(el);
    /* @__PURE__ */ internalize(e);
    return {
        i: (e.i + depth) | 0,
        y: 0,
        u: 0,
        f: [],
        z: -1,
        n: 0,
        e: el,
        w: (data) => (data.length ? el.w(data[0]) : 1),
        s: (writers, ptr, data) => serialize_array(el, writers, ptr, data),
        // the same as the above isn't done because i don't want ./deserialize.ts to be shipped unless explicitly imported
        d: null,
        m: (ptr, dv) => materialize_array(ptr, dv, el)
    } satisfies PestTypeInternal as unknown as ReturnType<typeof array<E, D>>;
}

export function nullable<T>(t: PestType<T>): PestType<T | null> {
    /* @__PURE__ */ internalize(t);
    return {
        ...t,
        i: ~t.i,
        n: 1,
        w: (data) => +(data == null) || t.w(data)
    } satisfies PestTypeInternal as unknown as ReturnType<typeof nullable<T>>;
}

export { enum_ as enum };
export function enum_<const T extends unknown[]>(
    ...values: T
): PestType<T[number]> {
    return union(...values.map(literal));
}

type UnionType<T extends PestType<unknown>[]> = T extends [PestType<infer U>]
    ? U
    : T extends [PestType<infer U>, ...infer R extends PestType<unknown>[]]
    ? U | UnionType<R>
    : never;

export function union<const T extends PestType<unknown>[]>(
    ...types: T
): PestType<UnionType<T>> {
    /* @__PURE__ */ internalize_array(types);

    let hash = 0;
    for (const t of types) {
        hash = (Math.imul(hash, 31) + t.i) | 0;
    }
    return {
        i: hash,
        y: 1,
        u: 0,
        f: types,
        // if types are a uniform size then the union is also that size
        // mostly just here so that enums are a single byte
        // but should just occasionally help in general i guess
        z:
            types[0].z === -1 ||
            !types.every((t: PestTypeInternal) => t.z === types[0].z)
                ? -1
                : 1 + types[0].z,
        n: 0,
        e: null,
        w: (data) => Math.max(...types.map((t: PestTypeInternal) => t.w(data))),
        s: null,
        d: null,
        m: null
    } satisfies PestTypeInternal as unknown as ReturnType<typeof union<T>>;
}

export function literal<const T>(value: T): PestType<T> {
    return {
        i: string_hash(
            JSON.stringify(value, (_, v) =>
                typeof v === "bigint" ? v.toString() : v
            )
        ),
        y: 0,
        u: 0,
        f: [],
        // occupies a whole byte because z = 0 is used for dynamic types >:(
        z: 0,
        n: 0,
        e: null,
        w: (data) =>
            +(
                data === value ||
                (typeof data === "object" && typeof value === "object")
            ),
        s: (_, ptr) => ptr,
        d: () => value,
        m: () => value
    } satisfies PestTypeInternal as unknown as ReturnType<typeof literal<T>>;
}
