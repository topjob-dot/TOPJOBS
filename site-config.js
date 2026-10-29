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
  whatsappChannelUrl: 'https://whatsapp.com/channel/0029Vb9CMNOIt5rr2BQxAl3T',
  whatsappGroupUrl:   'https://chat.whatsapp.com/JeNywnvbiD0JTxEd2T0LVD',

  // Job feed mix on the "All jobs" tab: 4 Kenyan jobs for every 1 international = 80 / 20
  kenyaShare: 4,
  intlShare: 1,
  pageSize: 12,           // jobs shown before "Show more"

  sendApplicationUrl: SUPABASE_URL + '/functions/v1/smooth-service',
};
