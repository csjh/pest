/// <reference types="bun-types" />

import { describe, it, expect } from "bun:test";
import {
    i8,
    i16,
    i32,
    i64,
    u8,
    u16,
    u32,
    u64,
    f32,
    f64,
    boolean,
    date,
    string,
    regexp,
    serialize,
    view,
    deserialize
} from "../index.js";
import type { PestType } from "../types.js";

function test_primitive<T>(data: NoInfer<T>, schema: PestType<T>) {
    const serialized = serialize(data as any, schema);
    const materialized = view(serialized, schema);
    expect(materialized).toEqual(data);
    expect(deserialize(serialized, schema)).toEqual(data);
}

describe("primitives", () => {
    it("should serialize and view i8", () => {
        test_primitive(0, i8);
        test_primitive(1, i8);
        test_primitive(-1, i8);
        test_primitive(127, i8);
        test_primitive(-128, i8);
    });

    it("should serialize and view i16", () => {
        test_primitive(0, i16);
        test_primitive(1, i16);
        test_primitive(-1, i16);
        test_primitive(32767, i16);
        test_primitive(-32768, i16);
    });

    it("should serialize and view i32", () => {
        test_primitive(0, i32);
        test_primitive(1, i32);
        test_primitive(-1, i32);
        test_primitive(2147483647, i32);
        test_primitive(-2147483648, i32);
    });

    it("should serialize and view i64", () => {
        test_primitive(0n, i64);
        test_primitive(1n, i64);
        test_primitive(-1n, i64);
        test_primitive(9223372036854775807n, i64);
        test_primitive(-9223372036854775808n, i64);
    });

    it("should serialize and view u8", () => {
        test_primitive(0, u8);
        test_primitive(1, u8);
        test_primitive(255, u8);
    });

    it("should serialize and view u16", () => {
        test_primitive(0, u16);
        test_primitive(1, u16);
        test_primitive(65535, u16);
    });

    it("should serialize and view u32", () => {
        test_primitive(0, u32);
        test_primitive(1, u32);
        test_primitive(4294967295, u32);
    });

    it("should serialize and view u64", () => {
        test_primitive(0n, u64);
        test_primitive(1n, u64);
        test_primitive(18446744073709551615n, u64);
    });

    it("should serialize and view f32", () => {
        test_primitive(0, f32);
        test_primitive(1, f32);
        test_primitive(-1, f32);
        test_primitive(3.141590118408203, f32);
        test_primitive(-3.141590118408203, f32);
    });

    it("should serialize and view f64", () => {
        test_primitive(0, f64);
        test_primitive(1, f64);
        test_primitive(-1, f64);
        test_primitive(3.14159, f64);
        test_primitive(-3.14159, f64);
    });

    it("should serialize and view boolean", () => {
        test_primitive(true, boolean);
        test_primitive(false, boolean);
    });

    it("should serialize and view Date", () => {
        test_primitive(new Date(), date);
    });

    it("should serialize and view string", () => {
        test_primitive("", string);
        test_primitive("hello", string);
    });

    it("should serialize and view RegExp", () => {
        test_primitive(/./, regexp);
        test_primitive(/./g, regexp);
        test_primitive(/./i, regexp);
        test_primitive(/./m, regexp);
        test_primitive(/./gim, regexp);
        test_primitive(/./gim, regexp);
    });
});
