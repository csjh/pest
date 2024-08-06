import { PestType, PestTypeInternal } from "./types.js";

export const nofunc = function (): any {};

export const i8 =      { i:  0, y: 0, u: 0, f: {}, z: 1, n: 0, e: null, s: nofunc, d: nofunc, m: nofunc } as unknown as PestType<number>;
export const i16 =     { i:  1, y: 0, u: 0, f: {}, z: 2, n: 0, e: null, s: nofunc, d: nofunc, m: nofunc } as unknown as PestType<number>;
export const i32 =     { i:  2, y: 0, u: 0, f: {}, z: 4, n: 0, e: null, s: nofunc, d: nofunc, m: nofunc } as unknown as PestType<number>;
export const i64 =     { i:  3, y: 0, u: 0, f: {}, z: 8, n: 0, e: null, s: nofunc, d: nofunc, m: nofunc } as unknown as PestType<bigint>;
export const u8 =      { i:  4, y: 0, u: 0, f: {}, z: 1, n: 0, e: null, s: nofunc, d: nofunc, m: nofunc } as unknown as PestType<number>;
export const u16 =     { i:  5, y: 0, u: 0, f: {}, z: 2, n: 0, e: null, s: nofunc, d: nofunc, m: nofunc } as unknown as PestType<number>;
export const u32 =     { i:  6, y: 0, u: 0, f: {}, z: 4, n: 0, e: null, s: nofunc, d: nofunc, m: nofunc } as unknown as PestType<number>;
export const u64 =     { i:  7, y: 0, u: 0, f: {}, z: 8, n: 0, e: null, s: nofunc, d: nofunc, m: nofunc } as unknown as PestType<bigint>;
export const f32 =     { i:  8, y: 0, u: 0, f: {}, z: 4, n: 0, e: null, s: nofunc, d: nofunc, m: nofunc } as unknown as PestType<number>;
export const f64 =     { i:  9, y: 0, u: 0, f: {}, z: 8, n: 0, e: null, s: nofunc, d: nofunc, m: nofunc } as unknown as PestType<number>;
export const boolean = { i: 10, y: 0, u: 0, f: {}, z: 1, n: 0, e: null, s: nofunc, d: nofunc, m: nofunc } as unknown as PestType<boolean>;
export const Date =    { i: 11, y: 0, u: 0, f: {}, z: 8, n: 0, e: null, s: nofunc, d: nofunc, m: nofunc } as unknown as PestType<Date>;
export const string =  { i: 12, y: 0, u: 0, f: {}, z: 0, n: 0, e: null, s: nofunc, d: nofunc, m: nofunc } as unknown as PestType<string>;
export const RegExp =  { i: 13, y: 0, u: 0, f: {}, z: 0, n: 0, e: null, s: nofunc, d: nofunc, m: nofunc } as unknown as PestType<RegExp>;

export function array<T>(e: PestType<T>, depth: number = 1): PestType<T[]> {
    return (depth
        ? {
              i: -1,
              y: depth >>> 0,
              u: 0,
              f: {},
              z: 0,
              n: 0,
              e: array(e, depth - 1),
              s: nofunc,
              d: nofunc,
              m: nofunc
          }
        : e) as unknown as PestType<T[]>;
}

export function nullable(t: PestTypeInternal): PestTypeInternal {
    return { ...t, n: 1 };
}
