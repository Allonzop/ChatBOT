# Le Chatbot Ardennais

Assistant IA de communication et d'administratif pour les indépendants des Ardennes : artisans, commerçants, micro-entrepreneurs. Ce n'est pas un chat généraliste : il fait des tâches précises (avis Google, posts, devis, relances, réponses clients, descriptions, courriers aux administrations) pour **une** entreprise dont il connaît la fiche.

Le nom du produit, l'accroche, le prix affiché et le monogramme vivent dans un seul fichier : [`src/config/brand.ts`](src/config/brand.ts).

## Stack

| Couche | Choix |
| --- | --- |
| Front | React 18, Vite 5, TypeScript, Tailwind 3.4, shadcn/ui (installés par le CLI), routeur `wouter` |
| Comptes et base | Supabase (Auth email + mot de passe et lien magique, Postgres, RLS), région EU |
| Serveur | Netlify Functions v2 en TypeScript, SDK officiel `@anthropic-ai/sdk` |
| Modèle | `claude-sonnet-5-5` par défaut, `claude-haiku-5-5` via `MODEL` |
| Tests | vitest (coûts, quotas, prompts) |
| Encaissement | Stripe, optionnel, derrière `STRIPE_SECRET_KEY` |

## Arborescence

```
src/                    application React
  config/brand.ts       nom, accroche, prix (seul endroit)
  config/tasks.ts       tuiles et formulaires de départ des huit tâches
  lib/api.ts            appels aux fonctions + lecture du flux SSE
  pages/                /, /login, /app, /app/c/:id, /app/profil, /app/compte, /admin, mentions, confidentialité
netlify/functions/      chat, conversations, profile, account, admin, waitlist, stripe-checkout, stripe-webhook
netlify/lib/            pricing.ts (prix), quotas.ts (règles), prompts.ts (chargement), anthropic.ts, supabase.ts
prompts/base.md         prompt de base, commun à toutes les tâches
prompts/tasks/<cle>.md  un prompt par tâche
supabase/migrations/    schéma, RLS, trigger d'inscription, fonctions de coût
```

## 1. Créer le projet Supabase (EU) et appliquer les migrations

