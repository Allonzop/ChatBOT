import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { SubscribeButton } from "@/components/Paywall";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { brand } from "@/config/brand";
import { useAccount } from "@/lib/account";
import { deleteAccount } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { dateFr, usd } from "@/lib/format";

const PLAN_LABEL = { trial: "Essai gratuit", pro: "Abonné", blocked: "Bloqué" } as const;

function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{pct} %</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-gradient-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ComptePage() {
  const { info, loading, reload } = useAccount();
  const { signOut } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const [confirm, setConfirm] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const checkout = new URLSearchParams(search).get("checkout");
    if (checkout === "success") {
      toast.success("Merci ! Ton abonnement est en cours d'activation.");
      void reload();
    } else if (checkout === "cancel") {
      toast.message("Paiement annulé, rien n'a été débité.");
    }
  }, [search, reload]);

  const onDelete = async () => {
    setBusy(true);
    try {
      await deleteAccount();
      await signOut();
      toast.success("Compte supprimé.");
      navigate("/");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading || !info) {
    return (
      <div className="container max-w-2xl space-y-4 py-8">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const { account, usage, quota, billing } = info;
  const isTrial = account.plan === "trial";
  const cap = isTrial ? quota.trial_soft_cap_usd : quota.paid_monthly_cap_usd;
  const used = isTrial ? usage.lifetime_usd : usage.month_usd;

  return (
    <div className="container max-w-2xl space-y-5 py-6 sm:py-8">
      <Card className="glass">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-2xl">Mon compte</CardTitle>
            <Badge variant={account.plan === "pro" ? "default" : account.plan === "blocked" ? "destructive" : "secondary"}>
              {PLAN_LABEL[account.plan]}
            </Badge>
          </div>
          <CardDescription>
            {account.email} · inscrit le {dateFr(account.created_at)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Meter
            value={used}
            max={cap}
            label={isTrial ? "Essai gratuit consommé" : "Quota du mois consommé"}
          />
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-md bg-secondary/60 p-3">
              <p className="text-xs text-muted-foreground">Messages générés</p>
              <p className="text-lg font-semibold">{usage.messages}</p>
            </div>
            <div className="rounded-md bg-secondary/60 p-3">
              <p className="text-xs text-muted-foreground">Ce mois-ci</p>
              <p className="text-lg font-semibold">{usd(usage.month_usd)}</p>
            </div>
            <div className="rounded-md bg-secondary/60 p-3">
              <p className="text-xs text-muted-foreground">Depuis le début</p>
              <p className="text-lg font-semibold">{usd(usage.lifetime_usd)}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Les montants sont le coût réel des réponses en dollars, à titre indicatif. Un message coûte en général moins d'un centime.
          </p>
          {!quota.allowed && quota.message && (
            <p className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">{quota.message}</p>
          )}
        </CardContent>
      </Card>

      {account.plan !== "pro" && (
        <Card className="glow border-primary/30">
          <CardHeader>
            <CardTitle>Abonnement · {brand.price}</CardTitle>
            <CardDescription>
              {billing.stripe_enabled
                ? "Toutes les tâches, un quota mensuel confortable, résiliable à tout moment."
                : "Les abonnements ouvrent bientôt. Laisse-nous te prévenir, ou écris-nous pour une activation manuelle."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <SubscribeButton />
            {!billing.stripe_enabled && (
              <a className="text-sm text-muted-foreground underline" href={`mailto:${brand.contactEmail}`}>
                {brand.contactEmail}
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {account.plan === "pro" && (
        <Card className="glass">
          <CardHeader>
            <CardTitle>Abonnement actif</CardTitle>
            <CardDescription>
              Statut : {account.stripe_subscription_status ?? "activé manuellement"}. Pour résilier ou changer de moyen de paiement, écris à{" "}
              <a className="underline" href={`mailto:${brand.contactEmail}`}>
                {brand.contactEmail}
              </a>
              .
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base">Supprimer mon compte</CardTitle>
          <CardDescription>
            Efface tes conversations, tes messages, ta fiche et ton profil. Les statistiques d'usage sont conservées de façon anonyme.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setConfirm(true)}>
            <Trash2 className="h-4 w-4" /> Supprimer définitivement
          </Button>
        </CardContent>
      </Card>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ton compte ?</DialogTitle>
            <DialogDescription>Cette action est définitive. Tape « supprimer » pour confirmer.</DialogDescription>
          </DialogHeader>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="supprimer" autoFocus />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Annuler
            </Button>
            <Button variant="destructive" disabled={typed.trim().toLowerCase() !== "supprimer" || busy} onClick={() => void onDelete()}>
              {busy ? "Suppression…" : "Supprimer mon compte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
