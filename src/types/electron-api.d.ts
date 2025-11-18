declare global {
  interface Window {
    api?: {
      startSystemCapture: () => Promise<void>
      stopSystemCapture: () => Promise<void>
    }
  }
}

export {}

