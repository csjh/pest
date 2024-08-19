export interface BufferWriters {
    d: DataView;
    u: Uint8Array;
}

export type Serializer = (
    writers: BufferWriters,
    ptr: number,
    data: any
) => number;
export type Deserializer = (ptr: number, dv: DataView) => unknown;
export type Materializer = (ptr: number, dv: DataView) => unknown;

export interface PestTypeInternal {
    /** id */
    i: number;
    /** length of dynamic offset table - being set to 1 can be used to determine that a type is a union */
    y: number;
    /** length of null offset table */
    u: number;
    /** fields partitioned by dynamic-ness, or union members */
    f: [string, PestTypeInternal][] | PestTypeInternal[];
    /** sizeof */
    z: number;
    /** whether or not it can be null */
    n: 1 | 0;
    /** element type (for arrays) */
    e: PestTypeInternal | null;
    /** how much data fits this type */
    w: (data: any) => number;
    /** cached serializer */
    s: Serializer | null;
    /** cached deserializer */
    d: Deserializer | null;
    /** cached materializer */
    m: Materializer | null;
}

type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};

export type AcceptBroad<T> =
    | T
    | (T extends Date
          ? never
          : T extends null
          ? AcceptBroad<NonNullable<T>> | null | undefined
          : T extends ArrayLike<infer U>
          ? ArrayLike<AcceptBroad<U>>
          : T extends Record<any, any>
          ? Prettify<
                {
                    [K in keyof T as null extends T[K] ? K : never]?:
                        | AcceptBroad<T[K]>
                        | null
                        | undefined;
                } & {
                    [K in keyof T as null extends T[K]
                        ? never
                        : K]: AcceptBroad<T[K]>;
                }
            >
          : never);

declare const type: unique symbol;
export interface PestType<T> {
    readonly [type]: T;
}
