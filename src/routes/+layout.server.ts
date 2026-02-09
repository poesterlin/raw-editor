import { getBooleanSetting } from '$lib/server/db/settings';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
    const triageEnabled = await getBooleanSetting('triage_enabled', true);
    return {
        triageEnabled
    };
};
