export type Serializer = (dv: DataView, ptr: number, data: any, uint8: Uint8Array) => number;
export type Deserializer = (ptr: number, dv: DataView) => unknown;

export interface PestTypeInternal {
    /** id */
    i: number;
    /** length of dynamic offset table or depth of array */
    y: number;
    /** length of null offset table */
    u: number;
    /** fields partitioned by dynamic-ness; if array, [(the element type, possibly a nested array), (the element type, unnested)] */
    f: Record<string, PestTypeInternal>;
    /** sizeof */
    z: number;
    /** whether or not it can be null */
    n?: 1;
    /** cached deserializer */
    d?: Deserializer;
    /** cached materializer */
    m?: (
        ptr: number,
        dv: DataView,
        fields: Record<string, PestTypeInternal>,
        get_materializer: (
            ptr: number,
            dv: DataView,
            ty: PestTypeInternal
        ) => any
    ) => any;
}

type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};

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
