-- supabase/migrations/011_likes_favorites.sql

-- Likes (signal social public)
create table likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  song_id uuid references songs(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique(user_id, song_id)
);

-- Favorites (collection privée)
create table favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  song_id uuid references songs(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique(user_id, song_id)
);

-- Colonne dénormalisée sur songs
alter table songs add column likes_count integer default 0 not null;

-- Indexes
create index idx_likes_user on likes(user_id);
create index idx_likes_song on likes(song_id);
create index idx_favorites_user on favorites(user_id);
create index idx_favorites_song on favorites(song_id);
create index idx_songs_likes_count on songs(likes_count desc);

-- Trigger: maintenir likes_count
create or replace function update_likes_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update songs set likes_count = likes_count + 1 where id = NEW.song_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update songs set likes_count = likes_count - 1 where id = OLD.song_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_like_changed
  after insert or delete on likes
  for each row execute function update_likes_count();

-- RLS: likes
alter table likes enable row level security;

create policy "Likes are viewable by everyone"
  on likes for select using (true);
create policy "Authenticated users can insert own likes"
  on likes for insert with check (auth.uid() = user_id);
create policy "Users can delete own likes"
  on likes for delete using (auth.uid() = user_id);

-- RLS: favorites
alter table favorites enable row level security;

create policy "Users can view own favorites"
  on favorites for select using (auth.uid() = user_id);
create policy "Users can insert own favorites"
  on favorites for insert with check (auth.uid() = user_id);
create policy "Users can delete own favorites"
  on favorites for delete using (auth.uid() = user_id);
