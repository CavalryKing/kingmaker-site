// Create a document of any type, pre-filled from the client and the catalogue, then open it.

import { S, client, createDoc } from '../store.js';
import { toast, today } from '../ui.js';
import { loadType, TYPES } from './registry.js';

/** ctx every document module gets: settings, catalogue, the client, helpers. */
export function makeCtx(clientId) {
  return {
    client: client(clientId),
    company: S.settings.company || {},
    bank: S.settings.bank || {},
    terms: S.settings.terms || {},
    catalogue: S.settings.catalogue || {},
  };
}

export async function newDocument(type, clientId = null, extra = {}) {
  if (!TYPES[type]) throw new Error('Unknown document type');
  try {
    const mod = await loadType(type);
    const ctx = makeCtx(clientId);
    const data = await mod.blank(ctx, extra);
    const fields = { type, client_id: clientId, status: 'draft', issued_on: today(), data, ...(mod.totals ? mod.totals(data) : {}) };
    const doc = await createDoc(fields);
    location.hash = `#/doc/${doc.id}`;
    return doc;
  } catch (e) {
    toast(e.message, { error: true });
    throw e;
  }
}
