# Portal upgrade: setup (browser only, no terminal)

## 1. Database (Supabase > SQL Editor)
Paste all of `supabase-portal.sql`, press Run. Safe to run again.

## 2. Secrets (Supabase > Edge Functions > Secrets)
Add each: `INTASEND_PUBLIC_KEY` (start with the SANDBOX key), `INTASEND_CHALLENGE` (any long random text you invent),
`INTASEND_LIVE` = `false` (change to `true` only after a sandbox test passes), `SITE_URL` = `https://topjobsseekers.com`,
`WEBHOOK_SECRET` (another long random text), `RESEND_API_KEY` (you already have this from CV emails).

## 3. Three functions (Supabase > Edge Functions > Deploy a new function > Via Editor)
Name each exactly, paste the code from the matching file under `supabase/functions/`, press Deploy:
- `create-payment`: leave "Verify JWT" ON
- `payment-webhook`: turn "Verify JWT" OFF
- `send-job-alert`: turn "Verify JWT" OFF

## 4. IntaSend
In your IntaSend (sandbox) dashboard add a webhook with URL
`https://oqptvdxnooyhkfszddsc.supabase.co/functions/v1/payment-webhook` and the same challenge text you used above.
Make a small test payment. Only after it shows "complete" in the portal, switch to live keys and `INTASEND_LIVE=true`.

## 5. Email alerts (Supabase > Database > Webhooks > Create)
Table `notifications`, event `Insert`, type HTTP Request (POST), URL
`https://oqptvdxnooyhkfszddsc.supabase.co/functions/v1/send-job-alert`, add header `x-webhook-secret` = your WEBHOOK_SECRET.

## 6. Upload to GitHub (repo TOPJOBS > Add file > Upload files)
New: `extras.css`, `extras.js`, `supabase-portal.sql`. Changed: `index.html`, `login.html`, `dashboard.html`, `auth.js`.
(The `supabase/functions` folder is only for copying code into step 3.)

## How it behaves
- Only the webhook can change a payment's status; clients can only read their own payments, applications and notifications.
- Job alerts match a job's location/country to the client's "where do you want to work", or its title/category to "what work do you do".
- Payouts: Dashboard (admin) > Payments & payouts. Log, then Approve. Approving records your decision; it does not send money by itself.

## Google sign-in + M-Pesa withdrawals (latest update)
1. **Google Cloud Console** > APIs & Services > Credentials > Create OAuth client ID (Web application).
   Authorised redirect URI: `https://oqptvdxnooyhkfszddsc.supabase.co/auth/v1/callback`. Copy the Client ID and Client Secret.
2. **Supabase** > Authentication > Providers > Google: switch on, paste Client ID + Secret, Save.
3. **Supabase** > Authentication > URL Configuration: Site URL `https://topjobsseekers.com`; add `https://topjobsseekers.com/dashboard.html` to Redirect URLs.
4. **Supabase > SQL Editor**: paste all of `supabase-withdrawals.sql`, press Run (safe to re-run).
5. **site-config.js**: fill the `social` list with your links (and `img` paths if you upload your own icons to `images/social/`).
6. Upload to GitHub: `login.html`, `auth.js`, `extras.js`, `extras.css`, `site-config.js`, `supabase-withdrawals.sql`.

Withdrawals: the client's money is held the moment they request. In Dashboard (admin) > Payments & payouts > Withdrawal requests:
Approve, send the M-Pesa yourself, then press Mark paid. Reject returns the money to the client automatically.