1. Sur [supabase.com](https://supabase.com), crée un projet dans une **région de l'Union européenne** (Francfort `eu-central-1` ou Paris `eu-west-3`). Le choix de région n'est pas modifiable ensuite.
2. Applique la migration. Deux options :
   - Avec le CLI : `npx supabase login`, `npx supabase link --project-ref <ref>`, puis `npx supabase db push`.
   - Sans CLI : ouvre **SQL Editor** dans le tableau de bord et colle le contenu de `supabase/migrations/20261009000000_init.sql`.
3. Dans **Authentication > Providers > Email**, laisse « Email » activé. Garde « Confirm email » activé en production ; désactive-le en local pour tester plus vite.
4. Dans **Authentication > URL Configuration**, pose `Site URL` sur ton domaine Netlify et ajoute `http://localhost:8888/**` et `https://<ton-site>.netlify.app/**` dans « Redirect URLs » (nécessaire pour le lien magique et la confirmation d'email).
5. Dans **Project Settings > API**, récupère `Project URL`, la clé `anon` et la clé `service_role`. La clé `service_role` ne doit jamais apparaître côté navigateur : elle n'est lue que par les fonctions Netlify (le front ne voit que `SUPABASE_URL` et `SUPABASE_ANON_KEY`, voir `envPrefix` dans `vite.config.ts`).

Ce que la migration installe : les tables `profiles`, `business_profiles`, `conversations`, `messages`, `usage_events`, `waitlist` ; la RLS partout (lecture de ses propres lignes, aucune écriture côté client) ; le trigger `on_auth_user_created` qui crée la ligne `profiles` (plan `trial`) et une fiche vide ; les fonctions `user_costs`, `trial_month_cost`, `pro_month_cost`, `month_costs_by_plan`, `accounts_by_plan`, la vue `user_cost_overview` et `delete_account`. Le « mois » est le mois calendaire UTC.

## 2. Créer le site Netlify et poser les variables

1. Pousse le dépôt sur GitHub puis, sur [app.netlify.com](https://app.netlify.com), **Add new site > Import an existing project**. `netlify.toml` fixe déjà la commande de build (`npm run build`), le dossier publié (`dist`), le dossier des fonctions et l'inclusion des prompts Markdown dans le bundle.
2. Dans **Site configuration > Environment variables**, ajoute toutes les variables de [`.env.example`](.env.example) :

| Variable | Rôle | Défaut |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | clé API Anthropic, côté serveur uniquement | obligatoire |
| `MODEL` | `claude-sonnet-5-5` ou `claude-haiku-5-5` | `claude-sonnet-5-5` |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | lus par le front et les fonctions | obligatoires |
| `SUPABASE_SERVICE_ROLE_KEY` | fonctions uniquement | obligatoire |
| `MONTHLY_CREDIT_USD` | crédit Anthropic disponible par mois | 100 |
| `PAID_RESERVE_USD` | part du crédit réservée aux abonnés | 40 |
| `TRIAL_SOFT_CAP_USD` | paywall doux, coût à vie d'un essai | 1 |
| `HARD_CAP_USD` | plafond dur, coût à vie d'un essai | 5 |
| `PAID_MONTHLY_CAP_USD` | plafond mensuel d'un abonné | 15 |
| `ADMIN_EMAILS` | emails autorisés sur `/admin`, séparés par des virgules | vide |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` | optionnels, voir plus bas | vides |

3. Lance le premier déploiement. Les fonctions répondent sous `/api/*` (chemins déclarés dans chaque fichier via `config.path`).
4. En local : `cp .env.example .env`, remplis les valeurs, puis `npm install` et `npm run dev` (lance `netlify dev` sur http://localhost:8888, qui sert Vite et les fonctions avec les variables de `.env`). Le CLI Netlify n'est pas dans les dépendances : `npm i -g netlify-cli` ou `npx netlify-cli dev`.

## 3. Checklist Console Anthropic

Ces réglages ne se codent pas, ils se font dans la console. À faire avant la mise en ligne :

- [ ] **Réclamer le crédit** : dans claude.ai, **Settings > Billing**, lier l'organisation API (console.anthropic.com) pour y faire apparaître le crédit de l'abonnement Max.
- [ ] **Créer la clé API** dans console.anthropic.com > API Keys, dédiée à ce site, et la poser dans `ANTHROPIC_API_KEY` sur Netlify. Ne jamais la committer.
- [ ] **Fixer un plafond de dépense mensuel** dans **Billing > Limits** (ou « Spend limits »), à hauteur du crédit disponible (par défaut `MONTHLY_CREDIT_USD`, soit 100 $). C'est le vrai filet de sécurité : les quotas applicatifs peuvent être dépassés de quelques centimes, la console coupe net.
- [ ] **Désactiver la recharge automatique** (auto-reload) dans **Billing**, pour que la carte ne soit jamais débitée au-delà du crédit.
- [ ] Vérifier dans **Usage** que le modèle appelé est bien `claude-sonnet-5-5` (ou `claude-haiku-5-5`) sans suffixe de date.
- [ ] Mettre à jour la table des prix dans `netlify/lib/pricing.ts` si Anthropic change ses tarifs (valeurs au 09/10/2026).

## 4. Vérifier que le cache de prompt fonctionne

Le prompt système est envoyé en deux blocs : le bloc 1 (`prompts/base.md` + `prompts/tasks/<cle>.md`) est stable et porte `cache_control: { type: "ephemeral" }` ; le bloc 2 (fiche entreprise, date du jour) n'est jamais mis en cache. Le minimum cacheable sur Sonnet 5.5 et Haiku 5.5 est de 512 tokens, le bloc 1 en fait environ 1 500.

Pour vérifier après déploiement :

1. Envoie un premier message dans une conversation : la ligne `usage_events` correspondante doit avoir `cache_creation_input_tokens > 0` (écriture du cache).
2. Envoie un deuxième message **dans les cinq minutes** : la ligne doit avoir `cache_read_input_tokens > 0` et `cache_creation_input_tokens` proche de zéro.

Requête SQL dans Supabase :

```sql
select created_at, model, input_tokens, cache_creation_input_tokens, cache_read_input_tokens, output_tokens, cost_usd
from usage_events order by created_at desc limit 10;
```

Si `cache_read_input_tokens` reste à zéro : un élément volatil s'est glissé dans le bloc 1 (date, identifiant), ou le fichier Markdown change entre deux appels. La date et les prix vont dans le bloc 2, jamais dans le bloc 1.

## 5. Changer de modèle, de seuils, de tâches

- **Modèle** : variable `MODEL` sur Netlify (`claude-sonnet-5-5` ou `claude-haiku-5-5`), puis redéploiement ou simple relance des fonctions. Toute autre valeur retombe sur Sonnet. Les prix des deux modèles sont dans `netlify/lib/pricing.ts`.
- **Seuils de quotas** : variables `MONTHLY_CREDIT_USD`, `PAID_RESERVE_USD`, `TRIAL_SOFT_CAP_USD`, `HARD_CAP_USD`, `PAID_MONTHLY_CAP_USD`. Les règles, dans cet ordre, sont dans `netlify/lib/quotas.ts` (`decide()`), testées dans `quotas.test.ts` :
  1. plafond dur par essai (coût à vie ≥ `HARD_CAP_USD`) → `hard_cap` ;
  2. paywall doux par essai (coût à vie ≥ `TRIAL_SOFT_CAP_USD`) → `trial_soft_cap` ;
  3. réserve des essais (somme des essais du mois ≥ `MONTHLY_CREDIT_USD − PAID_RESERVE_USD`) → `trial_pool_exhausted` ;
  4. plafond mensuel des abonnés (coût du mois ≥ `PAID_MONTHLY_CAP_USD`) → `paid_monthly_cap`.
  La décision est prise avant l'appel sur les compteurs existants, la mise à jour après la réponse : un dépassement de quelques centimes est accepté.
- **Tâches et ton** : modifier `prompts/base.md` (règles communes) ou `prompts/tasks/<cle>.md`. Ajouter une tâche = un fichier Markdown `prompts/tasks/<nouvelle_cle>.md` + une entrée dans `src/config/tasks.ts` (tuile, champs du formulaire). Les fichiers sont lus au démarrage de chaque instance de fonction et gardés en mémoire : un redéploiement suffit.
- **Marque, prix affiché, accroche** : `src/config/brand.ts`.
- **Textes légaux** : `src/pages/Legal.tsx`, champs entre crochets à compléter (éditeur, SIRET, région Supabase, durées de conservation).

## Administration

`/admin` est accessible aux comptes dont l'email figure dans `ADMIN_EMAILS` : coût du mois (essais, abonnés, total, reste avant la réserve), top 10 utilisateurs, comptes par plan, liste d'attente, et boutons pour passer un compte en `pro` ou `blocked`. C'est ce qui permet d'activer un payant sans Stripe au lancement.

## Encaissement (optionnel)

- **Sans Stripe** (variables vides) : le paywall affiche « Me prévenir », l'email va dans la table `waitlist`, l'admin passe le compte en `pro` à la main.
- **Avec Stripe** : crée un produit avec un prix récurrent mensuel, pose `STRIPE_SECRET_KEY` et `STRIPE_PRICE_ID`. Ajoute un webhook vers `https://<ton-site>/api/stripe-webhook` avec les événements `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`, et pose son secret dans `STRIPE_WEBHOOK_SECRET`. Le plan passe à `pro` au paiement et revient à `trial` à la résiliation. Le prix affiché vient de `brand.ts` (« 12 € / mois », provisoire), à aligner sur le prix Stripe.

## Valeurs par défaut choisies

Les fichiers `index.css` et `tailwind.config.ts` du site KRAON n'étaient pas joints au dépôt : ils ont été recréés selon la description (thème sombre, variables CSS HSL, Inter, radius 12 px, utilitaires `glass` et `glow`). Pour reprendre les originaux, remplace `src/index.css` et `tailwind.config.ts` en conservant les noms de variables `--background`, `--primary`, `--accent`, etc., que shadcn attend.

Autres choix faits faute d'information, tous modifiables :

| Point | Valeur | Où |
| --- | --- | --- |
| Nom du produit | « Le Chatbot Ardennais » | `src/config/brand.ts` |
| Prix affiché | « 12 € / mois », à confirmer | `src/config/brand.ts` |
| Email de contact | `contact@example.com` | `src/config/brand.ts` |
| Historique envoyé au modèle | 30 derniers messages, 24 000 caractères max | `netlify/functions/chat.ts` |
| Taille max d'un message | 6 000 caractères | `netlify/functions/chat.ts` |
| `max_tokens` | 2 000, `effort: low`, pas de paramètre `thinking` | `netlify/functions/chat.ts` |
| Flux de réponse | SSE (`event: start` / `text` / `done` / `error`) | `netlify/functions/chat.ts`, `src/lib/api.ts` |
| Arrêt par l'utilisateur | coupe l'affichage, laisse l'appel se terminer pour enregistrer l'usage | `netlify/functions/chat.ts` |
| Nom de la variable front | `SUPABASE_URL` / `SUPABASE_ANON_KEY` exposées à Vite par préfixe exact | `vite.config.ts` |
| Node | 22 | `netlify.toml` |

## Scripts

```
npm run dev        # netlify dev (front + fonctions) sur http://localhost:8888
npm run dev:vite   # Vite seul, sans fonctions
npm run build      # typecheck front + fonctions, puis vite build
npm test           # vitest : coûts, quotas, prompts
```

## Juridique

Le pied de page affiche partout : « Réponses générées par une intelligence artificielle, elles peuvent contenir des erreurs. Relisez avant d'envoyer. » Les pages `/mentions-legales` et `/confidentialite` contiennent les champs à compléter. La suppression de compte (`/app/compte`) efface conversations, messages, fiche et profil ; les `usage_events` sont conservés anonymisés (`user_id` et `conversation_id` mis à `null`).
