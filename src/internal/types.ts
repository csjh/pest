// return undefined instead of void to make sure there's no accidental returns
export type Serializer = (data: any) => undefined;
export type Deserializer = (ptr: number) => unknown;

export interface PestTypeInternal {
    /** id */
    i: number;
    /** number of dynamic fields or depth of array */
    y: number;
    /** element type if array */
    e?: PestTypeInternal;
    /** fields */
    f: Record<string, PestTypeInternal>;
    /** sizeof */
    z: number;
}

export type Unwrap<T> = T extends PestType<infer U>
    ? Unwrap<U>
    : T extends Date | ArrayBufferView
    ? T
    : T extends (infer U)[]
    ? Unwrap<U>[]
    : T extends Record<any, any>
    ? { [K in keyof T]: Unwrap<T[K]> }
    : T;

export type AcceptBroad<T> = T extends Date
    ? T
    : T extends ArrayLike<number>
    ? ArrayLike<number>
    : T extends ArrayLike<bigint>
    ? ArrayLike<bigint>
    : T extends (infer U)[]
    ? AcceptBroad<U>[]
    : T extends Record<any, any>
    ? { [K in keyof T]: AcceptBroad<T[K]> }
    : T;

declare const type: unique symbol;
export interface PestType<T> {
    readonly [type]: T;
}
