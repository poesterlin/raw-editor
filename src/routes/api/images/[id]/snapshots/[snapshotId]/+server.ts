import { db } from '$lib/server/db';
import { snapshotTable } from '$lib/server/db/schema';
import { json, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const DELETE: RequestHandler = async ({ params }) => {
	const snapshotId = Number(params.snapshotId);

	await db.delete(snapshotTable).where(eq(snapshotTable.id, snapshotId));

	return json({ success: true });
};
