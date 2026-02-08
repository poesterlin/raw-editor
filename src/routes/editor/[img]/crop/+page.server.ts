import { db } from '$lib/server/db';
import { imageTable, snapshotTable } from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const { img } = params;
	const imageId = Number(img);

	const [image, snapshots] = await Promise.all([
		db.query.imageTable.findFirst({
			where: eq(imageTable.id, imageId),
		}),
		db.query.snapshotTable.findMany({
			where: eq(snapshotTable.imageId, imageId),
			orderBy: desc(snapshotTable.createdAt)
		}),
	]);

	if (!image) {
		error(404, { message: 'Image or session not found' });
	}

	return {
		image,
		snapshots,
	};
};

