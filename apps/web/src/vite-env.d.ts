import 'vite/client'

declare global {
  interface ImportMetaEnv {
    readonly VITE_BACKEND_CHAT_API?: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

export {}
