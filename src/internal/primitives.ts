import { PestType, PestTypeInternal } from "./types.js";

export const i8 = { i: 0, z: 1 } as unknown as PestType<number>;
export const i16 = { i: 1, z: 2 } as unknown as PestType<number>;
export const i32 = { i: 2, z: 4 } as unknown as PestType<number>;
export const i64 = { i: 3, z: 8 } as unknown as PestType<bigint>;
export const u8 = { i: 4, z: 1 } as unknown as PestType<number>;
export const u16 = { i: 5, z: 2 } as unknown as PestType<number>;
export const u32 = { i: 6, z: 4 } as unknown as PestType<number>;
export const u64 = { i: 7, z: 8 } as unknown as PestType<bigint>;
export const f32 = { i: 8, z: 4 } as unknown as PestType<number>;
export const f64 = { i: 9, z: 8 } as unknown as PestType<number>;
export const boolean = { i: 10, z: 1 } as unknown as PestType<boolean>;
export const Date = { i: 11, z: 8 } as unknown as PestType<Date>;
export const string = { i: 12, z: 0 } as unknown as PestType<string>;
export const RegExp = { i: 13, z: 0 } as unknown as PestType<RegExp>;

export function array<T>(e: PestType<T>, depth: number = 1): PestType<T[]> {
    return (depth
        ? {
              i: -1,
              y: depth,
              u: 0,
              f: { e: array(e, depth - 1), m: e },
              z: 0
          }
        : e) as unknown as PestType<T[]>;
}

export function nullable(t: PestTypeInternal): PestTypeInternal {
    return { ...t, n: 1 };
}
