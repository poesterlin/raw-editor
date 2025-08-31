import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { ImportResponse } from '../api/imports/+server';
import { db } from '$lib/server/db';
import { imageTable, importTable, sessionTable, type Image } from '$lib/server/db/schema';
import { inArray } from 'drizzle-orm';

export const load: PageServerLoad = async ({ fetch }) => {
	const response = await fetch('/api/imports');

	if (!response.ok) {
		throw error(response.status, 'Could not fetch import sessions');
	}

	const initialData = await response.json() as ImportResponse;
	return initialData;
}


export const actions: Actions = {
	"start-session": async ({ request }) => {
		const { name, importIds } = await request.json();

		if (!name || !Array.isArray(importIds) || importIds.length === 0) {
			return fail(400, 'Missing name or importIds');
		}

		await db.transaction(async (tx) => {
			const [session] = await tx
				.insert(sessionTable)
				.values({ name, startedAt: new Date() })
				.returning();

			if (!session) {
				tx.rollback();
				return;
			}

			const importsToProcess = await tx.query.importTable.findMany({
				where: inArray(importTable.id, importIds)
			});

			if (importsToProcess.length !== importIds.length) {
				tx.rollback();
				return;
			}

			const newImages = importsToProcess.map((imp) => ({
				createdAt: new Date(),
				updatedAt: new Date(),
				filename: "",
				sessionId: session.id,
			}));

			await tx.insert(imageTable).values(newImages);

			await tx.update(importTable).set({ importedAt: new Date() }).where(inArray(importTable.id, importIds));

			return session;
		});

	}
};