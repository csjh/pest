import { PestType } from "./types";

export const i8 = { i: 0, z: 1 } as PestType;
export const i16 = { i: 1, z: 2 } as PestType;
export const i32 = { i: 2, z: 4 } as PestType;
export const i64 = { i: 3, z: 8 } as PestType;
export const u8 = { i: 4, z: 1 } as PestType;
export const u16 = { i: 5, z: 2 } as PestType;
export const u32 = { i: 6, z: 4 } as PestType;
export const u64 = { i: 7, z: 8 } as PestType;
export const f32 = { i: 8, z: 4 } as PestType;
export const f64 = { i: 9, z: 8 } as PestType;
export const bool = { i: 10, z: 1 } as PestType;
export const date = { i: 11, z: 8 } as PestType;
export const string = { i: 12, z: 0 } as PestType;

export function array(ty: PestType, depth: number = 1): PestType {
    return {
        i: Infinity,
        y: depth,
        e: ty
    } as PestType;
}
