import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { Glob } from 'bun';
import { makeSessionPath } from '$lib/server/jobs/executor';
import { eq } from 'drizzle-orm';
import { sessionTable } from '$lib/server/db/schema';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ params }) => {
	const sessionId = Number(params.session);

	const session = await db.query.sessionTable.findFirst({
		where: eq(sessionTable.id, sessionId)
	});

	if (!session) {
		error(404, { message: `Session with ID ${sessionId} not found.` });
	}

	const imagePaths = new Glob(`*.jpg`).scan({ cwd: makeSessionPath(session) });
	const images =  await Array.fromAsync(imagePaths);

	return {
		session,
		images
	};
};
