import { db } from "$lib/server/db";
import { imageTable } from "$lib/server/db/schema";
import { jobManager } from "$lib/server/jobs/manager";
import { JobType } from "$lib/server/jobs/types";
import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

export const GET: RequestHandler = async ({ params }) => {
    const { id } = params;
    const isRunnings = jobManager.getActiveJobs().includes(Number(id));

    if (isRunnings) {
        return json({ job: id, status: 'running' });
    }

    return json({ status: 'not found' }, { status: 404 });
};

export const POST: RequestHandler = async ({ params }) => {
    const sessionId = Number(params.id);
    if (isNaN(sessionId)) {
        return json({ message: 'Invalid session ID' }, { status: 400 });
    }

    const images = await db.query.imageTable.findMany({
        where: eq(imageTable.sessionId, sessionId),
        columns: {
            filepath: true
        }
    });

    if (images.length === 0) {
        return json({ message: 'No images found for this session' }, { status: 404 });
    }

    jobManager.submit(JobType.IMPORT, { sessionId });
    return json({ status: 'ok' });
};

export const DELETE: RequestHandler = async ({ params }) => {
    const { id } = params;
    jobManager.cancel(Number(id));
    return json({ status: 'ok' });
};
