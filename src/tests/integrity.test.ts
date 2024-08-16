/// <reference types="bun-types" />

import { describe, it, expect } from "bun:test";
import {
    array,
    boolean,
    deserialize,
    enum_,
    f32,
    materialize,
    nullable,
    string,
    struct,
    union
} from "../internal/index.js";
import {
    Coordinate,
    Locations,
    Endpoint,
    NullableCoordinate,
    LocationsMaybeNoWork,
    MapSketchyLocations,
    Map,
    mirror
} from "./shared.js";

describe("definitions", async () => {
    it("should stay intact with static structs", async () => {
        const coord = { x: 1, y: 2 };
        expect(coord).toEqual(mirror(coord, Coordinate, deserialize));
        expect(coord).toEqual(mirror(coord, Coordinate, materialize));

        const locations = {
            home: { x: 1, y: 2 },
            work: { x: 3, y: 4 }
        };
        expect(locations).toEqual(mirror(locations, Locations, deserialize));
        expect(locations).toEqual(mirror(locations, Locations, materialize));
    });

    it("should stay intact with dynamic structs", async () => {
        const map = {
            locations: [
                {
                    name: "Good Pizza",
                    importance: 9,
                    coord: { x: 1.234320044517517, y: 2.234149932861328 },
                    starred: true,
                    saved_at: new Date("2024-07-25T12:11:00.690Z")
                },
                {
                    name: "Bad Pizza",
                    importance: -1,
                    coord: { x: 3.2343199253082275, y: 4.234149932861328 },
                    starred: false,
                    saved_at: new Date("2024-07-25T11:11:00.690Z")
                }
            ],
            user: "csjh",
            default: {
                name: "Work",
                importance: 8,
                coord: {
                    x: 1.234320044517517,
                    y: 2.234149932861328
                },
                starred: false,
                saved_at: new Date("2021-09-01T00:00:00.000Z")
            },
            current: {
                name: "Home",
                importance: 10,
                coord: {
                    x: 3.2343199253082275,
                    y: 4.234149932861328
                },
                starred: true,
                saved_at: new Date("2009-11-11T00:00:00.000Z")
            }
        };

        expect(map).toEqual(mirror(map, Map, deserialize));
        expect(map).toEqual(mirror(map, Map, materialize));

        const endpoint = {
            method: "GET",
            route: "/endpoint",
            accessed_at: new Date()
        };

        expect(endpoint).toEqual(mirror(endpoint, Endpoint, deserialize));
        expect(endpoint).toEqual(mirror(endpoint, Endpoint, materialize));
    });

    it("should stay intact with static structs", async () => {
        const coord = { x: 1, y: null };
        expect(coord).toEqual(mirror(coord, NullableCoordinate, deserialize));
        expect(coord).toEqual(mirror(coord, NullableCoordinate, materialize));

        const locations = {
            home: { x: null, y: 23 },
            work: null
        };
        expect(locations).toEqual(
            mirror(locations, LocationsMaybeNoWork, deserialize)
        );
        expect(locations).toEqual(
            mirror(locations, LocationsMaybeNoWork, materialize)
        );
    });

    it("should stay intact with dynamic structs", async () => {
        const map = {
            locations: null,
            user: "csjh",
            default: {
                name: "Work",
                importance: 8,
                coord: {
                    x: 1.234320044517517,
                    y: 2.234149932861328
                },
                starred: false,
                saved_at: new Date("2021-09-01T00:00:00.000Z")
            },
            current: null
        };

        expect(map).toEqual(mirror(map, MapSketchyLocations, deserialize));
        expect(map).toEqual(mirror(map, MapSketchyLocations, materialize));

        const map2 = {
            locations: [
                null,
                {
                    name: "Bad Pizza",
                    importance: -1,
                    coord: { x: 3.2343199253082275, y: 4.234149932861328 },
                    starred: false,
                    saved_at: new Date("2024-07-25T11:11:00.690Z")
                }
            ],
            user: "csjh",
            default: {
                name: "Work",
                importance: 8,
                coord: {
                    x: 1.234320044517517,
                    y: 2.234149932861328
                },
                starred: false,
                saved_at: new Date("2021-09-01T00:00:00.000Z")
            },
            current: {
                name: "Home",
                importance: 10,
                coord: {
                    x: 3.2343199253082275,
                    y: 4.234149932861328
                },
                starred: true,
                saved_at: new Date("2009-11-11T00:00:00.000Z")
            }
        };

        expect(map2).toEqual(mirror(map2, MapSketchyLocations, deserialize));
        expect(map2).toEqual(mirror(map2, MapSketchyLocations, materialize));
    });
});

