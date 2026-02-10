

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

class AppState {
    toasts = $state<Toast[]>([]);

    addToast(message: string, type: 'success' | 'error' | 'info') {
        // crypto.randomUUID() is not available in all contexts
        const id = Math.random().toString(36).substring(2, 9);
        const toast = { id, message, type };
        this.toasts.push(toast);

        setTimeout(() => {
            this.toasts.shift();
        }, 3000);
    }
}

export const app = new AppState();
