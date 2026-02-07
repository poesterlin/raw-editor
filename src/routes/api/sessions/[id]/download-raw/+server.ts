import { db } from '$lib/server/db';
import { imageTable, sessionTable } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { basename } from 'path';
import archiver from 'archiver';
import { PassThrough } from 'stream';

export const GET: RequestHandler = async ({ params }) => {
	const sessionId = Number(params.id);
	if (Number.isNaN(sessionId)) {
		return new Response('Invalid session id', { status: 400 });
	}

	const session = await db.query.sessionTable.findFirst({ where: eq(sessionTable.id, sessionId) });
	if (!session) {
		return new Response('Session not found', { status: 404 });
	}

	const images = await db.query.imageTable.findMany({
		where: and(eq(imageTable.sessionId, sessionId), eq(imageTable.isArchived, false))
	});

	if (!images || images.length === 0) {
		return new Response('No images to download', { status: 404 });
	}

	const archive = archiver('zip', { zlib: { level: 9 } });
	const pass = new PassThrough();

	archive.on('error', (err) => {
		pass.destroy(err);
	});

	// Pipe archive data into the passthrough stream which becomes the response body
	archive.pipe(pass);

	for (const img of images) {
		// Use the original filename for the zip entry
		const name = basename(img.filepath);
		archive.file(img.filepath, { name });
	}

	// Finalize asynchronously; errors will destroy the stream
	archive.finalize().catch((err) => pass.destroy(err));

	const filename = `session-${sessionId}-raw.zip`;
	const headers = new Headers({
		'Content-Type': 'application/zip',
		'Content-Disposition': `attachment; filename="${filename}"`
	});

	// @ts-expect-error - PassThrough is a Readable stream which is acceptable as a Response body
	return new Response(pass, { headers });
};
