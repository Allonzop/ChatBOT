import { ArrowRight, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { TaskDialog } from "@/components/chat/TaskDialog";
import { Paywall } from "@/components/Paywall";
import { TaskIcon } from "@/components/TaskIcon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TASKS, type TaskDefinition } from "@/config/tasks";
import { useAccount } from "@/lib/account";
import { getProfile, isProfileEmpty, paywallKind, type BusinessProfile } from "@/lib/api";

export function DashboardPage() {
  const [profile, setProfile] = useState<BusinessProfile | null | undefined>(undefined);
  const [task, setTask] = useState<TaskDefinition | null>(null);
  const { info } = useAccount();

  useEffect(() => {
    getProfile()
      .then(({ profile: p }) => setProfile(p))
      .catch(() => setProfile(null));
  }, []);

  const empty = profile !== undefined && isProfileEmpty(profile);
  const kind = info && !info.quota.allowed ? paywallKind(info.quota.code) : null;

  return (
    <div className="container max-w-5xl space-y-6 py-6 sm:py-8">
      {profile === undefined ? (
        <Skeleton className="h-24 w-full" />
      ) : empty ? (
        <Card className="glow flex flex-col gap-4 border-primary/30 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Remplis ta fiche, c'est ce qui rend les réponses justes</p>
              <p className="text-sm text-muted-foreground">Nom, métier, ville, horaires, tarifs, ton : deux minutes, une seule fois.</p>
            </div>
          </div>
          <Button asChild className="shrink-0">
            <Link href="/app/profil">
              Remplir ma fiche <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {profile?.nom_entreprise ? `Bonjour, ${profile.nom_entreprise}` : "Que veux-tu écrire ?"}
            </h1>
            <p className="text-sm text-muted-foreground">Choisis une tâche, réponds à deux ou trois questions, copie le texte.</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/app/profil">Modifier ma fiche</Link>
          </Button>
        </div>
      )}

      {kind && <Paywall kind={kind} compact />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TASKS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTask(t)}
            className="glass group flex min-h-[7.5rem] flex-col items-start gap-3 rounded-lg p-4 text-left transition hover:border-primary/50 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
              <TaskIcon name={t.icon} className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-semibold leading-snug">{t.title}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{t.description}</span>
            </span>
          </button>
        ))}
      </div>

      <TaskDialog task={task} onClose={() => setTask(null)} />
    </div>
  );
}
