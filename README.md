# LMR ❤️ SHASHA — Mobile Music Website

A mobile-first romantic music player with playlist management and a listener message wall.

## Files
- `index.html` — public music player and message wall
- `admin.html` — admin interface to upload songs and moderate messages
- `styles.css` — responsive dark romantic theme
- `app.js`, `admin.js` — player, playlist, and message logic
- `supabase-setup.sql` — database schema and access policies

## Preview mode vs. shared website
The site can be opened as a local preview, but local preview data is stored only in that browser and is not shared with listeners. For the live website, connect Supabase and follow the setup below. Do not treat preview mode as a production message board.

## Set up a shared library and public message wall
1. Create a project at https://supabase.com/ .
2. In Supabase, open **SQL Editor** and run all contents of `supabase-setup.sql`.
3. In **Storage**, create two public buckets named `songs` and `covers`. Public access is needed so listeners can play audio and view cover art. Keep upload/delete operations restricted to authenticated admin users.
4. In **Authentication → Providers**, enable Email. Create your own admin user. Disable public signups if you don't want anyone creating accounts.
5. In `app.js`, fill `SUPABASE_URL` and `SUPABASE_ANON_KEY` using the project's URL and publishable/anon key.
6. In `admin.js`, fill `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `ADMIN_EMAIL` with the same project values and your exact admin email.
7. In the SQL editor, replace `admin@example.com` in the `is_site_admin()` function with your admin email, then re-run that function definition. Ensure the admin account exists in Authentication.
8. Deploy the files to Netlify by dragging the project folder into Netlify Drop or connecting a Git repository. Netlify serves the HTML/CSS/JS files; Supabase handles shared data and storage.
9. Test from a phone using mobile data, not only the same computer/browser. Test adding a song, posting a message, approving it, and deleting it.

### Security notes
- Never put the Supabase `service_role` key in HTML or JavaScript. Use only the publishable/anon key in the browser.
- The SQL policies allow anyone to submit a message, but public visitors can only read approved messages. Only your configured admin can approve/delete messages and manage the song catalog.
- Public message forms can attract spam. Add CAPTCHA/rate limiting before widely sharing the website. The starter does not include a CAPTCHA.
- Public audio and image URLs can be accessed by anyone who has them. Upload only audio and artwork you have rights to share.
- The like feature uses a simple browser-side guard; it is not strong anti-abuse protection.

## Important limitations
- Audio playback is controlled by the mobile browser; the visitor usually must tap Play.
- Large audio files can make mobile loading slow and use storage/bandwidth quotas. Prefer compressed MP3 files.
- If your Supabase project has different policy defaults, verify policies in the dashboard before publishing.
