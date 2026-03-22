-- Payment gateway (Ziina) removed from the app; drop ledger table if present.
drop table if exists public.payments cascade;
