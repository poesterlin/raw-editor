import { db } from '$lib/server/db';
import { snapshotTable } from '$lib/server/db/schema';
import { json, type RequestHandler } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params }) => {
	const imageId = Number(params.id);
	const snapshots = await db.query.snapshotTable.findMany({
		where: eq(snapshotTable.imageId, imageId)
	});
	return json(snapshots);
};

export const POST: RequestHandler = async ({ request, params }) => {
	const imageId = Number(params.id);
	const { pp3 } = await request.json();

	const [newSnapshot] = await db
		.insert(snapshotTable)
		.values({
			imageId,
			pp3,
		})
		.returning();

	return json(newSnapshot, { status: 201 });
};
