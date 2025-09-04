import { Glob } from 'bun';
import type { PageServerLoad } from './$types';
import { join } from 'node:path';
import { env } from 'node:process';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { desc, eq } from 'drizzle-orm';
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

	return { luts, image, snapshots };
};

function formatLut(path: string, cwd: string) {
	const folders = path.split('/');
	const name = folders.pop()?.replace(/\.png$/, '');

	return { name: name ?? 'Lut', path: join(cwd, path), tags: folders };
}
