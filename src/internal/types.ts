// return undefined instead of void to make sure there's no accidental returns
export type Serializer = (data: any) => undefined;
export type Deserializer = (ptr: number) => unknown;

export interface PestType {
    // id
    i: number;
    // number of dynamic fields or depth of array
    y: number;
    // element type if array
    e?: PestType;
    // serializer
    s?: Serializer;
    // deserializer
    d?: Deserializer;
    // fields
    f: Record<string, PestType>;
    // sizeof
    z: number;
}
