import { jobManager } from "$lib/server/jobs/manager";
import { JobType } from "$lib/server/jobs/types";
import type { RequestHandler } from "@sveltejs/kit";
import { json } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ params }) => {
    const { id } = params;
    const isRunnings = jobManager.getActiveJobs().includes(Number(id));

    if (isRunnings) {
        return json({ job: id, status: 'running' });
    }

    return json({ status: 'not found' }, { status: 404 });
};

export const POST: RequestHandler = async ({ params }) => {
    const { id } = params;
    jobManager.submit(JobType.EXPORT, { sessionId: Number(id) });
    return json({ status: 'ok' });
};

export const DELETE: RequestHandler = async ({ params }) => {
    const { id } = params;
    jobManager.cancel(Number(id));
    return json({ status: 'ok' });
};
