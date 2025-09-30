export type JobId = number;

export enum JobType {
	IMPORT = 'import',
	EXPORT = 'export'
}

export interface Job<T> {
	id: JobId;
	type: JobType;
	payload: T;
}

export interface ImportPayload {
	sessionId: JobId;
}

export interface ExportPayload {
	sessionId: JobId;
}

export interface JobResult {
	status: 'success' | 'error';
	message?: string;
}


