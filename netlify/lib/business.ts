import type { BusinessProfileRow } from "./supabase";

const FIELDS: Array<{ key: keyof BusinessProfileRow; label: string }> = [
  { key: "nom_entreprise", label: "Nom de l'entreprise" },
  { key: "metier", label: "Métier" },
  { key: "ville", label: "Ville" },
  { key: "zone_intervention", label: "Zone d'intervention" },
  { key: "horaires", label: "Horaires" },
  { key: "tarifs_indicatifs", label: "Tarifs indicatifs" },
  { key: "ton", label: "Ton à employer avec les clients" },
  { key: "signature", label: "Signature" },
  { key: "infos_libres", label: "Autres informations" },
];

/** Une fiche est « vide » si aucun champ descriptif n'est rempli. */
export function isBusinessProfileEmpty(profile: BusinessProfileRow | null): boolean {
  if (!profile) return true;
  return !(profile.nom_entreprise || profile.metier || profile.ville);
}

/** Date du jour en français (Europe/Paris), injectée dans le bloc volatil. */
export function todayFr(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(now);
}

/**
 * Bloc 2 du prompt système : la fiche entreprise sérialisée, avec la date du
 * jour et les prix. Ce bloc change d'un utilisateur à l'autre : il n'est
 * jamais mis en cache.
 */
export function businessProfileBlock(profile: BusinessProfileRow | null, now: Date = new Date()): string {
  const lines: string[] = ["# Fiche de l'entreprise", ""];
  if (isBusinessProfileEmpty(profile)) {
    lines.push(
      "La fiche n'est pas encore remplie. Demande en une phrase, au début de ta réponse, le nom de l'entreprise, le métier et la ville, puis produis quand même un texte générique avec des repères entre crochets.",
    );
  } else {
    for (const { key, label } of FIELDS) {
      const value = String(profile![key] ?? "").trim();
      if (!value) continue;
      if (key === "ton") {
        lines.push(`- ${label} : ${value === "tutoiement" ? "tutoiement" : "vouvoiement"}`);
      } else if (value.includes("\n")) {
        lines.push(`- ${label} :`);
        for (const l of value.split("\n")) lines.push(`  ${l}`);
      } else {
        lines.push(`- ${label} : ${value}`);
      }
    }
  }
  lines.push("", `Date du jour : ${todayFr(now)}.`);
  return lines.join("\n");
}
