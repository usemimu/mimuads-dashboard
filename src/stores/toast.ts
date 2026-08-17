import { defineStore } from 'pinia'

export type ToastKind = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: number
  message: string
  kind: ToastKind
}

interface PushOptions {
  kind?: ToastKind
  /** Auto-dismiss after this many ms. 0 keeps it until dismissed. */
  duration?: number
}

let nextId = 1

/**
 * Global toast store — ported from mimu-admin. Views/api call
 * `useToastStore().error(...)` / `.success(...)` and a single <ToastHost>
 * mounted in App.vue renders the stack. Replaces scattered inline error refs.
 */
export const useToastStore = defineStore('toast', {
  state: () => ({ items: [] as Toast[] }),
  actions: {
    push(message: string, { kind = 'info', duration = 4000 }: PushOptions = {}) {
      const id = nextId++
      this.items.push({ id, message, kind })
      if (duration > 0) window.setTimeout(() => this.dismiss(id), duration)
      return id
    },
    success(message: string, opts?: PushOptions) {
      return this.push(message, { ...opts, kind: 'success' })
    },
    error(message: string, opts?: PushOptions) {
      return this.push(message, { duration: 6000, ...opts, kind: 'error' })
    },
    info(message: string, opts?: PushOptions) {
      return this.push(message, { ...opts, kind: 'info' })
    },
    warning(message: string, opts?: PushOptions) {
      return this.push(message, { ...opts, kind: 'warning' })
    },
    dismiss(id: number) {
      this.items = this.items.filter((t) => t.id !== id)
    },
  },
})
