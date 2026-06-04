export function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("48") && digits.length === 11) {
    return digits.slice(2);
  }

  return digits;
}

export function isValidPolishPhone(phone: string) {
  return /^\d{9}$/.test(normalizePhone(phone));
}

export function phoneToAuthEmail(phone: string) {
  const domain = (import.meta.env.VITE_AUTH_EMAIL_DOMAIN || "app.local")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();

  return `${normalizePhone(phone)}@${domain}`;
}
