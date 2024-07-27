import type { Plugin } from "vite";
import fs from "fs/promises";
import path from "path";
import { compile } from "./compile.js";

const FILE_EXT = ".pest";
const PEST_FOLDER = ".pest";
const TYPES_FOLDER = `${PEST_FOLDER}/types`;

async function mkdir(dir: string) {
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch {}
}

async function prune(file: string) {
    if (!file.endsWith(FILE_EXT)) return true;
    const isFile = await fs.stat(file).then((stat) => stat.isFile());
    if (!isFile) return true;
    return false;
}

async function generateType(file: string) {
    if (await prune(file)) return;

    const dts = await fs
        .readFile(file, "utf-8")
        .then((code) => compile(code, { as: "dts" }));
    const destination = path.join(
        TYPES_FOLDER,
        `${file.replace(process.cwd(), "")}.d.ts`
    );

    await mkdir(path.dirname(destination));
    await fs.writeFile(destination, dts);
}

async function deleteType(file: string) {
    if (await prune(file)) return;

    await fs.rm(
        path.join(TYPES_FOLDER, `${file.replace(process.cwd(), "")}.d.ts`)
    );
}

const BANNED_DIRECTORIES = new Set(["node_modules", PEST_FOLDER]);
async function* getAllPest(dir = "."): AsyncGenerator<string> {
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
        if (file.isDirectory() && !BANNED_DIRECTORIES.has(file.name)) {
            yield* getAllPest(path.join(dir, file.name));
        } else if (file.isFile() && file.name.endsWith(FILE_EXT)) {
            yield path.join(dir, file.name);
        }
    }
}

export async function pest(): Promise<Plugin<never>> {
    await mkdir(PEST_FOLDER);
    await mkdir(TYPES_FOLDER);

    return {
        name: "vite-plugin-pest",
        async configureServer(server) {
            server.watcher.on("add", generateType);
            server.watcher.on("change", generateType);
            server.watcher.on("unlink", deleteType);

            // could be Promise.all'd but really not that serious
            for await (const file of getAllPest()) {
                await generateType(file);
            }
        },
        async transform(code, id) {
            if (!id.endsWith(FILE_EXT)) return null;

            return compile(code, {
                as: "javascript"
            });
        }
    };
}
