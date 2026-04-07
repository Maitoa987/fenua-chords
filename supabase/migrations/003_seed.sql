-- supabase/migrations/003_seed.sql

-- Artists
insert into artists (id, name, slug, origin) values
  ('a1000000-0000-0000-0000-000000000001', 'Bobby Holcomb', 'bobby-holcomb', 'Tahiti'),
  ('a1000000-0000-0000-0000-000000000002', 'Angelo', 'angelo', 'Tahiti'),
  ('a1000000-0000-0000-0000-000000000003', 'Sabrina', 'sabrina', 'Tahiti'),
  ('a1000000-0000-0000-0000-000000000004', 'Te Ava Piti', 'te-ava-piti', 'Moorea'),
  ('a1000000-0000-0000-0000-000000000005', 'Coco Hotahota', 'coco-hotahota', 'Tahiti');

-- Note: songs and chord_sheets require a valid profile ID (created_by / contributed_by).
-- After your first signup, get your user ID from Supabase Auth dashboard,
-- then run these inserts replacing <YOUR_USER_ID> with your actual UUID:

-- INSERT INTO songs (title, slug, artist_id, style, original_key, created_by, status) VALUES
--   ('Purotu', 'purotu', 'a1000000-0000-0000-0000-000000000001', 'bringue', 'Am', '<YOUR_USER_ID>', 'published'),
--   ('My Bobby', 'my-bobby', 'a1000000-0000-0000-0000-000000000001', 'variete', 'C', '<YOUR_USER_ID>', 'published');

-- INSERT INTO chord_sheets (song_id, instrument, content, contributed_by) VALUES
--   ('<SONG_ID>', 'guitare', '[Am]Ia ora na [G]te here [C]nei
-- [F]Tatou e [G]haere [Am]mai', '<YOUR_USER_ID>');
