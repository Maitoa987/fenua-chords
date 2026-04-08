-- Add role and ban columns to profiles
alter table profiles add column if not exists role text not null default 'user';
alter table profiles add column if not exists is_banned boolean not null default false;

create index if not exists idx_profiles_role on profiles(role);

-- Helper: check if current user is admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer stable;

-- Helper: check if current user is banned
create or replace function public.is_banned()
returns boolean as $$
begin
  return exists (
    select 1 from profiles where id = auth.uid() and is_banned = true
  );
end;
$$ language plpgsql security definer stable;

-- Admin RLS policies
create policy "Admins can view all songs" on songs for select using (public.is_admin());
create policy "Admins can delete any song" on songs for delete using (public.is_admin());
create policy "Admins can update any song" on songs for update using (public.is_admin());
create policy "Admins can delete any chord sheet" on chord_sheets for delete using (public.is_admin());
create policy "Admins can update any profile" on profiles for update using (public.is_admin());
create policy "Admins can delete any artist" on artists for delete using (public.is_admin());
create policy "Admins can update any artist" on artists for update using (public.is_admin());

-- Replace insert policies with ban check
drop policy if exists "Authenticated users can create songs" on songs;
create policy "Non-banned users can create songs"
  on songs for insert with check (auth.role() = 'authenticated' and not public.is_banned());

drop policy if exists "Authenticated users can create chord sheets" on chord_sheets;
create policy "Non-banned users can create chord sheets"
  on chord_sheets for insert with check (auth.role() = 'authenticated' and not public.is_banned());

drop policy if exists "Authenticated users can create artists" on artists;
create policy "Non-banned users can create artists"
  on artists for insert with check (auth.role() = 'authenticated' and not public.is_banned());

-- RPC: merge two artists
create or replace function public.merge_artists(source_id uuid, target_id uuid)
returns void as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  update songs set artist_id = target_id where artist_id = source_id;
  delete from artists where id = source_id;
end;
$$ language plpgsql security definer;
