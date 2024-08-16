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
    /** length of dynamic offset table */
    y: number;
    /** length of null offset table */
    u: number;
    /** fields partitioned by dynamic-ness */
    f: [string, PestTypeInternal][];
    /** sizeof */
    z: number;
    /** whether or not it can be null */
    n: 1 | 0;
    /** element type (for arrays) */
    e: PestTypeInternal | null;
    /** cached serializer */
    s: Serializer;
    /** cached deserializer */
    d: Deserializer;
    /** cached materializer */
    m: Materializer;
}

type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};

export type AcceptBroad<T> = T extends Date
    ? T
    : T extends null
    ? AcceptBroad<Exclude<T, null>> | null | undefined
    : T extends ArrayLike<number>
    ? ArrayLike<number>
    : T extends ArrayLike<bigint>
    ? ArrayLike<bigint>
    : T extends (infer U)[]
    ? AcceptBroad<U>[]
    : T extends Record<any, any>
    ? Prettify<
          {
              [K in keyof T as null extends T[K] ? K : never]?: AcceptBroad<
                  T[K]
              >;
          } & {
              [K in keyof T as null extends T[K] ? never : K]: AcceptBroad<
                  T[K]
              >;
          }
      >
    : T;

declare const type: unique symbol;
export interface PestType<T> {
    readonly [type]: T;
}
