import type { ImageWorker } from "./worker";
import Worker from '$lib/worker?worker';
import { wrap } from 'comlink';

// place files you want to import through the `$lib` alias in this folder.
export function throttle<T extends (...args: any[]) => void>(func: T, delay: number): T {
    let lastCall = 0;
    return function (...args: any[]) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            return func(...args);
        }
    } as T;
}

export function assert<T>(condition: T | undefined | null, message?: string): asserts condition is T {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

export function uniqueArray<T>(array: T[]): T[] {
    return Array.from(new Set(array));
}


let workerInstance: ImageWorker | null = null;

export function getWorkerInstance(): ImageWorker {
    if (workerInstance) {
        return workerInstance;
    }

    const instance = new Worker();
    workerInstance = wrap<ImageWorker>(instance);
    return workerInstance;
}

export function clamp(v: number, lo: number, hi: number) {
    return Math.min(hi, Math.max(lo, v));
}
export function map(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
}