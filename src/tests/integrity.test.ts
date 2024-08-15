/// <reference types="bun-types" />

import { describe, it, expect } from "bun:test";
import { deserialize, materialize } from "../internal/index.js";
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
