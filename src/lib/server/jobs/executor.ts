import { db } from '$lib/server/db';
import { editImage, generateImportTif } from '$lib/server/image-editor';
import ExportPP3 from '$lib/assets/export.pp3?raw';
import type { ExportPayload, ImportPayload, JobResult } from './types';
import { desc, eq } from 'drizzle-orm';
import { imageTable, sessionTable, snapshotTable, type Image, type Session } from '../db/schema';
import { applyPP3Diff, parsePP3, stringifyPP3 } from '$lib/pp3-utils';
import { join } from 'path';

export async function runImport(
	payload: ImportPayload,
	signal?: AbortSignal
): Promise<JobResult> {
	const { sessionId } = payload;

	const images = await db.query.imageTable.findMany({
		where: eq(imageTable.sessionId, sessionId)
	});

	console.log(`[Executor] Starting import for session: ${sessionId}`);
	try {
		for (const image of images) {
			if (signal?.aborted) {
				throw new Error('Aborted');
			}
			console.log(`[Executor] Processing ${image.filepath}`);
			const { pp3, tif } = await generateImportTif(image.filepath, { signal });

			await db
				.update(imageTable)
				.set({
					tifPath: tif,
					whiteBalance: pp3.White_Balance?.Temperature as number,
					tint: pp3.White_Balance?.Green as number
				})
				.where(eq(imageTable.id, image.id));
		}
		console.log(`[Executor] Finished import for session: ${sessionId}.`);
		return { status: 'success' };
	} catch (e: any) {
		console.error(`[Executor] Failed import for session: ${sessionId}`, e);
		return { status: 'error', message: e.message };
	}
}

export async function runExport(
	payload: ExportPayload,
	signal?: AbortSignal
): Promise<JobResult> {
	const { sessionId } = payload;

	const session = await db.query.sessionTable.findFirst({ where: eq(sessionTable.id, sessionId) });

	if (!session) {
		console.error(`[Executor] Session not found for export: ${sessionId}`);
		return { status: 'error', message: 'Session not found' };
	}

	console.log(`[Executor] Starting export for session: ${sessionId}`);
	try {
		const images = await db.query.imageTable.findMany({
			where: eq(imageTable.sessionId, sessionId)
		});

		for (let i = 0; i < images.length; i++) {
			if (signal?.aborted) {
				throw new Error('Aborted');
			}
			const image = images[i];
			const edit = await db.query.snapshotTable.findFirst({
				where: eq(snapshotTable.id, image.id),
				orderBy: desc(snapshotTable.createdAt)
			});

			const pp3 = parsePP3(edit?.pp3 ?? '');
			const merged = applyPP3Diff(pp3, parsePP3(ExportPP3));

			console.log(`[Executor] Processing ${image.filepath}`);
			const outputPath = makeOutputPath(image, session, images.length);
			await mkdirPath(outputPath);
			await editImage(image.filepath, stringifyPP3(merged), { signal, outputPath });
		}
		console.log(`[Executor] Finished export for session: ${sessionId}`);
		return { status: 'success' };
	} catch (e: any) {
		console.error(`[Executor] Failed export for session: ${sessionId}`, e);
		return { status: 'error', message: e.message };
	}
}

function makeOutputPath(image: Image, session: Session, totalImages: number): string {
	const digits = Math.max(2, Math.ceil(Math.log10(totalImages + 1)));

	const year = image.recordedAt.getFullYear();
	const month = (image.recordedAt.getMonth() + 1).toString().padStart(2, '0');
	const day = image.recordedAt.getDate().toString().padStart(2, '0');

	const exportDir = process.env.EXPORT_DIR || '/exports';
	return join(
		exportDir,
		year.toString(),
		`${year}-${month}-${day}_${session.name}`,
		`${image.id.toString().padStart(digits, '0')}_${session.name}.jpg`
	);
}

async function mkdirPath(path: string) {
	await Bun.file(path).write('');
}
