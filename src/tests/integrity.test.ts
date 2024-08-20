/// <reference types="bun-types" />

import { describe, it, expect } from "bun:test";
import {
    array,
    boolean,
    view,
    enum_,
    f32,
    deserialize,
    nullable,
    string,
    struct,
    union
} from "../index.js";
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
        expect(coord).toEqual(mirror(coord, Coordinate, view));
        expect(coord).toEqual(mirror(coord, Coordinate, deserialize));

        const locations = {
            home: { x: 1, y: 2 },
            work: { x: 3, y: 4 }
        };
        expect(locations).toEqual(mirror(locations, Locations, view));
        expect(locations).toEqual(mirror(locations, Locations, deserialize));
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

        expect(map).toEqual(mirror(map, Map, view));
        expect(map).toEqual(mirror(map, Map, deserialize));

        const endpoint = {
            method: "GET",
            route: "/endpoint",
            accessed_at: new Date()
        };

        expect(endpoint).toEqual(mirror(endpoint, Endpoint, view));
        expect(endpoint).toEqual(mirror(endpoint, Endpoint, deserialize));
    });

    it("should stay intact with static structs", async () => {
        const coord = { x: 1, y: null };
        expect(coord).toEqual(mirror(coord, NullableCoordinate, view));
        expect(coord).toEqual(mirror(coord, NullableCoordinate, deserialize));

        const locations = {
            home: { x: null, y: 23 },
            work: null
        };
        expect(locations).toEqual(
            mirror(locations, LocationsMaybeNoWork, view)
        );
        expect(locations).toEqual(
            mirror(locations, LocationsMaybeNoWork, deserialize)
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

        expect(map).toEqual(mirror(map, MapSketchyLocations, view));
        expect(map).toEqual(mirror(map, MapSketchyLocations, deserialize));

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

        expect(map2).toEqual(mirror(map2, MapSketchyLocations, view));
        expect(map2).toEqual(mirror(map2, MapSketchyLocations, deserialize));
    });
});

describe("enums", () => {
    it("should stay intact with enums", () => {
        const Endpoint = enum_("GET", "POST", "PUT");

        expect("GET").toEqual(mirror("GET", Endpoint, view));
        expect("GET").toEqual(mirror("GET", Endpoint, deserialize));

        expect("POST").toEqual(mirror("POST", Endpoint, view));
        expect("POST").toEqual(mirror("POST", Endpoint, deserialize));

        expect("PUT").toEqual(mirror("PUT", Endpoint, view));
        expect("PUT").toEqual(mirror("PUT", Endpoint, deserialize));
    });

    it("should work with enums in arrays", () => {
        const EndpointArray = array(enum_("GET", "POST", "PUT"));

        const arr = ["GET", "POST", "PUT"];
        expect(arr).toEqual(mirror(arr, EndpointArray, view));
        expect(arr).toEqual(mirror(arr, EndpointArray, deserialize));

        const arr2 = ["GET", "GET", "GET"];
        expect(arr2).toEqual(mirror(arr2, EndpointArray, view));
        expect(arr2).toEqual(mirror(arr2, EndpointArray, deserialize));
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

        expect(endpoint).toEqual(mirror(endpoint, EndpointStruct, view));
        expect(endpoint).toEqual(mirror(endpoint, EndpointStruct, deserialize));
    });
});

