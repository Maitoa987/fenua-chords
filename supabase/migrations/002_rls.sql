-- supabase/migrations/002_rls.sql

alter table profiles enable row level security;
alter table artists enable row level security;
alter table songs enable row level security;
alter table chord_sheets enable row level security;

-- Profiles
create policy "Profiles are viewable by everyone"
  on profiles for select using (true);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Artists
create policy "Artists are viewable by everyone"
  on artists for select using (true);
create policy "Authenticated users can create artists"
  on artists for insert with check (auth.role() = 'authenticated');

-- Songs
create policy "Published songs are viewable by everyone"
  on songs for select using (status = 'published');
create policy "Authenticated users can create songs"
  on songs for insert with check (auth.role() = 'authenticated');
create policy "Users can update own songs"
  on songs for update using (auth.uid() = created_by);
create policy "Users can delete own songs"
  on songs for delete using (auth.uid() = created_by);

-- Chord sheets
create policy "Chord sheets are viewable by everyone"
  on chord_sheets for select using (true);
create policy "Authenticated users can create chord sheets"
  on chord_sheets for insert with check (auth.role() = 'authenticated');
create policy "Users can update own chord sheets"
  on chord_sheets for update using (auth.uid() = contributed_by);
create policy "Users can delete own chord sheets"
  on chord_sheets for delete using (auth.uid() = contributed_by);
