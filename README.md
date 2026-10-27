# LMR ❤️ SHASHA — Our Love Songs

Mobile-first romantic music website hosted on GitHub Pages.

## Supabase setup
The Supabase project schema and storage buckets have been created for:
- `songs`: song metadata
- `messages`: moderated Love Notes
- `songs` and `covers` Storage buckets

Admin email configured in the database policy: `unicohijo87@gmail.com`.
Artist display name: `LMR`.

## Important next integration step
The browser files must use the Supabase project URL and publishable key, and the Admin page must authenticate with Supabase Auth for `unicohijo87@gmail.com`. Never put a Supabase secret/service-role key in client-side files.

Public song files and covers are readable. Only an authenticated session whose verified email is the configured admin can upload/delete music or moderate messages. Public Love Notes are submitted pending approval.

Website: https://lmrluistro.github.io/lmr-shasha-music/
Repository: https://github.com/lmrluistro/lmr-shasha-music
