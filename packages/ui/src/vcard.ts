/**
 * vCard 3.0 builder — shared so every remote's contact QR is consistent.
 * Lives in @myek/ui (domain util); @myek/platform is capability slots only.
 */
export interface ContactCard {
  fullName: string;
  organization: string;
  jobTitle: string;
  phone: string;
  email: string;
}

function escape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

function splitName(fullName: string): { family: string; given: string } {
  const trimmed = fullName.trim();
  const idx = trimmed.lastIndexOf(' ');
  if (idx === -1) return { family: '', given: trimmed };
  return { given: trimmed.slice(0, idx), family: trimmed.slice(idx + 1) };
}

/** vCard 3.0 (CRLF, RFC 2426) — what iOS Camera / Google Lens recognise for "Add to Contacts". */
export function buildVCard(input: ContactCard): string {
  const { family, given } = splitName(input.fullName);
  return [
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
}
