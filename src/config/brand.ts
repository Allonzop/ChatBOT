/**
 * Seul endroit où vivent le nom du produit, la marque, l'accroche et le prix.
 * Tout le reste de l'interface lit ce fichier.
 */
export const brand = {
  /** Nom du produit (provisoire). */
  name: "Le Chatbot Ardennais",
  /** Nom de marque / éditeur (provisoire, à confirmer). */
  company: "Le Chatbot Ardennais",
  /** Accroche courte. */
  tagline: "L'assistant qui écrit à ta place pour tes clients, tes avis et l'administration.",
  /** Promesse en une phrase pour la page d'accueil. */
  promise: "Réponses aux avis, posts, devis, relances, courriers : tout en français, dans ton ton, prêt à coller.",
  /** Prix affiché (provisoire, à confirmer avant l'ouverture des paiements). */
  price: "12 € / mois",
  /** Email de contact (provisoire). */
  contactEmail: "contact@example.com",
  /** Zone visée, pour les textes. */
  region: "Ardennes",
  /** Initiales du monogramme CSS. */
  monogram: "CA",
  /** Mention légale affichée partout en pied de page. */
  aiNotice: "Réponses générées par une intelligence artificielle, elles peuvent contenir des erreurs. Relisez avant d'envoyer.",
  /** Mention courte pour l'accueil. */
  aiNoticeShort: "Réponses générées par une IA, peuvent contenir des erreurs.",
} as const;
