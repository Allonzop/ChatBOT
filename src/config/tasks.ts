/**
 * Catalogue des tâches : tuiles du tableau de bord et formulaires de départ.
 * La clé correspond au fichier `prompts/tasks/<key>.md` côté serveur.
 */
export type FieldType = "text" | "textarea" | "select";

export interface TaskField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  /** Préfixe utilisé dans le premier message envoyé au modèle. */
  prompt: string;
}

export interface TaskDefinition {
  key: string;
  title: string;
  description: string;
  icon: string;
  /** Phrase d'introduction du premier message. */
  intro: string;
  fields: TaskField[];
}

const TON_FIELD: TaskField = {
  name: "ton",
  label: "Ton souhaité",
  type: "select",
  prompt: "Ton souhaité",
  options: [
    { value: "", label: "Celui de ma fiche" },
    { value: "chaleureux", label: "Chaleureux" },
    { value: "sobre", label: "Sobre et professionnel" },
    { value: "ferme", label: "Ferme mais courtois" },
  ],
};

export const TASKS: TaskDefinition[] = [
  {
    key: "avis_google",
    title: "Répondre à un avis Google",
    description: "Une réponse publique courte, qui rassure les futurs clients.",
    icon: "star",
    intro: "Je dois répondre à un avis Google.",
    fields: [
      { name: "avis", label: "Texte de l'avis", type: "textarea", required: true, placeholder: "Colle ici l'avis du client", prompt: "Avis reçu" },
      {
        name: "note",
        label: "Note",
        type: "select",
        required: true,
        prompt: "Note",
        options: [
          { value: "5", label: "5 étoiles" },
          { value: "4", label: "4 étoiles" },
          { value: "3", label: "3 étoiles" },
          { value: "2", label: "2 étoiles" },
          { value: "1", label: "1 étoile" },
        ],
      },
      { name: "prenom", label: "Prénom du client (facultatif)", type: "text", placeholder: "Ex. Julie", prompt: "Prénom du client" },
      TON_FIELD,
    ],
  },
  {
    key: "post_reseaux",
    title: "Écrire un post Facebook ou Instagram",
    description: "Une réalisation, une promo, une actu : un post qui donne envie.",
    icon: "megaphone",
    intro: "Je veux publier un post sur les réseaux.",
    fields: [
      {
        name: "reseau",
        label: "Réseau",
        type: "select",
        required: true,
        prompt: "Réseau",
        options: [
          { value: "Facebook", label: "Facebook" },
          { value: "Instagram", label: "Instagram" },
          { value: "Facebook et Instagram", label: "Les deux" },
        ],
      },
      { name: "sujet", label: "Sujet du post", type: "textarea", required: true, placeholder: "Ex. Terrasse en bois terminée chez un client de Sedan, photo avant/après", prompt: "Sujet" },
      { name: "objectif", label: "Ce que tu veux obtenir", type: "text", placeholder: "Ex. des demandes de devis pour le printemps", prompt: "Objectif" },
    ],
  },
  {
    key: "devis",
    title: "Rédiger un devis",
    description: "Un texte de devis clair à coller dans un mail ou ton logiciel.",
    icon: "file-text",
    intro: "Je dois rédiger un devis.",
    fields: [
      { name: "client", label: "Client", type: "text", required: true, placeholder: "Ex. M. Martin, Charleville-Mézières", prompt: "Client" },
      { name: "prestation", label: "Prestation et détail des lignes", type: "textarea", required: true, placeholder: "Ex. Pose de 20 m² de carrelage, fourniture comprise, 45 €/m² HT ; dépose ancien carrelage 300 € HT", prompt: "Prestation et lignes" },
      { name: "conditions", label: "Conditions (acompte, délai, validité)", type: "text", placeholder: "Ex. acompte 30 %, travaux sous 3 semaines", prompt: "Conditions" },
    ],
  },
  {
    key: "relance_impaye",
    title: "Relancer un impayé",
    description: "Obtenir le paiement sans abîmer la relation.",
    icon: "bell",
    intro: "Je dois relancer un client qui n'a pas payé.",
    fields: [
      { name: "facture", label: "Facture (numéro, montant, date)", type: "text", required: true, placeholder: "Ex. F-2026-031, 850 €, échéance 15 septembre", prompt: "Facture" },
      {
        name: "niveau",
        label: "Niveau de relance",
        type: "select",
        required: true,
        prompt: "Niveau de relance",
        options: [
          { value: "première relance, courtoise", label: "1re relance, courtoise" },
          { value: "deuxième relance, ferme", label: "2e relance, ferme" },
          { value: "troisième relance, mise en demeure", label: "Mise en demeure" },
        ],
      },
      {
        name: "canal",
        label: "Canal",
        type: "select",
        required: true,
        prompt: "Canal",
        options: [
          { value: "mail", label: "Mail" },
          { value: "SMS", label: "SMS" },
        ],
      },
      {
        name: "type_client",
        label: "Type de client",
        type: "select",
        prompt: "Type de client",
        options: [
          { value: "particulier", label: "Particulier" },
          { value: "professionnel", label: "Professionnel" },
        ],
      },
    ],
  },
  {
    key: "reponse_client",
    title: "Répondre à un client",
    description: "Mail ou SMS : disponibilité, rendez-vous, question, réclamation.",
    icon: "message-circle",
    intro: "Je dois répondre à un message de client.",
    fields: [
      { name: "message", label: "Message reçu", type: "textarea", required: true, placeholder: "Colle le message du client", prompt: "Message reçu" },
      { name: "reponse", label: "Ce que tu veux répondre, en deux mots", type: "text", required: true, placeholder: "Ex. oui, je propose jeudi 14h", prompt: "Réponse souhaitée" },
      {
        name: "canal",
        label: "Canal",
        type: "select",
        required: true,
        prompt: "Canal",
        options: [
          { value: "mail", label: "Mail" },
          { value: "SMS", label: "SMS" },
        ],
      },
    ],
  },
  {
    key: "description_prestation",
    title: "Décrire une prestation",
    description: "Pour ton site ou ta fiche Google, avec la ville et la zone.",
    icon: "globe",
    intro: "Je veux décrire une prestation pour mon site ou ma fiche Google.",
    fields: [
      { name: "prestation", label: "Prestation", type: "text", required: true, placeholder: "Ex. Rénovation de salle de bain", prompt: "Prestation" },
      { name: "details", label: "Ce qui la distingue, à qui elle s'adresse", type: "textarea", placeholder: "Ex. clé en main, du carrelage à la plomberie, particuliers, devis gratuit", prompt: "Détails" },
      {
        name: "support",
        label: "Support",
        type: "select",
        required: true,
        prompt: "Support",
        options: [
          { value: "site web", label: "Site web" },
          { value: "fiche Google", label: "Fiche Google" },
          { value: "site web et fiche Google", label: "Les deux" },
        ],
      },
    ],
  },
  {
    key: "courrier_administration",
    title: "Écrire à une administration",
    description: "Urssaf, impôts, mairie, CMA : un courrier propre et complet.",
    icon: "landmark",
    intro: "Je dois écrire à une administration.",
    fields: [
      {
        name: "destinataire",
        label: "Destinataire",
        type: "select",
        required: true,
        prompt: "Destinataire",
        options: [
          { value: "Urssaf", label: "Urssaf" },
          { value: "Service des impôts des entreprises", label: "Impôts" },
          { value: "Mairie", label: "Mairie" },
          { value: "Chambre de métiers et de l'artisanat", label: "CMA" },
          { value: "autre administration", label: "Autre" },
        ],
      },
      { name: "objet", label: "Objet et contexte", type: "textarea", required: true, placeholder: "Ex. demande de délai de paiement pour les cotisations du 3e trimestre, courrier reçu le 2 octobre", prompt: "Objet et contexte" },
      { name: "references", label: "Références (SIRET, n° de dossier)", type: "text", placeholder: "Ex. SIRET 123 456 789 00012", prompt: "Références" },
    ],
  },
  {
    key: "libre",
    title: "Autre demande",
    description: "Flyer, message fournisseur, annonce, vœux : toujours cadré par ta fiche.",
    icon: "sparkles",
    intro: "",
    fields: [
      { name: "demande", label: "Ta demande", type: "textarea", required: true, placeholder: "Ex. un message pour prévenir mes clients de la fermeture du 11 au 18 août", prompt: "" },
    ],
  },
];