describe("enums", () => {
    it("should stay intact with enums", () => {
        const Endpoint = enum_("GET", "POST", "PUT");

        expect("GET").toEqual(mirror("GET", Endpoint, deserialize));
        expect("GET").toEqual(mirror("GET", Endpoint, materialize));

        expect("POST").toEqual(mirror("POST", Endpoint, deserialize));
        expect("POST").toEqual(mirror("POST", Endpoint, materialize));

        expect("PUT").toEqual(mirror("PUT", Endpoint, deserialize));
        expect("PUT").toEqual(mirror("PUT", Endpoint, materialize));
    });

    it("should work with enums in arrays", () => {
        const EndpointArray = array(enum_("GET", "POST", "PUT"));

        const arr = ["GET", "POST", "PUT"];
        expect(arr).toEqual(mirror(arr, EndpointArray, deserialize));
        expect(arr).toEqual(mirror(arr, EndpointArray, materialize));

        const arr2 = ["GET", "GET", "GET"];
        expect(arr2).toEqual(mirror(arr2, EndpointArray, deserialize));
        expect(arr2).toEqual(mirror(arr2, EndpointArray, materialize));
    });

    it("should work with enums in structs", () => {
        const EndpointStruct = struct({
            method: enum_("GET", "POST", "PUT"),
            route: string,
            backup: enum_("GET", "POST", "PUT"),
            backup2: enum_("GET", "POST", "PUT")
        });

        const endpoint = {
            method: "GET",
            route: "/endpoint",
            backup: "POST",
            backup2: "PUT"
        };

        expect(endpoint).toEqual(mirror(endpoint, EndpointStruct, deserialize));
        expect(endpoint).toEqual(mirror(endpoint, EndpointStruct, materialize));
    });
});

