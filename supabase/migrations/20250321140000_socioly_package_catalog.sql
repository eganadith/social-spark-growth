-- Socioly: platform-specific package names; premium badge only on 100K tier (not 50K).

update public.packages
set name = 'Starter Boost', popular = false, premium = false
where platform = 'instagram' and followers = 2000;

update public.packages
set name = 'Growth Pack', popular = false, premium = false
where platform = 'instagram' and followers = 5000;

update public.packages
set name = 'Influencer Pack', popular = true, premium = false
where platform = 'instagram' and followers = 10000;

update public.packages
set name = 'Viral Boost', popular = false, premium = false
where platform = 'instagram' and followers = 50000;

update public.packages
set name = 'Celebrity Pack', popular = false, premium = true
where platform = 'instagram' and followers = 100000;

update public.packages
set name = 'Starter Boost', popular = false, premium = false
where platform = 'facebook' and followers = 2000;

update public.packages
set name = 'Growth Pack', popular = false, premium = false
where platform = 'facebook' and followers = 5000;

update public.packages
set name = 'Page Growth Pro', popular = true, premium = false
where platform = 'facebook' and followers = 10000;

update public.packages
set name = 'Viral Reach', popular = false, premium = false
where platform = 'facebook' and followers = 50000;

update public.packages
set name = 'Authority Page', popular = false, premium = true
where platform = 'facebook' and followers = 100000;

update public.packages
set name = 'Starter Boost', popular = false, premium = false
where platform = 'tiktok' and followers = 2000;

update public.packages
set name = 'Growth Pack', popular = false, premium = false
where platform = 'tiktok' and followers = 5000;

update public.packages
set name = 'Creator Pack', popular = true, premium = false
where platform = 'tiktok' and followers = 10000;

update public.packages
set name = 'Viral Push', popular = false, premium = false
where platform = 'tiktok' and followers = 50000;

update public.packages
set name = 'Trending Star', popular = false, premium = true
where platform = 'tiktok' and followers = 100000;
