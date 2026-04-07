-- supabase/migrations/001_schema.sql

-- Enums
create type style as enum ('bringue', 'himene', 'variete', 'traditionnel', 'autre');
create type instrument as enum ('guitare', 'ukulele', 'basse', 'ukulele-bass');
create type song_status as enum ('draft', 'published');

-- Profiles (auto-created on signup)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  bio text,
  created_at timestamptz default now() not null
);

-- Artists
create table artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  origin text,
  bio text,
  created_at timestamptz default now() not null
);

-- Songs
create table songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  artist_id uuid references artists(id) on delete cascade not null,
  style style not null default 'autre',
  language text,
  original_key text,
  bpm smallint,
  youtube_url text,
  created_by uuid references profiles(id) not null,
  status song_status not null default 'published',
  created_at timestamptz default now() not null
);

-- Chord sheets
create table chord_sheets (
  id uuid primary key default gen_random_uuid(),
  song_id uuid references songs(id) on delete cascade not null,
  instrument instrument not null default 'guitare',
  tuning text,
  capo smallint default 0,
  content text not null,
  contributed_by uuid references profiles(id) not null,
  votes_up integer default 0 not null,
  votes_down integer default 0 not null,
  is_official boolean default false not null,
  created_at timestamptz default now() not null
);

-- Indexes
create index idx_songs_artist on songs(artist_id);
create index idx_songs_slug on songs(slug);
create index idx_artists_slug on artists(slug);
create index idx_chord_sheets_song on chord_sheets(song_id);
create index idx_songs_style on songs(style);

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
