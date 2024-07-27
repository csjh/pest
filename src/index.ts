export function materialize<T>(data: T): T {
    if (Array.isArray(data)) {
        return data.map(materialize) as T;
    }
    if (!(data && typeof data === "object" && "$" in data)) return data;
    const obj: Record<string, any> = {};
    for (const key in Object.getPrototypeOf(data)) {
        obj[key] = materialize((data as any)[key]);
    }
    return obj as T;
}

export { array } from "./internal/primitives.js";
