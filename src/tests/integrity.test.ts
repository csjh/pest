/// <reference types="bun-types" />

import { describe, it, expect } from "bun:test";
import { getSingleModule } from "./utils.js";
import { PestType } from "../internal/types.js";

function leftEqual(left: unknown, right: unknown) {
    if (typeof left !== typeof right) {
        return false;
    }
    if (typeof left !== "object") {
        return left === right;
    }

    if (Array.isArray(left)) {
        if (!Array.isArray(right) || left.length !== right.length) return false;
        for (let i = 0; i < left.length; i++) {
            if (!leftEqual(left[i], right[i])) return false;
        }
        return true;
    }

    if (left === null || right === null) {
        return left === right;
    }

    for (const key in left) {
        // @ts-ignore
        if (!leftEqual(left[key], right[key])) {
            return false;
        }
    }

    // @ts-ignore
    if (Object.keys(right).length) return false;

    return true;
}

describe("definitions", async () => {
    it("should stay intact with static structs", async () => {
        const { serialize, deserialize, materialize, Coordinate, Locations } =
            await getSingleModule(
                new URL("./definitions/static.pest", import.meta.url)
            );

        function mirror<T>(data: T, schema: PestType<T>) {
            // @ts-expect-error meh
            const serialized = serialize(data, schema);
            return materialize(serialized, schema);
        }

        const coord = { x: 1, y: 2 };
        expect(mirror(coord, Coordinate)).toEqual(coord);
        expect(
            leftEqual(
                coord,
                deserialize(serialize(coord, Coordinate), Coordinate)
            )
        ).toBe(true);

        const locations = {
            home: { x: 1, y: 2 },
            work: { x: 3, y: 4 }
        };
        expect(mirror(locations, Locations)).toEqual(locations);
        expect(
            leftEqual(
                locations,
                deserialize(serialize(locations, Locations), Locations)
            )
        ).toBe(true);
    });

    it("should stay intact with dynamic structs", async () => {
        const { serialize, deserialize, materialize, Map, Endpoint } =
            await getSingleModule(
                new URL("./definitions/dynamic.pest", import.meta.url)
            );

        function mirror<T>(data: T, schema: PestType<T>) {
            // @ts-expect-error meh
            const serialized = serialize(data, schema);
            return materialize(serialized, schema);
        }

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

        expect(mirror(map, Map)).toEqual(map);
        expect(leftEqual(map, deserialize(serialize(map, Map), Map))).toBe(
            true
        );

        const endpoint = {
            method: "GET",
            route: "/endpoint",
            accessed_at: new Date()
        };

        expect(mirror(endpoint, Endpoint)).toEqual(endpoint);
        expect(
            leftEqual(
                endpoint,
                deserialize(serialize(endpoint, Endpoint), Endpoint)
            )
        ).toBe(true);
    });

    it("should stay intact with static structs", async () => {
        const {
            serialize,
            deserialize,
            materialize,
            NullableCoordinate,
            LocationsMaybeNoWork
        } = await getSingleModule(
            new URL("./definitions/static.pest", import.meta.url)
        );

        function mirror<T>(data: T, schema: PestType<T>) {
            // @ts-expect-error meh
            const serialized = serialize(data, schema);
            return materialize(serialized, schema);
        }

        const coord = { x: 1, y: null };
        expect(mirror(coord, NullableCoordinate)).toEqual(coord);
        expect(
            leftEqual(
                coord,
                deserialize(
                    serialize(coord, NullableCoordinate),
                    NullableCoordinate
                )
            )
        ).toBe(true);

        const locations = {
            home: { x: null, y: 23 },
            work: null
        };
        expect(mirror(locations, LocationsMaybeNoWork)).toEqual(locations);
        expect(
            leftEqual(
                locations,
                deserialize(
                    serialize(locations, LocationsMaybeNoWork),
                    LocationsMaybeNoWork
                )
            )
        ).toBe(true);
    });

    it("should stay intact with dynamic structs", async () => {
        const { serialize, deserialize, materialize, MapSketchyLocations } =
            await getSingleModule(
                new URL("./definitions/dynamic.pest", import.meta.url)
            );

        function mirror<T>(data: T, schema: PestType<T>) {
            // @ts-expect-error meh
            const serialized = serialize(data, schema);
            return materialize(serialized, schema);
        }

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

        expect(mirror(map, MapSketchyLocations)).toEqual(map);
        expect(
            leftEqual(
                map,
                deserialize(
                    serialize(map, MapSketchyLocations),
                    MapSketchyLocations
                )
            )
        ).toBe(true);

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

        expect(mirror(map2, MapSketchyLocations)).toEqual(map2);
        expect(
            leftEqual(
                map2,
                deserialize(
                    serialize(map2, MapSketchyLocations),
                    MapSketchyLocations
                )
            )
        ).toBe(true);
    });
});
