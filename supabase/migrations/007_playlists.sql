-- supabase/migrations/007_playlists.sql

-- Enum for playlist visibility
create type playlist_visibility as enum ('private', 'link', 'public');

-- Playlists table
create table playlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null check (char_length(title) <= 100),
  description text,
  visibility playlist_visibility not null default 'private',
  share_token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint one_playlist_per_user unique (owner_id)
);

-- Playlist songs (ordered)
create table playlist_songs (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references playlists(id) on delete cascade,
  song_id uuid not null references songs(id) on delete cascade,
  position integer not null,
  added_at timestamptz not null default now(),
  constraint unique_song_per_playlist unique (playlist_id, song_id)
);

-- Playlist follows
create table playlist_follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references profiles(id) on delete cascade,
  playlist_id uuid not null references playlists(id) on delete cascade,
  followed_at timestamptz not null default now(),
  constraint unique_follow unique (follower_id, playlist_id)
);

-- Indexes
create index idx_playlist_songs_playlist on playlist_songs(playlist_id);
create index idx_playlist_songs_position on playlist_songs(playlist_id, position);
create index idx_playlist_follows_follower on playlist_follows(follower_id);
create index idx_playlists_share_token on playlists(share_token);

-- Auto-update updated_at
create or replace function update_playlist_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger playlist_updated_at
  before update on playlists
  for each row execute function update_playlist_updated_at();

-- RLS
alter table playlists enable row level security;
alter table playlist_songs enable row level security;
alter table playlist_follows enable row level security;

-- Playlists policies
create policy "Owner can do everything with own playlist"
  on playlists for all using (auth.uid() = owner_id);

create policy "Anyone can view public playlists"
  on playlists for select using (visibility = 'public');

create policy "Anyone can view link-shared playlists"
  on playlists for select using (visibility = 'link');

-- Playlist songs policies
create policy "Owner can manage playlist songs"
  on playlist_songs for all using (
    exists (
      select 1 from playlists
      where playlists.id = playlist_songs.playlist_id
      and playlists.owner_id = auth.uid()
    )
  );

create policy "Anyone can view songs of accessible playlists"
  on playlist_songs for select using (
    exists (
      select 1 from playlists
      where playlists.id = playlist_songs.playlist_id
      and playlists.visibility in ('public', 'link')
    )
  );

-- Playlist follows policies
create policy "Users can manage own follows"
  on playlist_follows for all using (auth.uid() = follower_id);

create policy "Anyone can see follow counts"
  on playlist_follows for select using (true);
