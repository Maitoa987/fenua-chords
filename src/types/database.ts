export type UserRole = 'user' | 'admin'
export type Style = 'bringue' | 'himene' | 'variete' | 'traditionnel' | 'autre'
export type Instrument = 'guitare' | 'ukulele' | 'basse' | 'ukulele-bass'
export type Visibility = 'private' | 'link' | 'public'
export type SongStatus = 'draft' | 'published'
export type VoteValue = 1 | -1

export interface Profile {
  id: string
  username: string
  avatar_url: string | null
  bio: string | null
  first_name: string | null
  last_name: string | null
  role: UserRole
  is_banned: boolean
  created_at: string
}

export interface Artist {
  id: string
  name: string
  slug: string
  origin: string | null
  bio: string | null
  created_at: string
}

export interface Song {
  id: string
  title: string
  slug: string
  artist_id: string
  style: Style
  language: string | null
  original_key: string | null
  bpm: number | null
  youtube_url: string | null
  created_by: string
  status: SongStatus
  created_at: string
}

export interface ChordSheet {
  id: string
  song_id: string
  instrument: Instrument
  tuning: string | null
  capo: number | null
  content: string
  contributed_by: string
  votes_up: number
  votes_down: number
  is_official: boolean
  created_at: string
}

export interface Playlist {
  id: string
  title: string
  owner_id: string
  visibility: Visibility
  share_token: string | null
  created_at: string
}

export interface PlaylistSong {
  id: string
  playlist_id: string
  song_id: string
  position: number
}

export interface ChordVote {
  id: string
  chord_sheet_id: string
  user_id: string
  value: VoteValue
}

export interface Favorite {
  id: string
  user_id: string
  song_id: string
  created_at: string
}
