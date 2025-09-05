import { Glob } from 'bun';
import type { PageServerLoad } from './$types';
import { join } from 'node:path';
import { env } from 'node:process';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { and, asc, desc, eq, gt, lt } from 'drizzle-orm';
import { imageTable, snapshotTable } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ params }) => {
	const { img } = params;
	const imageId = Number(img);

	const [image, snapshots] = await Promise.all([
		db.query.imageTable.findFirst({
			where: eq(imageTable.id, imageId)
		}),
		db.query.snapshotTable.findMany({
			where: eq(snapshotTable.imageId, imageId),
			orderBy: desc(snapshotTable.createdAt)
		})
	]);

	if (!image) {
		error(404, { message: 'Image or session not found' });
	}

	// load luts
	const glob = new Glob('**/*.png');
	const cwd = env.CLUT_DIR;
	if (!cwd) {
		error(500, { message: 'CLUT_DIR environment variable is not set' });
	}

	const files = await Array.fromAsync(glob.scan({ cwd }));
	const luts = files.map((f) => formatLut(f, cwd));

	// find next image in line
	const [nextImage] = await db
		.select({ id: imageTable.id })
		.from(imageTable)
		.where(and(gt(imageTable.id, Number(img)), eq(imageTable.sessionId, image.sessionId)))
		.orderBy(asc(imageTable.id))
		.limit(1);

	// find previous image in line
	const [previousImage] = await db
		.select({ id: imageTable.id })
		.from(imageTable)
		.where(and(lt(imageTable.id, Number(img)), eq(imageTable.sessionId, image.sessionId)))
		.orderBy(desc(imageTable.id))
		.limit(1);

	return { luts, image, snapshots, nextImage: nextImage?.id, previousImage: previousImage?.id };
};

function formatLut(path: string, cwd: string) {
	const folders = path.split('/');
	const name = folders.pop()?.replace(/\.png$/, '');

	return { name: name ?? 'Lut', path: join(cwd, path), tags: folders };
}
