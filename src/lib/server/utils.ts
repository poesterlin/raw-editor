import { SQL, sql, type GetColumnData } from "drizzle-orm";
import { db } from "./db";
import type { PgColumn, PgTable, SelectedFields } from "drizzle-orm/pg-core";
import { imageTable } from "./db/schema";


export async function respondWithFile(filePath: string) {
    const file = Bun.file(filePath);
    const exists = await file.exists();
    if (!exists) {
        return new Response('File not found', { status: 404 });
    }

    return new Response(file, {
        headers: {
            'Content-Type': file.type,
            'Content-Length': String(file.size),
            // caching
            'Cache-Control': 'public, max-age=31536000'
        },
    });
}

export function getFileNameFromPath(filePath: string) {
    return filePath.split('/').pop() || '';
}

export function getFileDirectory(filePath: string) {
    const parts = filePath.split('/');
    parts.pop(); // Remove the file name
    return parts.join('/') || '/'; // Return the directory or root if empty
}

type SelectedType<Fields extends Record<string, PgColumn>> = {
    [Property in keyof Fields]: GetColumnData<Fields[Property]>
};

type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};

export function buildJSONColumn<Fields extends Record<string, PgColumn>>(fields: Fields) {
    return sql<Prettify<SelectedType<Fields>>>`json_agg(json_build_object(
        ${sql.join(
            Object.entries(fields).map(([key, value]) => sql`${sql.raw(`'${key}'`)}, ${value}`),
            sql`, `
        )}))`;
}
