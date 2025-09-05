import { respondWithFile } from "$lib/server/utils";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({params}) => {
    let { path } = params;

    if (!path) {
        return new Response('Path is required', { status: 400 });
    }

    if (!path.startsWith('/')) {
        path = '/' + path;
    }
    
    return respondWithFile(path);
};