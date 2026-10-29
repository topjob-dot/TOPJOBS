# TOPJOBSEEKERS — setup after this update

Do these once, in order (about 15 minutes).

## 1. Database  (Supabase → SQL Editor)
Paste and run **`supabase-setup.sql`**. It adds the Kenya/International field, the placements table + photo bucket,
and switches off every job that came from Jooble. Safe to run again.

## 2. Your links  (`site-config.js`)
- Paste your real **WhatsApp channel** and **group** links (instructions are in the file). Until then the buttons open a chat with +254 748801685.
- `kenyaShare: 4, intlShare: 1` is the 80/20 mix. Change to 3 / 1 for 75/25, etc.

## 3. Email for CVs  (Edge Function `send-application`)
1. Make a free account at resend.com and create an API key.
2. In a terminal inside this project:
   ```
   supabase functions deploy send-application --no-verify-jwt
   supabase secrets set RESEND_API_KEY=re_your_key
   ```
3. Without a verified domain Resend only delivers to the email you signed up to Resend with, so sign up with topjobsseekers@gmail.com.
   To send from your own domain later: verify it in Resend, then `supabase secrets set FROM_EMAIL="TOPJOBSEEKERS <jobs@yourdomain.com>"`.
4. If you previously set up a Database Webhook on `cv_submissions` that emails you, delete it, otherwise you get two emails per application.

Every application is also saved in `cv_submissions` + the `cvs` bucket, so nothing is lost if email ever fails.

## 4. Auto-fetch Kenyan jobs  (Edge Function `sync-external-jobs`, replaces Jooble)
```
supabase functions deploy sync-external-jobs --no-verify-jwt
supabase secrets set SYNC_SECRET=pick-a-long-random-string
```
- Dashboard → **Manage Jobs → Fetch Kenyan jobs now** runs it on demand.
- For automatic runs every 6 hours, uncomment the `cron.schedule` block at the bottom of `supabase-setup.sql`.
- **Feeds:** it reads RSS feeds. Defaults are in the file (`DEFAULT_FEEDS`), and I could not test them live. Open each URL in your browser: if you see XML with `<item>` entries it works. To use different Kenyan sites:
  `supabase secrets set JOB_FEEDS='["https://site-one.co.ke/feed/","https://site-two.co.ke/feed/"]'`
  Only use sites that allow republishing their listings. Each imported job shows its source and links to the original.
- Auto-fetched jobs are never edited or deleted by your manual posts, and vice versa.

## 5. Chatbot  (Edge Function `chat-assistant`)
```
supabase functions deploy chat-assistant --no-verify-jwt
supabase secrets set GEMINI_API_KEY=your-gemini-key
supabase functions logs chat-assistant
```
The `--no-verify-jwt` flag is required (the website sends no login token). If the bot ever says it is having trouble, the logs now say exactly why (bad key, no credit, etc.).
The functions now live in `supabase/functions/<name>/index.ts`, which is the folder layout the Supabase CLI expects.

## Daily use  (Dashboard, logged in as admin)
- **Post a Job**: choose Kenya or International; fill what you know. Anything left empty is auto-filled on the site.
- **Manage Jobs**: hide or delete any job, including auto-fetched ones.
- **Successful Placements**: add photo + name + role + country. The section stays hidden on the site until you add the first one.

## Appearance update (header, hot alerts, legal pages)
1. **Run `supabase-setup.sql` again** (adds the Hot Alert columns). Safe to re-run.
2. Upload ALL changed files to GitHub, including the new ones: `polish.css`, `ui.js`, `consent.js`, `terms.html`, `cookie-policy.html`, `images/README.txt`.
3. **Your pictures:** see `images/README.txt` for the exact file names. Upload to the `images` folder in GitHub. Until then the site shows flags from the web and hides empty category image areas.
4. **Hot Alerts:** Dashboard → "Post a Hot Alert". It shows at the top of the site and leaves the strip when its time is up.
5. In `site-config.js`: set `agencyLicence` to your real licence number to show a licence badge in the footer (leave it empty to show none).
