export function materialize<T>(data: T): T {
    if (Array.isArray(data)) {
        return data.map(materialize) as T;
    }
    // @ts-expect-error i don't see why not
    if (!(data && data.$p)) return data;
    const obj: Record<string, any> = {};
    for (const key in Object.getPrototypeOf(data)) {
        obj[key] = materialize((data as any)[key]);
    }
    return obj as T;
}

export { array } from "./internal/primitives.js";
