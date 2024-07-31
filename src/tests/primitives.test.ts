/// <reference types="bun-types" />

import { describe, it, expect } from "bun:test";
import { materialize } from "../index.js";
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
    Date,
    string,
    RegExp,
    serialize,
    deserialize
} from "../internal/index.js";

function test_primitive(data, schema) {
    const serialized = serialize(data, schema);
    const materialized = deserialize(serialized, schema);
    expect(materialized).toEqual(data);
    expect(materialize(materialized)).toEqual(data);
}

describe("primitives", () => {
    it("should serialize and deserialize i8", () => {
        test_primitive(0, i8);
        test_primitive(1, i8);
        test_primitive(-1, i8);
        test_primitive(127, i8);
        test_primitive(-128, i8);
    });

    it("should serialize and deserialize i16", () => {
        test_primitive(0, i16);
        test_primitive(1, i16);
        test_primitive(-1, i16);
        test_primitive(32767, i16);
        test_primitive(-32768, i16);
    });

    it("should serialize and deserialize i32", () => {
        test_primitive(0, i32);
        test_primitive(1, i32);
        test_primitive(-1, i32);
        test_primitive(2147483647, i32);
        test_primitive(-2147483648, i32);
    });

    it("should serialize and deserialize i64", () => {
        test_primitive(0n, i64);
        test_primitive(1n, i64);
        test_primitive(-1n, i64);
        test_primitive(9223372036854775807n, i64);
        test_primitive(-9223372036854775808n, i64);
    });

    it("should serialize and deserialize u8", () => {
        test_primitive(0, u8);
        test_primitive(1, u8);
        test_primitive(255, u8);
    });

    it("should serialize and deserialize u16", () => {
        test_primitive(0, u16);
        test_primitive(1, u16);
        test_primitive(65535, u16);
    });

    it("should serialize and deserialize u32", () => {
        test_primitive(0, u32);
        test_primitive(1, u32);
        test_primitive(4294967295, u32);
    });

    it("should serialize and deserialize u64", () => {
        test_primitive(0n, u64);
        test_primitive(1n, u64);
        test_primitive(18446744073709551615n, u64);
    });

    it("should serialize and deserialize f32", () => {
        test_primitive(0, f32);
        test_primitive(1, f32);
        test_primitive(-1, f32);
        test_primitive(3.141590118408203, f32);
        test_primitive(-3.141590118408203, f32);
    });

    it("should serialize and deserialize f64", () => {
        test_primitive(0, f64);
        test_primitive(1, f64);
        test_primitive(-1, f64);
        test_primitive(3.14159, f64);
        test_primitive(-3.14159, f64);
    });

    it("should serialize and deserialize boolean", () => {
        test_primitive(true, boolean);
        test_primitive(false, boolean);
    });

    it("should serialize and deserialize Date", () => {
        const date = new globalThis.Date();
        test_primitive(date, Date);
    });

    it("should serialize and deserialize string", () => {
        test_primitive("", string);
        test_primitive("hello", string);
    });

    it("should serialize and deserialize RegExp", () => {
        test_primitive(/./, RegExp);
        test_primitive(/./g, RegExp);
        test_primitive(/./i, RegExp);
        test_primitive(/./m, RegExp);
        test_primitive(/./gim, RegExp);
        test_primitive(/./gim, RegExp);
    });
});
