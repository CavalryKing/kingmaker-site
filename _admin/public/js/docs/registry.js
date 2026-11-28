// The 8 sales-kit document types. Each type has its own module in this folder (docs/<type>.js)
// exporting: blank(ctx) -> initial data, render(page, doc, ctx) -> draws + wires the A4 page,
// totals(data) -> {amount_cents}, share(doc, ctx) -> WhatsApp text.

export const TYPES = {
  audit:      { n: 1, label: 'Online Presence Audit', short: 'Audit', prefix: 'KM-A', statuses: ['draft', 'sent', 'void'] },
  proposal:   { n: 2, label: 'Proposal', short: 'Proposal', prefix: 'KM-P', statuses: ['draft', 'sent', 'accepted', 'void'] },
  quote:      { n: 3, label: 'Quote', short: 'Quote', prefix: 'KM-Q', statuses: ['draft', 'sent', 'accepted', 'void'] },
  agreement:  { n: 4, label: 'Service Agreement', short: 'Agreement', prefix: 'KM-SA', statuses: ['draft', 'sent', 'accepted', 'void'], accepted: 'Signed' },
  onboarding: { n: 5, label: 'Client Onboarding Questionnaire', short: 'Onboarding', prefix: 'KM-OQ', statuses: ['draft', 'sent', 'accepted', 'void'], accepted: 'Completed' },
  invoice:    { n: 6, label: 'Invoice', short: 'Invoice', prefix: 'KM-INV', statuses: ['draft', 'sent', 'paid', 'void'] },
  handover:   { n: 7, label: 'Hand-over Pack', short: 'Hand-over', prefix: 'KM-HO', statuses: ['draft', 'sent', 'void'] },
  consent:    { n: 8, label: 'Testimonial & Case Study Consent', short: 'Consent', prefix: 'KM-TC', statuses: ['draft', 'sent', 'accepted', 'void'], accepted: 'Signed' },
};
export const TYPE_IDS = Object.keys(TYPES);

const BASE = { draft: 'Draft', sent: 'Sent', accepted: 'Accepted', paid: 'Paid', void: 'Void' };
export const statusLabel = (type, s) => (s === 'accepted' && TYPES[type]?.accepted) || BASE[s] || s;

export const loadType = (type) => import(`./${type}.js`);
