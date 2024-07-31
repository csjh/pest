import { PestType, PestTypeInternal } from "./types.js";

export const i8 = { i: 0, z: 1 } as PestTypeInternal;
export const i16 = { i: 1, z: 2 } as PestTypeInternal;
export const i32 = { i: 2, z: 4 } as PestTypeInternal;
export const i64 = { i: 3, z: 8 } as PestTypeInternal;
export const u8 = { i: 4, z: 1 } as PestTypeInternal;
export const u16 = { i: 5, z: 2 } as PestTypeInternal;
export const u32 = { i: 6, z: 4 } as PestTypeInternal;
export const u64 = { i: 7, z: 8 } as PestTypeInternal;
export const f32 = { i: 8, z: 4 } as PestTypeInternal;
export const f64 = { i: 9, z: 8 } as PestTypeInternal;
export const boolean = { i: 10, z: 1 } as PestTypeInternal;
export const Date = { i: 11, z: 8 } as PestTypeInternal;
export const string = { i: 12, z: 0 } as PestTypeInternal;
export const RegExp = { i: 13, z: 0 } as PestTypeInternal;

export function array<T>(e: PestType<T>, depth: number = 1): PestType<T[]> {
    return (depth
        ? {
              i: NaN,
              y: depth,
              f: { e: array(e, depth - 1), m: e },
              z: 0
          }
        : e) as unknown as PestType<T[]>;
}
