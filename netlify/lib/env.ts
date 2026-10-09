/** Accès centralisé aux variables d'environnement côté fonctions. */

export function env(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value === "" ? undefined : value;
}

export function requireEnv(name: string): string {
  const value = env(name);
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}

export function adminEmails(): string[] {
  return (env("ADMIN_EMAILS") ?? "")
    .split(/[,\s;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

export function stripeEnabled(): boolean {
  return Boolean(env("STRIPE_SECRET_KEY"));
}
