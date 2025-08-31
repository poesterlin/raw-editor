import { db } from '$lib/server/db';
import { importTable, type Import } from '$lib/server/db/schema';
import { json, type RequestHandler } from '@sveltejs/kit';
import { and, desc, gt, isNull } from 'drizzle-orm';

const PAGE_SIZE = 20;

export interface ImportResponse {
	items: Import[];
	next: number | null;
}

export const GET: RequestHandler = async ({ url }) => {
	const cursor = Number(url.searchParams.get('cursor')) || 0;

	const items = await db.query.importTable.findMany({
		limit: PAGE_SIZE,
		where: and(gt(importTable.id, cursor), isNull(importTable.importedAt)),
		orderBy: desc(importTable.id)
	});

	let next: number | null = null;
	if (items.length === PAGE_SIZE) {
		const lastItem = items[items.length - 1];
		if (lastItem) {
			next = lastItem.id;
		}
	}

	return json({ items, next });
}
