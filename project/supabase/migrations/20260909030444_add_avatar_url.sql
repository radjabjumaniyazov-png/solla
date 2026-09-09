/*
# Add avatar_url column to users table

1. Overview
Adds an `avatar_url` column to the `users` table so users can set a profile photo
(via a URL to a stock image or uploaded data URL). This column is nullable — users
who haven't set a photo will fall back to the colored-initials avatar.

2. Modified Tables
- `users`: added `avatar_url` (text, nullable) column

3. Security
- No RLS policy changes needed. The existing `anon_update_users` policy already
  allows updates to the users table, and the existing `anon_select_users` policy
  already allows reads. The new column is covered by these existing policies
  since they are row-level (not column-level).

4. Important Notes
- The column is nullable so existing user rows are unaffected.
- Profile photo URLs are stored as text. The frontend will use either a
  Pexels stock photo URL or a base64 data URL from a file upload.
*/

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;