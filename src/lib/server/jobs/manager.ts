import * as Comlink from 'comlink';
import { type Job, type JobId, type JobResult, JobType, type WorkerAPI } from './types';

class JobManager {
	private worker: Worker;
	private api: Comlink.Remote<WorkerAPI>;
	private activeJobs = new Set<JobId>();

	constructor() {
		this.worker = new Worker(new URL('./worker.ts', import.meta.url).href);
		this.api = Comlink.wrap<WorkerAPI>(this.worker);
		console.log('[JobManager] Initialized and worker created.');
	}

	public submit<T extends { sessionId: JobId }>(type: JobType, payload: T): { job: Job<T> } | null {
		const id = payload.sessionId;

		if (this.activeJobs.has(id)) {
			console.warn(`[JobManager] A job for session ${id} is already running.`);
			return null;
		}

		const job: Job<T> = { id, type, payload };
		this.activeJobs.add(id);

		console.log(`[JobManager] Submitting job ${id} of type ${type}`);

		(async () => {
			let res: JobResult;
			try {
				switch (type) {
					case JobType.IMPORT:
						res = await this.api.runImport(payload as any);
						break;
					case JobType.EXPORT:
						res = await this.api.runExport(payload as any);
						break;
					default:
						throw new Error(`Unknown job type: ${type}`);
				}
				console.log(`[JobManager] Job ${id} completed with status: ${res.status}`);
			} catch (e: any) {
				console.error(`[JobManager] Job ${id} failed`, e);
			} finally {
				this.activeJobs.delete(id);
			}
		})();

		return { job };
	}

	public cancel(id: JobId): void {
		if (this.activeJobs.has(id)) {
			console.log(`[JobManager] Requesting cancellation for job ${id}`);
			this.api.cancel(id);
			// The worker will handle the actual job state and cleanup.
			this.activeJobs.delete(id);
		}
	}

	public getActiveJobs() {
		return Array.from(this.activeJobs);
	}

	public terminate() {
		console.log('[JobManager] Terminating worker.');
		this.worker.terminate();
	}
}

// Export a singleton instance of the JobManager
export const jobManager = new JobManager();
