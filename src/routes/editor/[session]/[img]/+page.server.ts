import { Glob } from "bun";
import type { PageServerLoad } from "./$types";
import { join } from "node:path";
import { env } from "node:process";
import { error } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { and, eq } from "drizzle-orm";
import { imageTable, sessionTable } from "$lib/server/db/schema";

export const load: PageServerLoad = async ({ params }) => {
    const { session, img } = params;

    const [image, sessionData] = await Promise.all([
        db.query.imageTable.findFirst({
            where: and(eq(imageTable.id, Number(img)), eq(imageTable.sessionId, Number(session)))
        }),
        db.query.sessionTable.findFirst({
            where: eq(sessionTable.id, Number(session))
        })
    ]);

    if (!image || !sessionData) {
        error(404, { message: "Image or session not found" });
    }

    // load luts
    const glob = new Glob("**/*.png");
    const cwd = env.CLUT_DIR;
    if (!cwd) {
        error(500, { message: "CLUT_DIR environment variable is not set" });
    }

    const files = await Array.fromAsync(glob.scan({ cwd }));
    const luts = files.map((f) => formatLut(f, cwd));

    return { luts, image, session: sessionData };
};

function formatLut(path: string, cwd: string) {
    const folders = path.split('/');
    const name = folders.pop()?.replace(/\.png$/, "");

    return { name: name ?? "Lut", path: join(cwd, path), tags: folders };
}