// First-run defaults. Everything here is already public (it's on thekingmakerstudio.com or on
// every invoice), because this repo is public. Bank details and client records are NOT here:
// they come from the private seed file (seed/seed.private.json, git-ignored, `npm run seed:remote`).
//
// Prices are the live site's (assets/js/site.js KM_PRICES, checked 28 Nov 2026). From now on the
// admin's catalogue is the source of truth, and "Publish prices" writes them back to the site.

export const DEFAULT_SETTINGS: Record<string, unknown> = {
  company: {
    legalName: 'LGSA (Pty) Ltd',
    tradingAs: 'KingMaker',
    regNo: '2026/791464/07',
    address: '113 Bowling Avenue, Sandton, 2196',
    email: 'sam@thekingmakerstudio.com',
    website: 'thekingmakerstudio.com',
    whatsapp: '27794210966',
    founder: 'Sam Tshonda',
    founderTitle: 'Founder',
    maxActiveClients: 3,
  },
  bank: {
    bank: '',
    accountName: '',
    accountNo: '',
    branchCode: '',
    reference: 'your invoice number',
  },
  terms: {
    payment:
      '50% deposit before work starts; balance before hand-over. Retainer paid monthly in advance. Work pauses after 7 days overdue. Ownership of files and logins transfers on full payment.',
    validityDays: 14,
    depositPct: 50,
  },
  catalogue: {
    packages: [
      {
        id: 'squire', siteKey: 'squire', name: 'Squire', tagline: 'Get found.', price: 1900, instalments: false,
        deliverables: [
          'Logo clean-up, colours and type',
          'One-page website on your own domain',
          'WhatsApp and booking link set-up',
          'Google Business profile',
          'KM credit in footer',
        ],
        timeline: { sitdown: 'Week 1', blueprint: 'Week 1', build: 'Week 1–2', handover: 'Week 2' },
      },
      {
        id: 'knight', siteKey: 'knight', name: 'Knight', tagline: 'Get booked.', price: 3900, instalments: true,
        deliverables: [
          'Everything in Squire',
          'Multi-page website with services and prices',
          'Online booking with deposits and reminders',
          'Social media templates',
          'Client follow-up messages',
        ],
        timeline: { sitdown: 'Week 1', blueprint: 'Week 1–2', build: 'Week 2–3', handover: 'Week 4' },
      },
      {
        id: 'crown', siteKey: 'crown', name: 'Crown', tagline: 'Run like a business.', price: 8500, instalments: true,
        deliverables: [
          'Everything in Knight',
          'Full brand identity and guidelines',
          'Client records and simple CRM',
          'Invoicing and monthly bookkeeping set-up',
          '90-day launch plan',
        ],
        timeline: { sitdown: 'Week 1', blueprint: 'Week 1–2', build: 'Week 3–6', handover: 'Week 7' },
      },
    ],
    addons: [
      { id: 'page', siteKey: 'addonPage', name: 'Extra website page', price: 250, from: true,
        desc: 'A gallery, a price list, an about page or anything else your clients need to see.' },
      { id: 'logo', siteKey: 'addonLogo', name: 'Logo design from scratch', price: 950, from: true,
        desc: 'A new logo when the current one can’t be saved, with files for print, web and social.' },
      { id: 'shop', siteKey: 'addonShop', name: 'Product shop and checkout', price: 1500, from: true,
        desc: 'Sell your products online with card payments and order notifications.' },
      { id: 'domain', siteKey: 'addonDomain', name: 'Domain and business email set-up', price: 290, from: true,
        desc: 'Your own web address and a matching email, like hello@yourbusiness.co.za.' },
    ],
    retainer: {
      id: 'court', siteKey: 'court', name: 'The Court', price: 399, per: 'month',
      includes: [
        'Hosting oversight: we keep an eye on your site, domain and renewals',
        'Monthly updates to your site and booking set-up',
        'Content refreshes: new prices, services, photos and offers',
        'A monthly numbers report: bookings, enquiries and what came in',
        'Priority support when something needs fixing',
      ],
    },
    discounts: [
      { id: 'founding', name: 'Founding Client Discount', pct: 20, limit: 3, note: 'For the first three clients.' },
      { id: 'royal', name: 'Royal Discount', pct: 100, limit: 0, note: 'Family and partner work.' },
    ],
  },
  // Last successful "Publish prices" (commit sha + time), written by publish.ts.
  publish: null,
};
