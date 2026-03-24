-- Set first Instagram package (Starter Boost, 2k) to 10 AED.
update public.packages
set price = 10::numeric(10, 2)
where platform = 'instagram'
  and followers = 2000;
