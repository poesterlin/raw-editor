import { readdir } from 'node:fs/promises';

// @ts-ignore
export const load: any = async ({ params }) => {
    let { path } = params;

    if (!path) {
        path = '/';
    }

    if (!path.startsWith('/')) {
        path = '/' + path;
    }

    // list files in the directory
   const content = await readdir(path, { withFileTypes: true });

   const folders = content.filter(item => item.isDirectory()).map(item => item.name);
   const files = content.filter(item => item.isFile()).map(item => item.name);

    return {folders, files, path};
};