import { internalize } from "./shared.js";
import type {
    AcceptBroad,
    BufferWriters,
    PestType,
    PestTypeInternal,
    Serializer,
} from "./types.js";

export function reserve(amount: number, writers: BufferWriters) {
    let size = writers.u.length;
    if (amount >= size) {
        while (amount >= size) size *= 2;
        // @ts-expect-error todo: this should probably use resizable arrays
        const buffer = writers.u.buffer.transfer(size);
        writers.d = new DataView(buffer);
        writers.u = new Uint8Array(buffer);
    }
}

export function serialize_array(
    ty: PestTypeInternal,
    writers: BufferWriters,
    ptr: number,
    data: any[]
) {
    const len = data.length;
    // reserve space for length, dynamic offset, possibly static data, and null table
    // 20 instead of 4 because max alignment skip is 16 bytes
    reserve(ptr + 20 + (1 + (ty.z || 4)) * len, writers);

    writers.d.setUint32(ptr, len, true);
    ptr += 4;

    // skip over dynamic offset table
    const start_of_offsets = ptr;
    if (ty.z < 0) {
        ptr += 4 * len;
    }

    // skip over null table otherwise align if TypedArray is available
    const start_of_nulls = ptr;
    if (ty.n) {
        ptr += (len + 7) >>> 3;
    } else if (0 <= ty.i && ty.i < 10) {
        ptr += -ptr & (ty.z - 1);
    }

    const start_of_data = ptr;
    const serializer = get_serializer(ty);
    for (let i = 0; i < len; i++) {
        if (ty.z < 0) {
            writers.d.setUint32(
                start_of_offsets + 4 * i,
                ptr - start_of_data,
                true
            );
        }
        const bit_index = start_of_nulls + (i >>> 3),
            bit_value = 1 << (i & 7);
        if (data[i] != null) {
            ptr = serializer(writers, ptr, data[i]);
            if (ty.n) writers.u[bit_index] &= ~bit_value;
        } else {
            // the if shouldn't be necessary here but helps not fuck up people doing wrong stuff
            if (ty.n) writers.u[bit_index] |= bit_value;
            // if (ty.n) isn't needed because there shouldn't be undefined/null in non-nullable stuff anyways
            if (ty.z > 0) ptr += ty.z;
        }
    }
    return ptr;
}

function get_serializer(ty: PestTypeInternal): Serializer {
    if (ty.s !== null) return ty.s;
    if (ty.y === 1) {
        const fields = ty.f as PestTypeInternal[];
        fields.forEach(get_serializer);
        return (ty.s = (writers, ptr, data) => {
            let high = 0,
                high_idx = 0,
                len = fields.length;
            for (let i = 0; i < len; i++) {
                const w = fields[i].w(data);
                if (w > high) {
                    high = w;
                    high_idx = i;
                }
            }
            writers.u[ptr] = high_idx;
            return fields[high_idx].s!(writers, ptr + 1, data);
        });
    }

    let prelude = "var _";
    let fn = `var f,s=p;p+=${ty.y + ty.u};`;

    let dynamics = 0;
    let nulls = 0;
    let pos = 0;
    let i = 0;
    for (const [name, type] of ty.f as [string, PestTypeInternal][]) {
        get_serializer(type); // ensure serializer is cached

        /*
        data = a.name
        if field is unsized:
            if this is the first dynamic field:
                first_dynamic = ptr;
            else:
                dv.setUint32(start_ptr + <dynamic table offset>, ptr - first_dynamic, true);
        if field is nullable and data == null:
            ptr += type.z;
            uint8[start_ptr + nulls >>> 3] |= 1 << (nulls & 7);
        else:
            type.s(writers, ptr, data)
        */

        // prettier-ignore
        fn += `${
            type.z < 0
                ? dynamics
                    ? `w.d.setUint32(s+${(dynamics - 1) * 4},p-f,!0);`
                    : `f=p;`
                : ""
        }${
            type.n
            ? `a[${JSON.stringify(name)}]==null?(${type.z > 0? `p+=${type.z},` : ''}w.u[s+${ty.y + (nulls >>> 3)}]|=${1 << (nulls & 7)}):` : ""
            }p=_${i}(w,p,a[${JSON.stringify(name)}]);`;

        // TODO: experiment more with inlining
        prelude += `,_${i}=t[${i++}][1].s`;

        if (type.z < 0) dynamics++;
        else pos += type.z;
        if (type.n) nulls++;
    }

    fn = `${prelude};return(w,p,a)=>{r(p+${
        pos + ty.y + ty.u
    },w);${fn}return p}`;

    return (ty.s = new Function("t", "r", fn)(ty.f, reserve));
}

// TODO: add serialize_into
export function serialize<T>(
    data: NoInfer<AcceptBroad<T>>,
    schema: PestType<T>
): Uint8Array {
    /* @__PURE__ */ internalize(schema);

    const buffer = new ArrayBuffer(1024);
    const writers = {
        d: new DataView(buffer),
        u: new Uint8Array(buffer),
    };

    writers.d.setInt32(0, schema.i, true);
    const ptr = get_serializer(schema)(writers, 4, data);
    return writers.u.subarray(0, ptr);
}
