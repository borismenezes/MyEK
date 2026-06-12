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
/** vCard 3.0 (CRLF, RFC 2426) — what iOS Camera / Google Lens recognise for "Add to Contacts". */
export declare function buildVCard(input: ContactCard): string;
