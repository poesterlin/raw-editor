
import { jobManager } from '$lib/server/jobs/manager';
import { JobType } from '$lib/server/jobs/types';
import { db } from '$lib/server/db';
import { imageTable, importTable, sessionTable, type Import } from '$lib/server/db/schema';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { and, desc, gt, inArray, isNull } from 'drizzle-orm';

const PAGE_SIZE = 20;

export interface ImportResponse {
    items: Import[];
    next: number | null;
}

export const GET: RequestHandler = async ({ url }) => {
    const cursor = Number(url.searchParams.get('cursor')) || 0;

    const items = await db.query.importTable.findMany({
        limit: PAGE_SIZE,
        where: and(gt(importTable.id, cursor), isNull(importTable.importedAt)),
        orderBy: desc(importTable.id)
    });

    let next: number | null = null;
    if (items.length === PAGE_SIZE) {
        const lastItem = items[items.length - 1];
        if (lastItem) {
            next = lastItem.id;
        }
    }

    return json({ items, next });
}


export const POST: RequestHandler = async ({ request }) => {
    const { name, importIds } = await request.json();

    if (!name || !Array.isArray(importIds) || importIds.length === 0) {
        error(400, 'Missing name or importIds');
    }

    let sessionId: number | null = null;
    const filePaths: string[] = [];

    await db.transaction(async (tx) => {
        const [session] = await tx
            .insert(sessionTable)
            .values({ name, startedAt: new Date() })
            .returning();

        if (!session) {
            tx.rollback();
            return;
        }

        sessionId = session.id;

        const imports = await tx.query.importTable.findMany({
            where: inArray(importTable.id, importIds)
        });

        if (imports.length !== importIds.length) {
            tx.rollback();
            return;
        }

        // Collect file paths for the job
        imports.forEach(i => filePaths.push(i.filePath));

        const newImages = imports.map((imp) => ({
            createdAt: new Date(),
            updatedAt: new Date(),
            filepath: imp.filePath,
            sessionId: session.id,
        }));

        await tx.insert(imageTable).values(newImages);

        await tx.update(importTable).set({ importedAt: new Date() }).where(inArray(importTable.id, importIds));
    });

    if (sessionId) {
        console.log(`[API] Submitting import job for session ${sessionId}.`);
        jobManager.submit(JobType.IMPORT, { sessionId });
    }

    return new Response(null, { status: 202 });
};
