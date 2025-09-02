import * as Comlink from 'comlink';
import { db } from '$lib/server/db';
import { editImage } from '$lib/server/image-editor';
import ImportPP3 from '$lib/assets/import.pp3?raw';
import ExportPP3 from '$lib/assets/export.pp3?raw';
import type { ExportPayload, ImportPayload, JobId, JobResult, WorkerAPI } from './types';
import { desc, eq } from 'drizzle-orm';
import { editTable, imageTable, sessionTable, type Image, type Session } from '../db/schema';
import { applyPP3Diff, parsePP3, stringifyPP3 } from '$lib/pp3-utils';
import { join } from 'path';

const activeJobControllers = new Map<JobId, AbortController>();

const workerApi: WorkerAPI = {
	async runImport(payload: ImportPayload): Promise<JobResult> {
		const { sessionId } = payload;
		const controller = new AbortController();
		activeJobControllers.set(sessionId, controller);

		const images = await db.query.imageTable.findMany({
			where: eq(imageTable.sessionId, sessionId)
		});

		console.log(`[Worker] Starting import for session: ${sessionId}`);
		try {
			for (const image of images) {
				console.log(`[Worker] Processing ${image.filepath}`);
				const output = await editImage(image.filepath, ImportPP3, { signal: controller.signal, allowConcurrent: true, bitDepth: 16 });
				await db.update(imageTable).set({ previewPath: output }).where(eq(imageTable.id, image.id));
			}
			console.log(`[Worker] Finished import for session: ${sessionId}.`);
			return { status: 'success' };
		} catch (e: any) {
			console.error(`[Worker] Failed import for session: ${sessionId}`, e);
			return { status: 'error', message: e.message };
		} finally {
			activeJobControllers.delete(sessionId);
		}
	},

	async runExport(payload: ExportPayload): Promise<JobResult> {
		const { sessionId } = payload;
		const controller = new AbortController();
		activeJobControllers.set(sessionId, controller);

		const session = await db.query.sessionTable.findFirst({ where: eq(sessionTable.id, sessionId) });

		if (!session) {
			console.error(`[Worker] Session not found for export: ${sessionId}`);
			return { status: 'error', message: 'Session not found' };
		}

		console.log(`[Worker] Starting export for session: ${sessionId}`);
		try {
			const images = await db.query.imageTable.findMany({
				where: eq(imageTable.sessionId, sessionId)
			});

			for (let i = 0; i < images.length; i++) {
				const image = images[i];
				const edit = await db.query.editTable.findFirst({
					where: eq(editTable.id, image.id),
					orderBy: desc(editTable.createdAt)
				});

				const pp3 = parsePP3(edit?.pp3 ?? "");
				const merged = applyPP3Diff(pp3, parsePP3(ExportPP3));

				console.log(`[Worker] Processing ${image.filepath}`);
				const outputPath = makeOutputPath(image, session, images.length);
				await mkdirPath(outputPath);
				await editImage(image.filepath, stringifyPP3(merged), { signal: controller.signal, outputPath });
			}
			console.log(`[Worker] Finished export for session: ${sessionId}`);
			return { status: 'success' };
		} catch (e: any) {
			console.error(`[Worker] Failed export for session: ${sessionId}`, e);
			return { status: 'error', message: e.message };
		} finally {
			activeJobControllers.delete(sessionId);
		}
	},

	async cancel(jobId: JobId) {
		const controller = activeJobControllers.get(jobId);
		if (controller) {
			console.log(`[Worker] Cancelling job ${jobId}`);
			controller.abort();
			activeJobControllers.delete(jobId);
		}
	}
};

Comlink.expose(workerApi);

function makeOutputPath(image: Image, session: Session, totalImages: number): string {
	const digits = Math.max(2, Math.ceil(Math.log10(totalImages + 1)));

	const year = image.recordedAt.getFullYear();
	const month = (image.recordedAt.getMonth() + 1).toString().padStart(2, '0');
	const day = image.recordedAt.getDate().toString().padStart(2, '0');

	const exportDir = process.env.EXPORT_DIR || "/exports";
	return join(
		exportDir,
		year.toString(),
		`${year}-${month}-${day}_${session.name}`,
		`${image.id.toString().padStart(digits, '0')}_${session.name}.jpg`
	);
}

async function mkdirPath(path: string) {
	await Bun.file(path).write("");
}