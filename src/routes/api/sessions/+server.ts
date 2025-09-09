import { db } from '$lib/server/db';
import { imageTable, sessionTable } from '$lib/server/db/schema';
import { json } from '@sveltejs/kit';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { jobManager } from '$lib/server/jobs/manager';
import { buildJSONColumn } from '$lib/server/utils';

export type SessionsResponse = {
	sessions: Array<{
		id: number;
		name: string;
		startedAt: Date;
		endedAt: Date | null;
		isImporting: boolean;
		imageCount: number;
		images: Array<{
			id: number;
			version: number;
		}>;
	}>;
	next: number | null;
};

export const GET: RequestHandler = async ({ url }) => {
	const limit = 20;
	const cursor = Number(url.searchParams.get('cursor')) || 0;

	const sessions = await db
		.select({
			id: sessionTable.id,
			name: sessionTable.name,
			startedAt: sessionTable.startedAt,
			endedAt: sessionTable.endedAt,
			imageCount: count(imageTable.id).as('imageCount'),
			images: buildJSONColumn({
				id: imageTable.id,
				version: imageTable.version,
			})
		})
		.from(sessionTable)
		.leftJoin(
			imageTable,
			and(
				eq(imageTable.sessionId, sessionTable.id),
				eq(imageTable.isArchived, false)
			)
		)
		.where(eq(sessionTable.isArchived, false))
		.groupBy(sessionTable.id)
		.orderBy(desc(sessionTable.startedAt))
		.limit(limit + 1) // Fetch one extra to check if there's a next page
		.offset(cursor);

	let nextCursor: number | null = null;
	if (sessions.length > limit) {
		sessions.pop(); // remove the extra one
		nextCursor = cursor + limit;
	}

	// The dates from the DB are Date objects, need to stringify them.
	const sessionsWithStringDates = sessions.map((s) => ({
		...s,
		isImporting: jobManager.getActiveJobs().some((job) => job === s.id)
	}));

	const response = {
		sessions: sessionsWithStringDates,
		next: nextCursor
	};

	return json(response);
};

