/// <reference types="bun-types" />

import { describe, it, expect } from "bun:test";
import { getSingleModule } from "./utils.js";
import { materialize, array } from "../index.js";
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

describe("unnested arrays", async () => {
    it("should stay intact with static struct arrays", async () => {
        const { serialize, deserialize, Coordinate, Locations } =
            await getSingleModule(
                new URL("./definitions/static.pest", import.meta.url)
            );

        function mirror(data: unknown, schema: PestType<unknown>) {
            const serialized = serialize(data, schema);
            return materialize(deserialize(serialized, schema));
        }

        const coord = [
            { x: 1, y: 2 },
            { x: 1, y: 2 }
        ];
        expect(mirror(coord, array(Coordinate))).toEqual(coord);
        expect(
            leftEqual(
                coord,
                deserialize(
                    serialize(coord, array(Coordinate)),
                    array(Coordinate)
                )
            )
        ).toBe(true);

        const locations = [
            {
                home: { x: 1, y: 2 },
                work: { x: 3, y: 4 }
            },
            {
                home: { x: 1, y: 2 },
                work: { x: 3, y: 4 }
            }
        ];
        expect(mirror(locations, array(Locations))).toEqual(locations);
        expect(
            leftEqual(
                locations,
                deserialize(
                    serialize(locations, array(Locations)),
                    array(Locations)
                )
            )
        ).toBe(true);
    });

    it("should stay intact with dynamic struct arrays", async () => {
        const { serialize, deserialize, Map } = await getSingleModule(
            new URL("./definitions/dynamic.pest", import.meta.url)
        );

        function mirror(data: unknown, schema: PestType<unknown>) {
            const serialized = serialize(data, schema);
            return materialize(deserialize(serialized, schema));
        }

        const map = [
            {
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
            },
            {
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
            }
        ];

        expect(mirror(map, array(Map))).toEqual(map);
        expect(
            leftEqual(map, deserialize(serialize(map, array(Map)), array(Map)))
        ).toBe(true);
    });

    it("should work as an array", async () => {
        const { serialize, deserialize, Coordinate } = await getSingleModule(
            new URL("./definitions/static.pest", import.meta.url)
        );

        const coord = [
            { x: 1, y: 2 },
            { x: 1, y: 2 }
        ];
        const serialized = serialize(coord, array(Coordinate));
        const deserialized = deserialize(serialized, array(Coordinate));

        expect(deserialized.map((c) => c.x)).toEqual(coord.map((c) => c.x));
        expect(deserialized.map((c) => c.y)).toEqual(coord.map((c) => c.y));
        expect(deserialized.every((c) => typeof c === "object")).toBe(true);
    });
});

