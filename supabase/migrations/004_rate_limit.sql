-- Rate limit function: checks if user has exceeded max inserts per hour
create or replace function public.check_rate_limit(user_uuid uuid, max_per_hour int default 10)
returns boolean as $$
declare
  recent_count int;
begin
  select count(*) into recent_count
  from songs
  where created_by = user_uuid
    and created_at > now() - interval '1 hour';

  return recent_count < max_per_hour;
end;
$$ language plpgsql security definer;
