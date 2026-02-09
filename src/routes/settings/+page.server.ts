import { getAllSettings, setSetting } from '$lib/server/db/settings';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    const settings = await getAllSettings();
    return {
        settings
    };
};

export const actions: Actions = {
    update: async ({ request }) => {
        const formData = await request.formData();
        const triageEnabled = formData.get('triage_enabled') === 'on';
        
        await setSetting('triage_enabled', triageEnabled ? 'true' : 'false');
        
        return { success: true };
    }
};
