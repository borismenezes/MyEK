import { createLogger } from '@utils/logger';

const log = createLogger('Service/VCard');

export interface ContactCard {
  fullName: string;
  organization: string;
  jobTitle: string;
  phone: string;
  email: string;
}

// vCard 3.0 (not 4.0) is what iOS Camera + Google Lens reliably recognise
// and offer "Add to Contacts" for on scan. Output uses CRLF per RFC 2426.
function escape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

// Best-effort split: last whitespace token is the surname. Good enough for
// the display names this app deals with; richer i18n parsing would need a
// dedicated lib.
function splitName(fullName: string): { family: string; given: string } {
  const trimmed = fullName.trim();
  const idx = trimmed.lastIndexOf(' ');
  if (idx === -1) return { family: '', given: trimmed };
  return { given: trimmed.slice(0, idx), family: trimmed.slice(idx + 1) };
}

function build(input: ContactCard): string {
  const { family, given } = splitName(input.fullName);
  const out = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escape(family)};${escape(given)};;;`,
    `FN:${escape(input.fullName)}`,
    `ORG:${escape(input.organization)}`,
    `TITLE:${escape(input.jobTitle)}`,
    `TEL;TYPE=CELL:${input.phone.trim()}`,
    `EMAIL:${input.email.trim()}`,
    'END:VCARD',
  ].join('\r\n');
  log.debug('Built vCard', { length: out.length });
  return out;
}

export const vCardService = { build };
