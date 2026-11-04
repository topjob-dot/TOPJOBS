/* =====================================================================
   SITE SETTINGS — the only file you need to edit for links & mix ratio
   (loaded after supabase-config.js)
   ===================================================================== */
const SITE_CONFIG = {
  // Where every CV application is emailed (jobs with their own apply email go there too, you're BCC'd)
  agencyEmail: 'topjobsseekers@gmail.com',
  whatsappNumber: '254748801685',

  // 👇 PASTE YOUR REAL LINKS HERE.
  //   Channel: WhatsApp → Updates → your channel → Share → Copy link
  //   Group:   WhatsApp → group info → Invite via link → Copy link
  // Until you do, the buttons fall back to a normal chat with your number.
  whatsappChannelUrl: 'https://whatsapp.com/channel/YOUR_CHANNEL_ID',
  whatsappGroupUrl:   'https://chat.whatsapp.com/YOUR_GROUP_INVITE',

  // Job feed mix on the "All jobs" tab: 4 Kenyan jobs for every 1 international = 80 / 20
  kenyaShare: 4,
  intlShare: 1,
  pageSize: 12,           // jobs shown before "Show more"

  // Job ages: "3 days ago" is shown for fresh jobs. Anything older than this many days shows no age at all.
  showAgeUpToDays: 28,
  // Hide jobs older than this many days from the site entirely (0 = never hide; you can still hide jobs in the dashboard).
  hideJobsOlderThanDays: 0,

  // Show a licence badge in the footer ONLY once you fill this in, e.g. 'NEA/PVT/2026/0000'. Leave '' to show nothing.
  agencyLicence: '',

  sendApplicationUrl: SUPABASE_URL + '/functions/v1/send-application',
};
