import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Vitest's `test.globals` is off, so Testing Library's auto-cleanup never registers; do it explicitly.
afterEach(() => cleanup())

// jsdom has no ResizeObserver; recharts' ResponsiveContainer needs one to mount.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
}
