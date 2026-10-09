import { ArrowRight, Check } from "lucide-react";
import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Monogram } from "@/components/Monogram";
import { TaskIcon } from "@/components/TaskIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { brand } from "@/config/brand";
import { TASKS } from "@/config/tasks";

const EXAMPLES = [
  {
    task: TASKS[0],
    input: "« Travail bâclé, j'attends encore qu'on me rappelle » — 2 étoiles",
    output: "Merci pour votre retour, Julie. Un rappel qui tarde, ce n'est pas ce que nous voulons. Je vous appelle demain matin pour voir ensemble ce qu'on arrange.",
  },
  {
    task: TASKS[3],
    input: "Facture F-2026-031, 850 €, échéance dépassée de 15 jours, première relance par SMS",
    output: "Bonjour M. Martin, sauf erreur la facture F-2026-031 (850 €) reste à régler. Un oubli sûrement : pouvez-vous régulariser sous 8 jours ? Merci, Dubois Rénovation.",
  },
  {
    task: TASKS[1],
    input: "Terrasse bois terminée chez un client de Sedan, photo avant/après",
    output: "Avant : une dalle grise. Après : 30 m² de terrasse en pin traité, prête pour l'été. Un chantier de quatre jours à Sedan. Vous avez un projet ? Devis sur simple message.",
  },
];

const POINTS = [
  "Il connaît ta fiche : nom, métier, ville, horaires, tarifs, ton.",
  "Il n'invente ni prix, ni date, ni garantie : il demande.",
  "Textes courts, en français, prêts à coller dans Google, Facebook, tes mails ou tes SMS.",
  "Pensé pour le téléphone, sur le chantier ou derrière le comptoir.",
];

export function HomePage() {
  return (
    <PublicLayout>
      <section className="bg-gradient-hero">
        <div className="container flex flex-col items-start gap-6 py-14 sm:py-20">
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-medium">
            Pour les artisans, commerçants et indépendants des {brand.region}
          </Badge>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
            <span className="text-gradient">{brand.tagline}</span>
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">{brand.promise}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="glow">
              <Link href="/login?mode=signup">
                Essayer gratuitement <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="/login">J'ai déjà un compte</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Essai gratuit sans carte bancaire. Ensuite {brand.price}, résiliable à tout moment. {brand.aiNoticeShort}
          </p>
        </div>
      </section>

      <section className="container py-10 sm:py-14">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">Trois exemples de ce qu'il fait</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {EXAMPLES.map(({ task, input, output }) => (
            <Card key={task.key} className="glass flex flex-col">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <TaskIcon name={task.icon} className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{task.title}</CardTitle>
                <CardDescription>{input}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm leading-relaxed">{output}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container pb-14">
        <div className="glass grid gap-8 rounded-lg p-6 sm:p-10 md:grid-cols-[auto,1fr]">
          <Monogram size="lg" />
          <div>
            <h2 className="mb-4 text-2xl font-bold tracking-tight">Pas un chat généraliste</h2>
            <ul className="space-y-3">
              {POINTS.map((p) => (
                <li key={p} className="flex gap-3 text-sm leading-relaxed sm:text-base">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-2">
              {TASKS.map((t) => (
                <Badge key={t.key} variant="outline" className="rounded-full font-normal">
                  {t.title}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
