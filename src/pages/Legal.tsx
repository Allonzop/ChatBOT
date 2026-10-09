import type { ReactNode } from "react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { brand } from "@/config/brand";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function Todo({ children }: { children: ReactNode }) {
  return <span className="rounded bg-accent/15 px-1 text-accent-foreground/90 text-accent">[{children}]</span>;
}

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <PublicLayout>
      <div className="container max-w-3xl space-y-8 py-10">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-xs text-muted-foreground">
          Les éléments entre crochets sont à compléter avant la mise en ligne. Dernière mise à jour : <Todo>date</Todo>.
        </p>
        {children}
      </div>
    </PublicLayout>
  );
}

export function MentionsLegalesPage() {
  return (
    <LegalLayout title="Mentions légales">
      <Section title="Éditeur du site">
        <p>
          {brand.name} est édité par <Todo>raison sociale ou nom et prénom de l'éditeur</Todo>, <Todo>forme juridique (micro-entreprise, SAS…)</Todo>, SIRET <Todo>numéro SIRET</Todo>, dont le siège est situé <Todo>adresse complète</Todo>.
        </p>
        <p>
          Directeur de la publication : <Todo>nom du responsable</Todo>. Contact : <Todo>{brand.contactEmail}</Todo>.
        </p>
      </Section>
      <Section title="Hébergement">
        <p>
          Le site et les fonctions serveur sont hébergés par Netlify, Inc., 512 2nd Street, Suite 200, San Francisco, CA 94107, États-Unis (netlify.com).
        </p>
        <p>
          Les comptes et les données applicatives sont hébergés par Supabase, Inc., 970 Toa Payoh North #07-04, Singapour (supabase.com), sur une instance située dans l'Union européenne (région <Todo>eu-west-x / Francfort / Paris</Todo>).
        </p>
        <p>
          Les textes sont générés par l'API d'Anthropic, PBC, 548 Market St, San Francisco, CA 94104, États-Unis (anthropic.com).
        </p>
      </Section>
      <Section title="Nature du service">
        <p>
          {brand.name} est un assistant de rédaction destiné aux professionnels. {brand.aiNotice} L'utilisateur reste seul responsable des textes qu'il envoie, publie ou signe.
        </p>
      </Section>
      <Section title="Propriété intellectuelle">
        <p>
          L'interface, le nom et le monogramme sont la propriété de l'éditeur. Les textes générés à partir des informations de l'utilisateur lui appartiennent ; il peut les utiliser librement.
        </p>
      </Section>
      <Section title="Prix et paiement">
        <p>
          L'essai est gratuit et limité. L'abonnement est proposé au tarif de {brand.price} <Todo>TTC / HT, à confirmer</Todo>, résiliable à tout moment. Paiement par carte via Stripe, Inc. <Todo>ou activation manuelle sur demande</Todo>.
        </p>
      </Section>
      <Section title="Droit applicable">
        <p>Le présent site est soumis au droit français. En cas de litige, les tribunaux de <Todo>ville</Todo> sont compétents, sous réserve des dispositions légales applicables aux consommateurs.</p>
      </Section>
    </LegalLayout>
  );
}

export function ConfidentialitePage() {
  return (
    <LegalLayout title="Politique de confidentialité">
      <Section title="Responsable du traitement">
        <p>
          <Todo>raison sociale ou nom de l'éditeur</Todo>, <Todo>adresse</Todo>, contact : <Todo>{brand.contactEmail}</Todo>.
        </p>
      </Section>
      <Section title="Données collectées">
        <ul className="list-disc space-y-1 pl-5">
          <li>Compte : adresse email, mot de passe chiffré ou lien de connexion, dates de connexion.</li>
          <li>Fiche entreprise : nom, métier, ville, zone, horaires, tarifs, signature, informations libres saisies par l'utilisateur.</li>
          <li>Conversations : les messages envoyés et les réponses générées.</li>
          <li>Usage : nombre de tokens et coût de chaque réponse, modèle utilisé, plan au moment de l'appel.</li>
          <li>Paiement : identifiant client Stripe et statut d'abonnement ; aucune donnée bancaire n'est stockée par l'éditeur.</li>
          <li>Liste d'attente : adresse email, si l'utilisateur demande à être prévenu.</li>
        </ul>
      </Section>
      <Section title="Finalités et bases légales">
        <p>Fournir le service (exécution du contrat), facturer l'abonnement (exécution du contrat), limiter les abus et répartir le crédit d'usage (intérêt légitime), répondre aux obligations légales.</p>
      </Section>
      <Section title="Sous-traitants et transferts">
        <p>
          Supabase (hébergement des données, Union européenne), Netlify (hébergement du site et des fonctions, États-Unis et Union européenne), Anthropic (génération des textes, États-Unis), Stripe (paiement, États-Unis et Union européenne). Les transferts hors UE reposent sur les clauses contractuelles types de la Commission européenne. <Todo>Vérifier et compléter avec les DPA signés</Todo>.
        </p>
        <p>Les messages envoyés à Anthropic ne sont pas utilisés pour entraîner ses modèles dans le cadre de l'API, selon ses conditions commerciales en vigueur.</p>
      </Section>
      <Section title="Durée de conservation">
        <ul className="list-disc space-y-1 pl-5">
          <li>Compte, fiche et conversations : tant que le compte existe, puis suppression immédiate à la demande de l'utilisateur.</li>
          <li>Statistiques d'usage : conservées <Todo>durée, ex. 24 mois</Todo> sous forme anonymisée après suppression du compte.</li>
          <li>Données de facturation : <Todo>10 ans</Todo> conformément aux obligations comptables.</li>
          <li>Comptes inactifs : suppression après <Todo>durée, ex. 24 mois</Todo> sans connexion.</li>
        </ul>
      </Section>
      <Section title="Vos droits">
        <p>
          Accès, rectification, effacement, limitation, portabilité et opposition. La suppression du compte est possible à tout moment depuis la page « Compte » : elle efface les conversations, les messages, la fiche et le profil ; les statistiques d'usage sont conservées anonymisées. Pour toute autre demande : <Todo>{brand.contactEmail}</Todo>. Vous pouvez saisir la CNIL (cnil.fr) en cas de difficulté.
        </p>
      </Section>
      <Section title="Cookies et traceurs">
        <p>Le site n'utilise que le stockage local nécessaire à la session de connexion. Aucun cookie publicitaire ni outil de mesure d'audience tiers <Todo>à adapter si un outil est ajouté</Todo>.</p>
      </Section>
    </LegalLayout>
  );
}
