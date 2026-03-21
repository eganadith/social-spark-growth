/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Canonical site URL (e.g. https://your-app.netlify.app) for email confirmation redirects. */
  readonly VITE_SITE_URL?: string;
  /** Dev only: "true" = skip Ziina, pending order + track (never for real payment tests). */
  readonly VITE_MOCK_CHECKOUT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
