/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Canonical site URL (e.g. https://your-app.netlify.app) for email confirmation redirects. */
  readonly VITE_SITE_URL?: string;
  /** When true, Ziina checkout runs in test mode (same pattern as pro-run-store). */
  readonly VITE_PAYMENT_TEST_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
