/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly RENDER_COUNT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
