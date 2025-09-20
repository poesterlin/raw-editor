import { db } from '$lib/server/db';
import { imageTable, imageToTagTable, snapshotTable, type Image, profileTable } from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import { Glob } from 'bun';
import { and, asc, desc, eq, exists, gt, isNotNull, isNull, lt, notExists, or, SQL } from 'drizzle-orm';
import { join } from 'node:path';
import { env } from 'node:process';
import type { PageServerLoad } from './$types';

// [
// 		{ name: 'All Images', value: 'none' },
// 		{ name: 'Changed since last export', value: 'changed' },
// 		{ name: 'No Archived', value: 'archived' },
// 		{ name: 'Only Archived', value: 'no-archived' },
// 		{ name: 'Only Unedited', value: 'unedited' },
// 		{ name: 'Only Edited', value: 'edited' },
// 	];

const filterMap: Record<string, SQL[]> = {
	none: [],
	changed: [or(
		lt(imageTable.lastExportedAt, imageTable.updatedAt),
		isNull(imageTable.lastExportedAt)
	)!],
	archived: [eq(imageTable.isArchived, true)],
	'no-archived': [eq(imageTable.isArchived, false)],
	unedited: [notExists(db.select().from(snapshotTable).where(eq(snapshotTable.imageId, imageTable.id))), eq(imageTable.isArchived, false)],
	edited: [exists(db.select().from(snapshotTable).where(eq(snapshotTable.imageId, imageTable.id)))]
};

export const load: PageServerLoad = async ({ params, url }) => {
	const { img } = params;
	const imageId = Number(img);

	const [image, snapshots, imageTags, tags, profiles] = await Promise.all([
		db.query.imageTable.findFirst({
			where: eq(imageTable.id, imageId),
		}),
		db.query.snapshotTable.findMany({
			where: eq(snapshotTable.imageId, imageId),
			orderBy: desc(snapshotTable.createdAt)
		}),
		db.query.imageToTagTable.findMany({
			where: eq(imageToTagTable.imageId, imageId),
			with: {
				tag: true
			}
		}),
		db.query.tagTable.findMany(),
		db.query.profileTable.findMany({
			orderBy: desc(profileTable.createdAt)
		})
	]);

	if (!image) {
		error(404, { message: 'Image or session not found' });
	}

	// load luts
	const glob = new Glob('**/*.png');
	const cwd = env.CLUT_DIR;
	let luts: ReturnType<typeof formatLut>[] = [];

	if (cwd) {
		const files = await Array.fromAsync(glob.scan({ cwd }));
		luts = files.map((f) => formatLut(f, cwd));
	}

	const filters = [eq(imageTable.sessionId, image.sessionId)];
	filters.push(...(filterMap[url.searchParams.get('filter') ?? 'none'] ?? []));

	// find next image in line
	const [nextImage] = await db
		.select({ id: imageTable.id })
		.from(imageTable)
		.where(and(gt(imageTable.recordedAt, image.recordedAt), ...filters))
		.orderBy(asc(imageTable.recordedAt))
		.limit(1);

	// find previous image in line
	const [previousImage] = await db
		.select({ id: imageTable.id })
		.from(imageTable)
		.where(and(lt(imageTable.recordedAt, image.recordedAt), ...filters))
		.orderBy(desc(imageTable.recordedAt))
		.limit(1);

	return {
		luts,
		image,
		imageTags: imageTags.map((it) => it.tag) as { id: number; name: string }[],
		tags,
		snapshots,
		profiles,
		nextImage: nextImage?.id,
		previousImage: previousImage?.id
	};
};

function formatLut(path: string, cwd: string) {
	const folders = path.split('/');
	const name = folders.pop()?.replace(/\.png$/, '');

	return { name: name ?? 'Lut', path: join(cwd, path), tags: folders };
}
