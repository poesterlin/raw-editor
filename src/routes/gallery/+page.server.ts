import type { SessionsResponse } from "../api/sessions/+server";
import type { PageServerLoad } from "./$types";

// function minimumDate(dates: Array<Date | undefined>): Date | null {
//     if (dates.length === 0) return null;
//     return new Date(Math.min(...dates.map(d => d?.getTime() ?? Infinity)));
// }

export const load: PageServerLoad = async ({ fetch }) => {
    const req = await fetch('/api/sessions');

    // fix session min dates
    // const allSessions = await db.select().from(sessionTable);
    // for (const session of allSessions) {
    //     const images = await db.select().from(imageTable).where(eq(imageTable.sessionId, session.id));
    //     const minDate = minimumDate(images.map(ni => ni.recordedAt));

    //     if (minDate) {
    //         if (session && session.startedAt > minDate) {
    //             await db.update(sessionTable).set({ startedAt: minDate }).where(eq(sessionTable.id, session.id));
    //         }
    //     }
    // }

    return await req.json() as SessionsResponse;
};