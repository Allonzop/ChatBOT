import { BellRing, CreditCard, Lock } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { brand } from "@/config/brand";
import { useAccount } from "@/lib/account";
import { joinWaitlist, startCheckout, type PaywallKind } from "@/lib/api";

const COPY: Record<Exclude<PaywallKind, null>, { title: string; body: string }> = {
  soft: {
    title: "Ton essai est terminé",
    body: `Tu as utilisé tout ton essai gratuit. Passe à l'abonnement (${brand.price}) pour continuer à écrire sans limite raisonnable.`,
  },
  pool: {
    title: "Les essais gratuits sont complets ce mois-ci",
    body: "Reviens le 1er du mois prochain, ou abonne-toi pour continuer dès maintenant.",
  },
  hard: {
    title: "Plafond d'utilisation atteint",
    body: `Ce compte a atteint le plafond prévu pour un essai. Écris-nous à ${brand.contactEmail} pour continuer.`,
  },
  paid_cap: {
    title: "Quota du mois atteint",
    body: "Ton abonnement a atteint son quota mensuel. Il se remet à zéro le 1er du mois prochain.",
  },
  blocked: {
    title: "Compte bloqué",
    body: `Ce compte est bloqué. Si tu penses que c'est une erreur, écris-nous à ${brand.contactEmail}.`,
  },
};

/** Bouton d'abonnement ou « Me prévenir » selon que Stripe est configuré. */
export function SubscribeButton({ size = "default" }: { size?: "default" | "sm" | "lg" }) {
  const { info } = useAccount();
  const [busy, setBusy] = useState(false);
  const [notified, setNotified] = useState(false);
  const stripeEnabled = info?.billing.stripe_enabled ?? false;

  const onClick = async () => {
    setBusy(true);
    try {
      if (stripeEnabled) {
        const { url } = await startCheckout();
        window.location.href = url;
      } else {
        await joinWaitlist();
        setNotified(true);
        toast.success("C'est noté, on te prévient dès l'ouverture des abonnements.");
      }
    } catch (err) {
      toast.error((err as Error).message || "Action impossible pour le moment.");
    } finally {
      setBusy(false);
    }
  };

  if (!stripeEnabled && notified) {
    return (
      <Button size={size} variant="secondary" disabled>
        <BellRing className="h-4 w-4" /> On te prévient
      </Button>
    );
  }
  return (
    <Button size={size} onClick={() => void onClick()} disabled={busy}>
      {stripeEnabled ? (
        <>
          <CreditCard className="h-4 w-4" /> M'abonner · {brand.price}
        </>
      ) : (
        <>
          <BellRing className="h-4 w-4" /> Me prévenir à l'ouverture
        </>
      )}
    </Button>
  );
}

export function Paywall({ kind, compact = false }: { kind: Exclude<PaywallKind, null>; compact?: boolean }) {
  const copy = COPY[kind];
  const canSubscribe = kind === "soft" || kind === "pool";
  return (
    <Card className={`glow border-primary/30 ${compact ? "" : "mx-auto max-w-lg"}`}>
      <CardHeader>
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Lock className="h-5 w-5" />
        </div>
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription className="text-sm leading-relaxed">{copy.body}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {canSubscribe && <SubscribeButton />}
        <Button asChild variant="ghost">
          <Link href="/app/compte">Voir mon compte</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