export const TASK_BY_KEY: Record<string, TaskDefinition> = Object.fromEntries(TASKS.map((t) => [t.key, t]));

export function taskLabel(key: string): string {
  return TASK_BY_KEY[key]?.title ?? "Conversation";
}

/** Construit le premier message utilisateur à partir des champs du formulaire. */
export function buildFirstMessage(task: TaskDefinition, values: Record<string, string>): string {
  const lines: string[] = [];
  if (task.intro) lines.push(task.intro);
  for (const field of task.fields) {
    const value = (values[field.name] ?? "").trim();
    if (!value) continue;
    if (!field.prompt) {
      lines.push(value);
    } else if (value.includes("\n")) {
      lines.push(`${field.prompt} :\n${value}`);
    } else {
      lines.push(`${field.prompt} : ${value}`);
    }
  }
  return lines.join("\n");
}

/** Titre court de conversation à partir des champs. */
export function buildTitle(task: TaskDefinition, values: Record<string, string>): string {
  const first = task.fields.find((f) => f.required && (values[f.name] ?? "").trim());
  const hint = first ? (values[first.name] ?? "").trim().replace(/\s+/g, " ").slice(0, 40) : "";
  const base = task.key === "libre" ? "" : task.title;
  const title = [base, hint].filter(Boolean).join(" · ");
  return (title || "Nouvelle conversation").slice(0, 80);
}
