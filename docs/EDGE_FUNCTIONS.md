# Edge Functions

This project **does not ship Supabase Edge Functions** for checkout or payments. Orders are inserted from the browser (authenticated) into `orders` with status `pending` and a `tracking_id`.

If you add new functions later, link the CLI and deploy per [Supabase Edge Functions](https://supabase.com/docs/guides/functions).