describe("unions", async () => {
    it("should stay intact with unions of primitives", () => {
        const PrimitiveUnion = union(string, f32, boolean);

        expect("GET").toEqual(mirror("GET", PrimitiveUnion, deserialize));
        expect("GET").toEqual(mirror("GET", PrimitiveUnion, materialize));

        expect(1).toEqual(mirror(1, PrimitiveUnion, deserialize));
        expect(1).toEqual(mirror(1, PrimitiveUnion, materialize));

        expect(true).toEqual(mirror(true, PrimitiveUnion, deserialize));
        expect(true).toEqual(mirror(true, PrimitiveUnion, materialize));
    });

    it("should stay intact with unions of structs", () => {
        const StructUnion = union(Coordinate, Locations);

        const coord = { x: 1, y: 2 };
        expect(coord).toEqual(mirror(coord, StructUnion, deserialize));
        expect(coord).toEqual(mirror(coord, StructUnion, materialize));

        const locations = {
            home: { x: 1, y: 2 },
            work: { x: 3, y: 4 }
        };
        expect(locations).toEqual(mirror(locations, StructUnion, deserialize));
        expect(locations).toEqual(mirror(locations, StructUnion, materialize));
    });

    it("should stay intact with unions of nullable structs", () => {
        const NullableStructUnion = union(
            NullableCoordinate,
            LocationsMaybeNoWork
        );

        const coord = { x: 1, y: null };
        expect(coord).toEqual(mirror(coord, NullableStructUnion, deserialize));
        expect(coord).toEqual(mirror(coord, NullableStructUnion, materialize));

        const locations = {
            home: { x: null, y: 23 },
            work: null
        };
        expect(locations).toEqual(
            mirror(locations, NullableStructUnion, deserialize)
        );
        expect(locations).toEqual(
            mirror(locations, NullableStructUnion, materialize)
        );
    });

    it("should stay intact with unions of structs and nullable structs", () => {
        const MixedStructUnion = union(
            Coordinate,
            NullableCoordinate,
            LocationsMaybeNoWork
        );

        const coord = { x: 1, y: 2 };
        expect(coord).toEqual(mirror(coord, MixedStructUnion, deserialize));
        expect(coord).toEqual(mirror(coord, MixedStructUnion, materialize));

        const coord2 = { x: 1, y: null };
        expect(coord2).toEqual(mirror(coord2, MixedStructUnion, deserialize));
        expect(coord2).toEqual(mirror(coord2, MixedStructUnion, materialize));

        const locations = {
            home: { x: null, y: 23 },
            work: null
        };
        expect(locations).toEqual(
            mirror(locations, MixedStructUnion, deserialize)
        );
        expect(locations).toEqual(
            mirror(locations, MixedStructUnion, materialize)
        );
    });

    it("should stay intact with arrays", () => {
        const ArrayUnion = union(array(f32), array(string), array(boolean));

        const arr = new Float32Array([1, 2, 3, 4, 5]);
        expect(arr).toEqual(mirror(arr, ArrayUnion, deserialize));
        expect(arr).toEqual(mirror(arr, ArrayUnion, materialize));

        const arr2 = ["GET", "POST", "PUT"];
        expect(arr2).toEqual(mirror(arr2, ArrayUnion, deserialize));
        expect(arr2).toEqual(mirror(arr2, ArrayUnion, materialize));

        const arr3 = [true, false, true];
        expect(arr3).toEqual(mirror(arr3, ArrayUnion, deserialize));
        expect(arr3).toEqual(mirror(arr3, ArrayUnion, materialize));
    });

    it("should stay intact with arrays of structs", () => {
        const StructArrayUnion = union(array(Coordinate), array(Locations));

        const arr = [
            { x: 1, y: 2 },
            { x: 3, y: 4 },
            { x: 5, y: 6 }
        ];
        expect(arr).toEqual(mirror(arr, StructArrayUnion, deserialize));
        expect(arr).toEqual(mirror(arr, StructArrayUnion, materialize));

        const arr2 = [
            { home: { x: 1, y: 2 }, work: { x: 3, y: 4 } },
            { home: { x: 5, y: 6 }, work: { x: 7, y: 8 } }
        ];
        expect(arr2).toEqual(mirror(arr2, StructArrayUnion, deserialize));
        expect(arr2).toEqual(mirror(arr2, StructArrayUnion, materialize));
    });

    it("should stay intact with enums", () => {
        const EnumUnion = union(enum_("GET", "POST", "PUT"), f32, boolean);

        expect("GET").toEqual(mirror("GET", EnumUnion, deserialize));
        expect("GET").toEqual(mirror("GET", EnumUnion, materialize));

        expect(1).toEqual(mirror(1, EnumUnion, deserialize));
        expect(1).toEqual(mirror(1, EnumUnion, materialize));

        expect(true).toEqual(mirror(true, EnumUnion, deserialize));
        expect(true).toEqual(mirror(true, EnumUnion, materialize));
    });

    it("should resolve to the most specific type", () => {
        const Coordinate3D = struct({
            x: f32,
            y: f32,
            z: f32
        });

        const Union = union(Coordinate, Coordinate3D);

        const coord = { x: 1, y: 2 };
        expect(coord).toEqual(mirror(coord, Union, deserialize));
        expect(coord).toEqual(mirror(coord, Union, materialize));

        const coord3d = { x: 1, y: 2, z: 3 };
        expect(coord3d).toEqual(mirror(coord3d, Union, deserialize));
        expect(coord3d).toEqual(mirror(coord3d, Union, materialize));

        const NullableCoordinate3D = struct({
            x: f32,
            y: f32,
            z: nullable(f32)
        });

        const Union2 = union(Coordinate, NullableCoordinate3D);

        const coord2 = { x: 1, y: 2 };
        expect(coord2).toEqual(mirror(coord2, Union2, deserialize));
        expect(coord2).toEqual(mirror(coord2, Union2, materialize));

        const coord3d2 = { x: 1, y: 2, z: null };
        expect(coord3d2).toEqual(mirror(coord3d2, Union2, deserialize));
        expect(coord3d2).toEqual(mirror(coord3d2, Union2, materialize));
    });
});
