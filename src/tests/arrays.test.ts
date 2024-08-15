/// <reference types="bun-types" />

import { describe, it, expect } from "bun:test";
import { array } from "../index.js";
import { serialize, deserialize, materialize } from "../internal/index.js";
import {
    Locations,
    NullableCoordArray,
    NullableLocationArray,
    NullableCoordArrayArray,
    NullableLocations,
    HorseRace,
    HorseRaceSomeHorsesDied,
    Coordinate,
    mirror,
    Map,
    NullableMapArray,
    NullableMapArrayArray
} from "./shared.js";

describe("unnested arrays", async () => {
    it("should stay intact with static struct arrays a", async () => {
        const coord = [
            { x: 1, y: 2 },
            { x: 1, y: 2 }
        ];
        expect(coord).toEqual(mirror(coord, array(Coordinate), deserialize));
        expect(coord).toEqual(mirror(coord, array(Coordinate), materialize));

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
        expect(locations).toEqual(
            mirror(locations, array(Locations), deserialize)
        );
        expect(locations).toEqual(
            mirror(locations, array(Locations), materialize)
        );
    });

    it("should stay intact with dynamic struct arrays", async () => {
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

        expect(map).toEqual(mirror(map, array(Map), deserialize));
        expect(map).toEqual(mirror(map, array(Map), materialize));
    });

    it("should work as an array", async () => {
        const coord = [
            { x: 1, y: 2 },
            { x: 1, y: 2 }
        ];
        const serialized = serialize(coord, array(Coordinate));
        const deserialized = deserialize(serialized, array(Coordinate));

        expect(coord.map((c) => c.x)).toEqual(deserialized.map((c) => c.x));
        expect(coord.map((c) => c.y)).toEqual(deserialized.map((c) => c.y));
        expect(deserialized.every((c) => typeof c === "object")).toBe(true);
    });

    it("should stay intact with static struct arrays", async () => {
        const coord = [null, { x: 1, y: 2 }];
        expect(coord).toEqual(mirror(coord, NullableCoordArray, deserialize));
        expect(coord).toEqual(mirror(coord, NullableCoordArray, materialize));

        const locations = [
            {
                home: { x: 1, y: 2 },
                work: { x: 3, y: 4 }
            },
            null
        ];
        expect(locations).toEqual(
            mirror(locations, NullableLocationArray, deserialize)
        );
        expect(locations).toEqual(
            mirror(locations, NullableLocationArray, materialize)
        );
    });

    it("should stay intact with dynamic struct arrays", async () => {
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
            null
        ];

        expect(map).toEqual(mirror(map, NullableMapArray, deserialize));
        expect(map).toEqual(mirror(map, NullableMapArray, materialize));
    });
});

describe("nested arrays", async () => {
    it("should stay intact with static struct arrays", async () => {
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
        expect(coord).toEqual(mirror(coord, array(Coordinate, 2), deserialize));
        expect(coord).toEqual(mirror(coord, array(Coordinate, 2), materialize));

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
        expect(locations).toEqual(
            mirror(locations, array(Locations, 2), deserialize)
        );
        expect(locations).toEqual(
            mirror(locations, array(Locations, 2), materialize)
        );
    });

    it("should stay intact with dynamic struct arrays", async () => {
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

        expect(map).toEqual(mirror(map, array(Map, 2), deserialize));
        expect(map).toEqual(mirror(map, array(Map, 2), materialize));
    });

    it("should work as an array", async () => {
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

    it("should stay intact with nullish static struct arrays", async () => {
        const coord = [
            null,
            [
                { x: 1, y: 2 },
                { x: 1, y: 2 }
            ]
        ];
        expect(coord).toEqual(
            mirror(coord, NullableCoordArrayArray, deserialize)
        );
        expect(coord).toEqual(
            mirror(coord, NullableCoordArrayArray, materialize)
        );

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
        expect(locations).toEqual(
            mirror(locations, NullableLocations, deserialize)
        );
        expect(locations).toEqual(
            mirror(locations, NullableLocations, materialize)
        );
    });

    it("should stay intact with nullish dynamic struct arrays", async () => {
        const map = [
            null,
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

        expect(map).toEqual(mirror(map, NullableMapArrayArray, deserialize));
        expect(map).toEqual(mirror(map, NullableMapArrayArray, materialize));
    });
});

describe("unnested typed arrays", async () => {
    it("should stay intact with typed arrays", async () => {
        const races = {
            horses: ["Horsey"],
            times: new Float64Array([1.0])
        };
        expect(races).toEqual(mirror(races, HorseRace, deserialize));
        expect(races).toEqual(mirror(races, HorseRace, materialize));

        const races2 = [
            {
                horses: ["Horsey", "McHorseface", "Horsea", "Horseb"],
                times: new Float64Array([1.0, 2.0, 3.0, 4.0])
            },
            {
                horses: ["Horsey", "McHorseface", "Horsea", "Horseb"],
                times: new Float64Array([1.0, 2.0, 3.0, 4.0])
            }
        ];
        expect(races2).toEqual(mirror(races2, array(HorseRace), deserialize));
        expect(races2).toEqual(mirror(races2, array(HorseRace), materialize));
    });

    it("should work as a typedarray", async () => {
        const races = [
            {
                horses: ["Horsey", "McHorseface", "Horsea", "Horseb"],
                times: new Float64Array([1.0, 2.0, 3.0, 4.0])
            },
            {
                horses: ["Horsey", "McHorseface", "Horsea", "Horseb"],
                times: new Float64Array([1.0, 2.0, 3.0, 4.0])
            }
        ];
        const serialized = serialize(races, array(HorseRace));
        const deserialized = deserialize(serialized, array(HorseRace));

        expect(deserialized[0].times).toBeInstanceOf(Float64Array);
        expect(deserialized[0].times.map((c) => c + 1)).toEqual(
            deserialized[0].times.map((c) => c + 1)
        );
    });

    it("should stay intact with nullish non-typed arrays", async () => {
        const races = {
            horses: ["Horsey"],
            times: [1.0, null]
        };
        expect(races).toEqual(
            mirror(races, HorseRaceSomeHorsesDied, deserialize)
        );
        expect(races).toEqual(
            mirror(races, HorseRaceSomeHorsesDied, materialize)
        );

        const races2 = [
            {
                horses: ["Horsey", "McHorseface", "Horsea", "Horseb"],
                times: [null, 1.0, 2.0, 3.0, 4.0]
            },
            {
                horses: ["Horsey", "McHorseface", "Horsea", "Horseb"],
                times: [1.0, 2.0, null, 3.0, 4.0]
            }
        ];
        expect(races2).toEqual(
            mirror(races2, array(HorseRaceSomeHorsesDied), deserialize)
        );
        expect(races2).toEqual(
            mirror(races2, array(HorseRaceSomeHorsesDied), materialize)
        );
    });
});
