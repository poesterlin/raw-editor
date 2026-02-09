
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import * as path from 'path';
import * as fs from 'fs/promises';
import { db } from '$lib/server/db';
import { importTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { ExifDate, ExifDateTime, exiftool } from 'exiftool-vendored';

const IMPORT_DIR = env.IMPORT_DIR;

function toDate(value: string | number | ExifDateTime | ExifDate | Date) {
	if (value instanceof Date) {
		return value;
	}
	if (typeof value === 'string' || typeof value === 'number') {
		return new Date(value);
	}
	if (value instanceof ExifDateTime || value instanceof ExifDate) {
		return value.toDate();
	}
	throw new Error('Unsupported date format');
}

export const POST: RequestHandler = async ({ request }) => {
	console.log('[UPLOAD] Received upload request');
	if (!IMPORT_DIR) {
		console.error('[UPLOAD] IMPORT_DIR not configured');
		error(500, 'IMPORT_DIR not configured');
	}

	const formData = await request.formData();
	const files = formData.getAll('files') as File[];

	console.log(`[UPLOAD] Processing ${files.length} files`);

	if (files.length === 0) {
		error(400, 'No files uploaded');
	}

	const results = [];

	for (const file of files) {
		const filePath = path.join(IMPORT_DIR, file.name);
		console.log(`[UPLOAD] Saving to ${filePath}`);
		
		try {
			// Check if file already exists in DB
			const existing = await db.query.importTable.findFirst({
				where: eq(importTable.filePath, filePath)
			});

			if (existing) {
				console.log(`[UPLOAD] ${file.name} already in queue, skipping`);
				results.push({ name: file.name, status: 'skipped', message: 'Already in queue' });
				continue;
			}

			// Ensure IMPORT_DIR exists
			await fs.mkdir(IMPORT_DIR, { recursive: true });

			// Save file
			const arrayBuffer = await file.arrayBuffer();
			await fs.writeFile(filePath, Buffer.from(arrayBuffer));
			console.log(`[UPLOAD] ${file.name} saved successfully`);

			// Extract metadata
			const tags = await exiftool.read(filePath);
			const recordingDate = tags?.CreateDate || tags?.DateTimeOriginal || new Date();

			// Add to importTable
			const [inserted] = await db.insert(importTable).values({
				filePath,
				date: toDate(recordingDate),
			}).returning();

			console.log(`[UPLOAD] ${file.name} added to DB with ID ${inserted.id}`);
			results.push({ name: file.name, status: 'success', id: inserted.id });
		} catch (e) {
			console.error(`[UPLOAD] Failed to upload ${file.name}:`, e);
			results.push({ name: file.name, status: 'error', message: String(e) });
		}
	}

	return json({ results });
};
