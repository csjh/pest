import { PestTypeInternal } from "./types.js";

export const TypedArrays = [
    Int8Array,
    Int16Array,
    Int32Array,
    BigInt64Array,
    Uint8Array,
    Uint16Array,
    Uint32Array,
    BigUint64Array,
    Float32Array,
    Float64Array
];

// these just help with changing into the internal type in ./types.ts
export function internalize(t: unknown): asserts t is PestTypeInternal {}
export function internalize_array(
    t: unknown
): asserts t is PestTypeInternal[] {}
