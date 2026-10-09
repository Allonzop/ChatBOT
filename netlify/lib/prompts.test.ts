import { describe, expect, it } from "vitest";
import { businessProfileBlock, isBusinessProfileEmpty } from "./business";
import { isTaskKey, stableSystemBlock, taskKeys } from "./prompts";
import type { BusinessProfileRow } from "./supabase";

const EXPECTED_TASKS = [
  "avis_google",
  "courrier_administration",
  "description_prestation",
  "devis",
  "libre",
  "post_reseaux",
  "relance_impaye",
  "reponse_client",
];

describe("prompts", () => {
  it("charge les huit tâches depuis prompts/tasks", () => {
    expect(taskKeys()).toEqual(EXPECTED_TASKS);
    expect(isTaskKey("avis_google")).toBe(true);
    expect(isTaskKey("inconnue")).toBe(false);
  });

  it("le bloc stable contient la base puis la tâche, sans rien de volatil", () => {
    const block = stableSystemBlock("avis_google");
    expect(block).toContain("# Rôle");
    expect(block).toContain("# Tâche : répondre à un avis Google");
    expect(block.indexOf("# Rôle")).toBeLessThan(block.indexOf("# Tâche"));
    expect(block).not.toMatch(/Date du jour/);
    // Identique d'un appel à l'autre : condition du cache.
    expect(stableSystemBlock("avis_google")).toBe(block);
  });

  it("une clé inconnue retombe sur la tâche libre", () => {
    expect(stableSystemBlock("nimporte")).toBe(stableSystemBlock("libre"));
  });
});

describe("fiche entreprise", () => {
  const fiche: BusinessProfileRow = {
    user_id: "u",
    nom_entreprise: "Dubois Rénovation",
    metier: "plombier",
    ville: "Sedan",
    zone_intervention: "30 km",
    horaires: "",
    tarifs_indicatifs: "déplacement 35 €\ntaux horaire 45 € HT",
    ton: "tutoiement",
    signature: "Marc",
    infos_libres: "",
    updated_at: "",
  };

  it("sérialise les champs remplis et la date du jour", () => {
    const block = businessProfileBlock(fiche, new Date("2026-10-09T10:00:00Z"));
    expect(block).toContain("Nom de l'entreprise : Dubois Rénovation");
    expect(block).toContain("tutoiement");
    expect(block).toContain("déplacement 35 €");
    expect(block).not.toContain("Horaires");
    expect(block).toMatch(/Date du jour : vendredi 9 octobre 2026/);
  });

  it("signale une fiche vide", () => {
    expect(isBusinessProfileEmpty(null)).toBe(true);
    expect(isBusinessProfileEmpty({ ...fiche, nom_entreprise: "", metier: "", ville: "" })).toBe(true);
    expect(isBusinessProfileEmpty(fiche)).toBe(false);
    expect(businessProfileBlock(null)).toContain("n'est pas encore remplie");
  });
});
