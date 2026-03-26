const BETA_EMAILS = [
  "lukemoore9@icloud.com",
  "tdracos98@gmail.com",
];

export function isBetaUser(email: string | undefined | null): boolean {
  if (!email) return false;
  return BETA_EMAILS.includes(email.toLowerCase());
}
