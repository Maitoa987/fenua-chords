-- supabase/migrations/010_song_artists.sql

-- 1. Create junction table
CREATE TABLE song_artists (
  song_id    uuid REFERENCES songs(id) ON DELETE CASCADE,
  artist_id  uuid REFERENCES artists(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (song_id, artist_id)
);

CREATE INDEX idx_song_artists_artist ON song_artists(artist_id);

-- 2. Enable RLS
ALTER TABLE song_artists ENABLE ROW LEVEL SECURITY;

-- RLS: everyone can read
CREATE POLICY "Song artists are viewable by everyone"
  ON song_artists FOR SELECT USING (true);

-- RLS: non-banned authenticated users can insert
CREATE POLICY "Non-banned users can link song artists"
  ON song_artists FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND NOT public.is_banned());

-- RLS: song creator or admin can delete
CREATE POLICY "Song creator or admin can unlink artists"
  ON song_artists FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM songs WHERE songs.id = song_artists.song_id AND songs.created_by = auth.uid())
    OR public.is_admin()
  );

-- RLS: admin can do anything
CREATE POLICY "Admins can manage song artists"
  ON song_artists FOR ALL
  USING (public.is_admin());

-- 3. Migrate existing data
INSERT INTO song_artists (song_id, artist_id)
  SELECT id, artist_id FROM songs WHERE artist_id IS NOT NULL;

-- 4. Drop old column and index
DROP INDEX IF EXISTS idx_songs_artist;
ALTER TABLE songs DROP COLUMN artist_id;

-- 5. Update merge_artists function
CREATE OR REPLACE FUNCTION public.merge_artists(source_id uuid, target_id uuid)
RETURNS void AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  -- Transfer links, skip duplicates
  INSERT INTO song_artists (song_id, artist_id)
    SELECT song_id, target_id FROM song_artists WHERE artist_id = source_id
    ON CONFLICT DO NOTHING;
  -- Remove old links
  DELETE FROM song_artists WHERE artist_id = source_id;
  -- Delete source artist
  DELETE FROM artists WHERE id = source_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