describe("nested arrays", async () => {
    it("should stay intact with static struct arrays", async () => {
        const { serialize, deserialize, Coordinate, Locations } =
            await getSingleModule(
                new URL("./definitions/static.pest", import.meta.url)
            );

        function mirror(data: unknown, schema: PestType<unknown>) {
            const serialized = serialize(data, schema);
            return materialize(deserialize(serialized, schema));
        }

        const coord = [
            [
                { x: 1, y: 2 },
                { x: 1, y: 2 }
            ],
            [
                { x: 1, y: 2 },
                { x: 1, y: 2 }
            ]
        ];
        expect(mirror(coord, array(Coordinate, 2))).toEqual(coord);
        expect(
            leftEqual(
                coord,
                deserialize(
                    serialize(coord, array(Coordinate, 2)),
                    array(Coordinate, 2)
                )
            )
        ).toBe(true);

        const locations = [
            [
                {
                    home: { x: 1, y: 2 },
                    work: { x: 3, y: 4 }
                },
                {
                    home: { x: 1, y: 2 },
                    work: { x: 3, y: 4 }
                }
            ],
            [
                {
                    home: { x: 1, y: 2 },
                    work: { x: 3, y: 4 }
                },
                {
                    home: { x: 1, y: 2 },
                    work: { x: 3, y: 4 }
                }
            ]
        ];
        expect(mirror(locations, array(Locations, 2))).toEqual(locations);
        expect(
            leftEqual(
                locations,
                deserialize(
                    serialize(locations, array(Locations, 2)),
                    array(Locations, 2)
                )
            )
        ).toBe(true);
    });

    it("should stay intact with dynamic struct arrays", async () => {
        const { serialize, deserialize, Map } = await getSingleModule(
            new URL("./definitions/dynamic.pest", import.meta.url)
        );

        function mirror(data: unknown, schema: PestType<unknown>) {
            const serialized = serialize(data, schema);
            return materialize(deserialize(serialized, schema));
        }

        const map = [
            [
                {
                    locations: [
                        {
                            name: "Good Pizza",
                            importance: 9,
                            coord: {
                                x: 1.234320044517517,
                                y: 2.234149932861328
                            },
                            starred: true,
                            saved_at: new Date("2024-07-25T12:11:00.690Z")
                        },
                        {
                            name: "Bad Pizza",
                            importance: -1,
                            coord: {
                                x: 3.2343199253082275,
                                y: 4.234149932861328
                            },
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
                },
                {
                    locations: [
                        {
                            name: "Good Pizza",
                            importance: 9,
                            coord: {
                                x: 1.234320044517517,
                                y: 2.234149932861328
                            },
                            starred: true,
                            saved_at: new Date("2024-07-25T12:11:00.690Z")
                        },
                        {
                            name: "Bad Pizza",
                            importance: -1,
                            coord: {
                                x: 3.2343199253082275,
                                y: 4.234149932861328
                            },
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
                }
            ],
            [
                {
                    locations: [
                        {
                            name: "Good Pizza",
                            importance: 9,
                            coord: {
                                x: 1.234320044517517,
                                y: 2.234149932861328
                            },
                            starred: true,
                            saved_at: new Date("2024-07-25T12:11:00.690Z")
                        },
                        {
                            name: "Bad Pizza",
                            importance: -1,
                            coord: {
                                x: 3.2343199253082275,
                                y: 4.234149932861328
                            },
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
                },
                {
                    locations: [
                        {
                            name: "Good Pizza",
                            importance: 9,
                            coord: {
                                x: 1.234320044517517,
                                y: 2.234149932861328
                            },
                            starred: true,
                            saved_at: new Date("2024-07-25T12:11:00.690Z")
                        },
                        {
                            name: "Bad Pizza",
                            importance: -1,
                            coord: {
                                x: 3.2343199253082275,
                                y: 4.234149932861328
                            },
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
                },
                {
                    locations: [
                        {
                            name: "Good Pizza",
                            importance: 9,
                            coord: {
                                x: 1.234320044517517,
                                y: 2.234149932861328
                            },
                            starred: true,
                            saved_at: new Date("2024-07-25T12:11:00.690Z")
                        },
                        {
                            name: "Bad Pizza",
                            importance: -1,
                            coord: {
                                x: 3.2343199253082275,
                                y: 4.234149932861328
                            },
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
                }
            ]
        ];

        expect(mirror(map, array(Map, 2))).toEqual(map);
        expect(
            leftEqual(
                map,
                deserialize(serialize(map, array(Map, 2)), array(Map, 2))
            )
        ).toBe(true);
    });

    it("should work as an array", async () => {
        const { serialize, deserialize, Coordinate } = await getSingleModule(
            new URL("./definitions/static.pest", import.meta.url)
        );

        const coord = [
            [
                { x: 1, y: 2 },
                { x: 1, y: 2 }
            ],
            [
                { x: 1, y: 2 },
                { x: 1, y: 2 }
            ]
        ];
        const serialized = serialize(coord, array(Coordinate, 2));
        const deserialized = deserialize(serialized, array(Coordinate, 2));

        expect(deserialized.flat().map((c) => c.x)).toEqual(
            coord.flat().map((c) => c.x)
        );
        expect(deserialized.flat().map((c) => c.y)).toEqual(
            coord.flat().map((c) => c.y)
        );
        expect(deserialized.flat().every((c) => typeof c === "object")).toBe(
            true
        );
    });
});
