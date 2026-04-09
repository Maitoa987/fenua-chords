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
  style: Style
  language: string | null
  original_key: string | null
  bpm: number | null
  youtube_url: string | null
  created_by: string
  status: SongStatus
  created_at: string
  likes_count: number
}

export interface SongArtist {
  song_id: string
  artist_id: string
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
  updated_at: string
  last_edited_by: string | null
}

export interface Playlist {
  id: string
  owner_id: string
  title: string
  description: string | null
  visibility: Visibility
  share_token: string
  created_at: string
  updated_at: string
}

export interface PlaylistSong {
  id: string
  playlist_id: string
  song_id: string
  position: number
  added_at: string
}

export interface PlaylistFollow {
  id: string
  follower_id: string
  playlist_id: string
  followed_at: string
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

export interface Like {
  id: string
  user_id: string
  song_id: string
  created_at: string
}

export type SuggestionType = 'correction_artiste' | 'fusion_artiste' | 'correction_chanson' | 'signalement'
export type SuggestionStatus = 'pending' | 'accepted' | 'rejected'

export interface Suggestion {
  id: string
  user_id: string
  type: SuggestionType
  target_type: 'artist' | 'song' | 'chord_sheet'
  target_id: string
  message: string
  status: SuggestionStatus
  admin_note: string | null
  created_at: string
  resolved_at: string | null
}

export interface ChordSheetRevision {
  id: string
  chord_sheet_id: string
  content: string
  instrument: Instrument
  tuning: string | null
  capo: number | null
  edited_by: string
  created_at: string
}
