const encoder = new TextEncoder();

let next_id = 0;
// prettier-ignore
const enumeration: Map<string, number> = new Map([
    "null",
    "i8",
    "i16",
    "i32",
    "i64",
    "u8",
    "u16",
    "u32",
    "u64",
    "f32",
    "f64",
    "bool",
    "date",
    "string"
].map((x) => [x, next_id++] as const));

const is_dynamic: Set<number> = new Set();
is_dynamic.add(enumeration.get("string")!);

function type_is_dynamic(type: string): boolean {
    return type.endsWith("[]") || is_dynamic.has(enumeration.get(type)!);
}

type Serializer = (data: any, buffer: Uint8Array) => number;

type DataViewSetterTypes = Extract<
    keyof DataView,
    `set${string}`
> extends `set${infer T}`
    ? T
    : never;

function sized(size: number, ty: DataViewSetterTypes): Serializer {
    return (data, buffer) => {
        new DataView(buffer.buffer, buffer.byteOffset)[
            `set${ty}`
            // @ts-expect-error wah wah
        ](0, data, true);
        return size;
    };
}

// null is going to need special handling
const nil: Serializer = (_, buffer) => ((buffer[0] = 0), 1);
const date: Serializer = sized(8, "Float64");
// todo: string cache
const string: Serializer = (data, buffer) => {
    // todo: switch to var30
    new DataView(buffer.buffer, buffer.byteOffset).setUint32(
        0,
        data.length,
        true
    );
    return 4 + encoder.encodeInto(data, buffer.subarray(4)).written;
};

// prettier-ignore
const definitions: Serializer[] = [
    nil, // 0: null
    sized(1, "Int8"), sized(2, "Int16"), sized(4, "Int32"), sized(8, "BigInt64"), sized(1, "Uint8"), sized(2, "Uint16"), sized(4, "Uint32"), sized(8, "BigUint64"), // 1-8: i8, i16, i32, i64, u8, u16, u32, u64
    sized(4, "Float32"), sized(8, "Float64"), // 9-10: f32, f64
    sized(1, "Uint8"), // 11: bool
    date, // 12: date
    string, // 13: string
];

function array_serializer(type: string): Serializer {
    const serializer = get_serializer(type);
    if (type_is_dynamic(type)) {
        return (data, buffer) => {
            const dv = new DataView(buffer.buffer, buffer.byteOffset);
            let ptr = 0;
            dv.setUint32(0, data.length, true);
            ptr += 4; // length
            ptr += 4 * (data.length + 1); // offset table
            for (let i = 0; i < data.length; i++) {
                ptr += serializer(data[i], buffer.subarray(ptr));
                dv.setUint32(
                    4 + 4 * (i + 1),
                    ptr - (4 + 4 * (data.length + 1)),
                    true
                );
            }
            return ptr;
        };
    } else {
        return (data, buffer) => {
            const dv = new DataView(buffer.buffer, buffer.byteOffset);
            let ptr = 0;
            dv.setUint32(0, data.length, true);
            ptr += 4; // length
            for (let i = 0; i < data.length; i++) {
                ptr += serializer(data[i], buffer.subarray(ptr));
            }
            return ptr;
        };
    }
}

function get_serializer(type: string): Serializer {
    const id = enumeration.get(type)!;
    return type.endsWith("[]")
        ? array_serializer(type.slice(0, -2))
        : definitions[id];
}

// prettier-ignore
const structs = [
    ["Coordinate", [["x", "u8"], ["y", "u8"]]],
    ["Player", [["name", "string"], ["pos", "Coordinate"]]],
    ["Game", [["players", "Player[]"]]]
] as const;
export function serialize(data: unknown, schema: string): Uint8Array {
    let uint8 = new Uint8Array(1000);
    let ptr = 0;

    function emit(value: number, size: number = 1) {
        while (ptr + size >= uint8.length) {
            const old = uint8;
            uint8 = new Uint8Array(old.length * 2);
            uint8.set(old);
        }
        for (let i = 0; i < size; i++) {
            uint8[ptr++] = (value >> (i * 8)) & 0xff;
        }
    }

    function encode(value: number) {
        const bytes = ((Math.clz32(value) - 2) / 8) >>> 0;
        emit(((value << 2) | bytes) >>> 0, 4 - bytes);
    }

    function encode_s(value: number) {
        const sign = value >>> 31;
        value &= 0x7fffffff;

        const bytes = ((Math.clz32(value) - 3) >>> 2) & 0b110;
        emit((value << 3) | bytes | sign, 4 - (bytes >>> 1));
    }

    function encode_type(type: string) {
        let depth = 0;
        while (type.endsWith("[]")) {
            depth++;
            type = type.slice(0, -2);
        }
        const id = enumeration.get(type)!;
        if (depth) {
            encode_s(id | (1 << 31));
            encode(depth);
        } else {
            encode_s(id);
        }
    }

    for (const [name, fields] of structs) {
        if (!enumeration.has(name)) enumeration.set(name, next_id++);
        const id = enumeration.get(name)!;
        let total_dynamics = 0;
        for (const [, type] of fields) {
            total_dynamics += +type_is_dynamic(type);
        }

        if (!definitions[id]) {
            if (total_dynamics) {
                is_dynamic.add(id);
                definitions[id] = (data, buffer) => {
                    const dv = new DataView(buffer.buffer, buffer.byteOffset);
                    let ptr = (total_dynamics + 1) * 4;
                    let dynamics = 0;
                    for (const [name, type] of fields) {
                        ptr += get_serializer(type)(
                            data[name],
                            buffer.subarray(ptr)
                        );
                        if (type_is_dynamic(type)) {
                            dv.setUint32(
                                4 + dynamics * 4,
                                ptr - (total_dynamics + 1) * 4,
                                true
                            );
                            dynamics++;
                        }
                    }
                    return ptr;
                };
            } else {
                definitions[id] = (data, buffer) => {
                    let ptr = 0;
                    for (const [name, type] of fields) {
                        ptr += get_serializer(type)(
                            data[name],
                            buffer.subarray(ptr)
                        );
                    }
                    return ptr;
                };
            }
        }

        encode(id);
        encode(total_dynamics);
        for (const [name, type] of fields) {
            ptr += encoder.encodeInto(name, uint8.subarray(ptr)).written;
            emit(0);
            encode_type(type);
        }
        emit(0);
    }
    emit(0);

    encode_type(schema);
    while (ptr % 16 !== 0) emit(0);
    ptr += get_serializer(schema)(data, uint8.subarray(ptr));
    return uint8.subarray(0, ptr);
}
