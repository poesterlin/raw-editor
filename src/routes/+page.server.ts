import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
    return { images: ["1234"] };
};
