# Edge Functions (Ziina checkout + verification)

Functions live under `supabase/functions/`. **`supabase/config.toml`** sets `verify_jwt = false` for these functions so the gateway does not reject requests before your code runs; each function still validates the user with `Authorization: Bearer <access_token>` and `auth.getUser()`.

| Function | Purpose |
|----------|---------|
| `create-ziina-payment` | Creates a Ziina Payment Intent; stores `payment_id` and `checkout_redirect_url` on the order. |
| `verify-payment` | Server-side Ziina GET + amount check; sets order `paid`, `payment_verified_at`; sends Resend confirmation email when configured. |
| `delete-user` | Super-admin only: deletes an `auth` user (and cascaded `public` rows). Called from Admin → Users. |

## Deploy (same Supabase project as `VITE_SUPABASE_URL`)

```bash
npx supabase link --project-ref <YOUR_PROJECT_REF>
npx supabase functions deploy create-ziina-payment
npx supabase functions deploy verify-payment
npx supabase functions deploy delete-user
```

After deploy, in **Dashboard → Edge Functions → [function] → Details**, confirm **Verify JWT** is off for those functions (matches `verify_jwt = false` in config).

## Secrets

Set in **Project Settings → Edge Functions → Secrets** (or `supabase secrets set`). See [.env.example](../.env.example): `ZIINA_API_KEY`, `SITE_URL`, optional `ZIINA_TEST_MODE`, `RESEND_API_KEY`, `RESEND_FROM`.
