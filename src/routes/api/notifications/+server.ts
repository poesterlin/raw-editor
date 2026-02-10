import {
	appendNotification,
	clearNotifications,
	getNotifications,
	markAllNotificationsRead,
	type NotificationType
} from '$lib/server/notifications';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
	const notifications = await getNotifications();
	return json({ notifications });
};

export const POST: RequestHandler = async ({ request }) => {
	const payload = await request.json().catch(() => null);
	const message = payload?.message;
	const type = payload?.type as NotificationType | undefined;

	if (
		typeof message !== 'string' ||
		(message.length === 0 || message.length > 500) ||
		(type !== 'success' && type !== 'error' && type !== 'info')
	) {
		throw error(400, 'Invalid notification payload');
	}

	const notification = await appendNotification(message, type);
	return json({ notification }, { status: 201 });
};

export const PATCH: RequestHandler = async () => {
	const notifications = await markAllNotificationsRead();
	return json({ notifications });
};

export const DELETE: RequestHandler = async () => {
	await clearNotifications();
	return json({ status: 'ok' });
};
