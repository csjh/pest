import {
    array,
    boolean,
    date,
    f32,
    f64,
    i32,
    deserialize,
    nullable,
    serialize,
    string,
    struct,
    union
} from "../index.js";
import type { PestType } from "../types.js";

export const Coordinate = struct({
    x: f32,
    y: f32
});

export const Locations = struct({
    home: Coordinate,
    work: Coordinate
});

export const NullableCoordinate = struct({
    x: nullable(f32),
    y: nullable(f32)
});

export const LocationsMaybeNoWork = struct({
    home: NullableCoordinate,
    work: nullable(NullableCoordinate)
});

export const NullableCoordArrayArray = array(nullable(array(Coordinate)));
export const NullableCoordArray = array(nullable(Coordinate));
export const NullableLocations = array(nullable(Locations), 2);
export const NullableLocationArray = array(nullable(Locations));

export const SavedLocation = struct({
    name: string,
    importance: i32,
    coord: Coordinate,
    starred: boolean,
    saved_at: date
});

export const Map = struct({
    locations: array(SavedLocation),
    user: string,
    default: SavedLocation,
    current: SavedLocation
});

export const MapSketchyLocations = struct({
    locations: nullable(array(nullable(SavedLocation))),
    user: string,
    default: SavedLocation,
    current: nullable(SavedLocation)
});

export const Endpoint = struct({
    method: string,
    route: string,
    accessed_at: date
});

export const NullableMapArrayArray = array(nullable(array(Map)));
export const NullableMapArray = array(nullable(Map));

export const HorseRace = struct({
    horses: array(string),
    times: array(f64)
});

export const HorseRaceSomeHorsesDied = struct({
    horses: array(string),
    times: array(nullable(f64))
});

export const PrimitiveUnion = union(i32, string, boolean);
export const Union = union(i32, string, boolean, Coordinate);
export const NullableUnionArray = array(nullable(Union));

export function mirror<T>(
    data: NoInfer<T>,
    schema: PestType<T>,
    f: typeof deserialize
): T {
    const serialized = serialize(data, schema);
    return f(serialized, schema) as T;
}
