import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type Plan } from "@/lib/api";
import { dateFr, usd } from "@/lib/format";

interface AdminData {
  month: {
    trial_usd: number;
    pro_usd: number;
    other_usd: number;
    total_usd: number;
    credit_usd: number;
    paid_reserve_usd: number;
    trial_pool_budget_usd: number;
    trial_pool_remaining_usd: number;
    credit_remaining_usd: number;
    events: number;
  };
  thresholds: Record<string, number>;
  model: string;
  accounts_by_plan: Array<{ plan: Plan; accounts: number }>;
  top_users: Array<{ user_id: string; email: string; plan: Plan; created_at: string; lifetime_usd: number; month_usd: number; events: number }>;
  waitlist: Array<{ email: string; created_at: string }>;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="glass rounded-lg p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<AdminData>("/api/admin"));
      setForbidden(false);
    } catch (err) {
      const e = err as { status?: number; message: string };
      if (e.status === 403 || e.status === 401) setForbidden(true);
      else toast.error(e.message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setPlan = async (userId: string, plan: Plan) => {
    setBusy(userId);
    try {
      await api("/api/admin", { method: "POST", body: JSON.stringify({ user_id: userId, plan }) });
      toast.success(`Compte passé en ${plan}.`);
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (forbidden) {
    return (
      <PublicLayout>
        <div className="container max-w-xl py-16 text-center">
          <h1 className="text-2xl font-bold">Accès réservé</h1>
          <p className="mt-2 text-muted-foreground">Cette page est réservée aux adresses listées dans ADMIN_EMAILS.</p>
          <Button asChild className="mt-6">
            <Link href="/app">Retour à l'application</Link>
          </Button>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container max-w-5xl space-y-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
            <p className="text-sm text-muted-foreground">Mois calendaire UTC en cours · modèle {data?.model ?? "…"}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" /> Actualiser
          </Button>
        </div>

        {!data ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Essais ce mois" value={usd(data.month.trial_usd)} hint={`Budget essais : ${usd(data.month.trial_pool_budget_usd, 0)}`} />
              <Stat label="Abonnés ce mois" value={usd(data.month.pro_usd)} hint={`Réserve : ${usd(data.month.paid_reserve_usd, 0)}`} />
              <Stat label="Total ce mois" value={usd(data.month.total_usd)} hint={`${data.month.events} réponses · crédit ${usd(data.month.credit_usd, 0)}`} />
              <Stat
                label="Reste avant la réserve"
                value={usd(data.month.trial_pool_remaining_usd)}
                hint={`Reste total du crédit : ${usd(data.month.credit_remaining_usd)}`}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr,2fr]">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-base">Comptes par plan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {(["trial", "pro", "blocked"] as Plan[]).map((plan) => (
                    <div key={plan} className="flex items-center justify-between">
                      <span className="capitalize">{plan}</span>
                      <span className="font-semibold">{data.accounts_by_plan.find((a) => a.plan === plan)?.accounts ?? 0}</span>
                    </div>
                  ))}
                  <div className="border-t border-border/60 pt-2 text-xs text-muted-foreground">
                    Seuils : soft {usd(data.thresholds.trialSoftCapUsd, 0)} · dur {usd(data.thresholds.hardCapUsd, 0)} · pro {usd(data.thresholds.paidMonthlyCapUsd, 0)}/mois
                  </div>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-base">Liste d'attente ({data.waitlist.length})</CardTitle>
                  <CardDescription>Emails à prévenir à l'ouverture des abonnements.</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.waitlist.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Personne pour l'instant.</p>
                  ) : (
                    <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                      {data.waitlist.map((w) => (
                        <li key={w.email} className="flex justify-between gap-2">
                          <span className="truncate">{w.email}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{dateFr(w.created_at)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="glass">
              <CardHeader>
                <CardTitle className="text-base">Top 10 utilisateurs du mois</CardTitle>
                <CardDescription>Passer un compte en pro active un payant sans Stripe. Bloqué coupe tout accès.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="pb-2 pr-3 font-medium">Email</th>
                      <th className="pb-2 pr-3 font-medium">Plan</th>
                      <th className="pb-2 pr-3 text-right font-medium">Mois</th>
                      <th className="pb-2 pr-3 text-right font-medium">À vie</th>
                      <th className="pb-2 pr-3 text-right font-medium">Réponses</th>
                      <th className="pb-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top_users.map((u) => (
                      <tr key={u.user_id} className="border-t border-border/60">
                        <td className="max-w-[14rem] truncate py-2 pr-3">{u.email}</td>
                        <td className="py-2 pr-3">
                          <Badge variant={u.plan === "pro" ? "default" : u.plan === "blocked" ? "destructive" : "secondary"}>{u.plan}</Badge>
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">{usd(u.month_usd, 3)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{usd(u.lifetime_usd, 3)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{u.events}</td>
                        <td className="py-2">
                          <div className="flex gap-1">
                            {(["trial", "pro", "blocked"] as Plan[])
                              .filter((p) => p !== u.plan)
                              .map((p) => (
                                <Button
                                  key={p}
                                  size="sm"
                                  variant={p === "blocked" ? "destructive" : "secondary"}
                                  className="h-7 px-2 text-xs"
                                  disabled={busy === u.user_id}
                                  onClick={() => void setPlan(u.user_id, p)}
                                >
                                  → {p}
                                </Button>
                              ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {data.top_users.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-muted-foreground">
                          Aucun utilisateur.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PublicLayout>
  );
}
