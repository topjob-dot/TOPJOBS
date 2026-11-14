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

  // 👇 PASTE YOUR INSTAGRAM PAGE LINK HERE (example: https://www.instagram.com/yourname). Until you do, every Instagram button stays hidden.
  instagramUrl: 'https://www.instagram.com/topjobsseekers?xtok=ZGpoaHN1eXZjNzg=',

  // Jobs come only from your Dashboard (Post a Job, Quick Post, Hot Alert). Leave false so any leftover
  // Jooble / auto-fetched rows in the database never show on the site.
  showAutoFetchedJobs: false,

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


  // Social icons on the login page. Leave url '' to hide an icon.
  // To use YOUR OWN icon image, upload it to images/social/ on GitHub and set img, e.g. img: 'images/social/facebook.png'
  // (leave img '' to use the built-in icon).
  social: [
    { name: 'Instagram', url: 'https://www.instagram.com/topjobsseekers?xtok=ZGpoaHN1eXZjNzg=', icon: 'fa-brands fa-instagram', img: '' },
    { name: 'Facebook',  url: '', icon: 'fa-brands fa-facebook-f', img: '' },
    { name: 'TikTok',    url: '', icon: 'fa-brands fa-tiktok',     img: '' },
    { name: 'X',         url: '', icon: 'fa-brands fa-x-twitter',  img: '' },
    { name: 'LinkedIn',  url: '', icon: 'fa-brands fa-linkedin-in',img: '' },
    { name: 'YouTube',   url: '', icon: 'fa-brands fa-youtube',    img: '' },
    { name: 'WhatsApp',  url: 'https://wa.me/254748801685', icon: 'fa-brands fa-whatsapp', img: '' },
  ],

  // Withdrawals: smallest amount a client can request (also enforced in the database, see supabase-withdrawals.sql)
  minWithdrawal: 100,

  sendApplicationUrl: SUPABASE_URL + '/functions/v1/send-application',
};
