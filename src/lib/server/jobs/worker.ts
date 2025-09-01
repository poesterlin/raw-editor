import * as Comlink from 'comlink';
import { db } from '../db';
import { editImage } from '$lib/server/image-editor';
import ImportPP3 from '$lib/assets/import.pp3?raw';
import type { ExportPayload, ImportPayload, JobId, JobResult, WorkerAPI } from './types';
import { desc, eq } from 'drizzle-orm';
import { editTable, imageTable } from '../db/schema';

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

		console.log(`[Worker] Starting export for session: ${sessionId}`);
		try {
			const images = await db.query.imageTable.findMany({
				where: eq(imageTable.sessionId, sessionId)
			});

			for (const image of images) {
				const edit = await db.query.editTable.findFirst({
					where: eq(editTable.id, image.id),
					orderBy: desc(editTable.createdAt)
				});

				if (!edit) {
					console.warn(`[Worker] No edit found for image ${image.id}`);
					continue;
				}

				console.log(`[Worker] Processing ${image.filepath}`);
				await editImage(image.filepath, edit.pp3, { signal: controller.signal });
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
