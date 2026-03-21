/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Canonical site URL (e.g. https://your-app.netlify.app) for email confirmation redirects. */
  readonly VITE_SITE_URL?: string;
  /** When "true", skip Edge Function and insert a pending order (local demo only). */
  readonly VITE_DEV_LOCAL_CHECKOUT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
