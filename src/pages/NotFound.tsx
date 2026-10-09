import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <PublicLayout>
      <div className="container max-w-xl py-20 text-center">
        <p className="text-6xl font-extrabold text-gradient">404</p>
        <p className="mt-3 text-muted-foreground">Cette page n'existe pas.</p>
        <Button asChild className="mt-6">
          <Link href="/">Retour à l'accueil</Link>
        </Button>
      </div>
    </PublicLayout>
  );
}