describe("unions", async () => {
    it("should stay intact with unions of primitives", () => {
        const PrimitiveUnion = union(string, f32, boolean);

        expect("GET").toEqual(mirror("GET", PrimitiveUnion, view));
        expect("GET").toEqual(mirror("GET", PrimitiveUnion, deserialize));

        expect(1).toEqual(mirror(1, PrimitiveUnion, view));
        expect(1).toEqual(mirror(1, PrimitiveUnion, deserialize));

        expect(true).toEqual(mirror(true, PrimitiveUnion, view));
        expect(true).toEqual(mirror(true, PrimitiveUnion, deserialize));
    });

    it("should stay intact with unions of structs", () => {
        const StructUnion = union(Coordinate, Locations);

        const coord = { x: 1, y: 2 };
        expect(coord).toEqual(mirror(coord, StructUnion, view));
        expect(coord).toEqual(mirror(coord, StructUnion, deserialize));

        const locations = {
            home: { x: 1, y: 2 },
            work: { x: 3, y: 4 }
        };
        expect(locations).toEqual(mirror(locations, StructUnion, view));
        expect(locations).toEqual(mirror(locations, StructUnion, deserialize));
    });

    it("should stay intact with unions of nullable structs", () => {
        const NullableStructUnion = union(
            NullableCoordinate,
            LocationsMaybeNoWork
        );

        const coord = { x: 1, y: null };
        expect(coord).toEqual(mirror(coord, NullableStructUnion, view));
        expect(coord).toEqual(mirror(coord, NullableStructUnion, deserialize));

        const locations = {
            home: { x: null, y: 23 },
            work: null
        };
        expect(locations).toEqual(mirror(locations, NullableStructUnion, view));
        expect(locations).toEqual(
            mirror(locations, NullableStructUnion, deserialize)
        );
    });

    it("should stay intact with unions of structs and nullable structs", () => {
        const MixedStructUnion = union(
            Coordinate,
            NullableCoordinate,
            LocationsMaybeNoWork
        );

        const coord = { x: 1, y: 2 };
        expect(coord).toEqual(mirror(coord, MixedStructUnion, view));
        expect(coord).toEqual(mirror(coord, MixedStructUnion, deserialize));

        const coord2 = { x: 1, y: null };
        expect(coord2).toEqual(mirror(coord2, MixedStructUnion, view));
        expect(coord2).toEqual(mirror(coord2, MixedStructUnion, deserialize));

        const locations = {
            home: { x: null, y: 23 },
            work: null
        };
        expect(locations).toEqual(mirror(locations, MixedStructUnion, view));
        expect(locations).toEqual(
            mirror(locations, MixedStructUnion, deserialize)
        );
    });

    it("should stay intact with arrays", () => {
        const ArrayUnion = union(array(f32), array(string), array(boolean));

        const arr = new Float32Array([1, 2, 3, 4, 5]);
        expect(arr).toEqual(mirror(arr, ArrayUnion, view));
        expect(arr).toEqual(mirror(arr, ArrayUnion, deserialize));

        const arr2 = ["GET", "POST", "PUT"];
        expect(arr2).toEqual(mirror(arr2, ArrayUnion, view));
        expect(arr2).toEqual(mirror(arr2, ArrayUnion, deserialize));

        const arr3 = [true, false, true];
        expect(arr3).toEqual(mirror(arr3, ArrayUnion, view));
        expect(arr3).toEqual(mirror(arr3, ArrayUnion, deserialize));
    });

    it("should stay intact with arrays of structs", () => {
        const StructArrayUnion = union(array(Coordinate), array(Locations));

        const arr = [
            { x: 1, y: 2 },
            { x: 3, y: 4 },
            { x: 5, y: 6 }
        ];
        expect(arr).toEqual(mirror(arr, StructArrayUnion, view));
        expect(arr).toEqual(mirror(arr, StructArrayUnion, deserialize));

        const arr2 = [
            { home: { x: 1, y: 2 }, work: { x: 3, y: 4 } },
            { home: { x: 5, y: 6 }, work: { x: 7, y: 8 } }
        ];
        expect(arr2).toEqual(mirror(arr2, StructArrayUnion, view));
        expect(arr2).toEqual(mirror(arr2, StructArrayUnion, deserialize));
    });

    it("should stay intact with enums", () => {
        const EnumUnion = union(enum_("GET", "POST", "PUT"), f32, boolean);

        expect("GET").toEqual(mirror("GET", EnumUnion, view));
        expect("GET").toEqual(mirror("GET", EnumUnion, deserialize));

        expect(1).toEqual(mirror(1, EnumUnion, view));
        expect(1).toEqual(mirror(1, EnumUnion, deserialize));

        expect(true).toEqual(mirror(true, EnumUnion, view));
        expect(true).toEqual(mirror(true, EnumUnion, deserialize));
    });

    it("should resolve to the most specific type", () => {
        const Coordinate3D = struct({
            x: f32,
            y: f32,
            z: f32
        });

        const Union = union(Coordinate, Coordinate3D);

        const coord = { x: 1, y: 2 };
        expect(coord).toEqual(mirror(coord, Union, view));
        expect(coord).toEqual(mirror(coord, Union, deserialize));

        const coord3d = { x: 1, y: 2, z: 3 };
        expect(coord3d).toEqual(mirror(coord3d, Union, view));
        expect(coord3d).toEqual(mirror(coord3d, Union, deserialize));

        const NullableCoordinate3D = struct({
            x: f32,
            y: f32,
            z: nullable(f32)
        });

        const Union2 = union(Coordinate, NullableCoordinate3D);

        const coord2 = { x: 1, y: 2 };
        expect(coord2).toEqual(mirror(coord2, Union2, view));
        expect(coord2).toEqual(mirror(coord2, Union2, deserialize));

        const coord3d2 = { x: 1, y: 2, z: null };
        expect(coord3d2).toEqual(mirror(coord3d2, Union2, view));
        expect(coord3d2).toEqual(mirror(coord3d2, Union2, deserialize));
    });
});
