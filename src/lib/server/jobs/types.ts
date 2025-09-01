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

export interface WorkerAPI {
	runImport: (payload: ImportPayload) => Promise<JobResult>;
	runExport: (payload: ExportPayload) => Promise<JobResult>;
	cancel: (jobId: JobId) => Promise<void>;
}
