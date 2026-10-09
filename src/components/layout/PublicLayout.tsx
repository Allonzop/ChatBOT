import { Link } from "wouter";
import type { ReactNode } from "react";
import { Monogram } from "@/components/Monogram";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { useAuth } from "@/lib/auth";
import { Footer } from "./Footer";

export function PublicLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 glass">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <Monogram size="sm" />
            <span className="font-semibold tracking-tight">{brand.name}</span>
          </Link>
          <nav className="flex items-center gap-2">
            {user ? (
              <Button asChild size="sm">
                <Link href="/app">Mon espace</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link href="/login">Se connecter</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/login?mode=signup">Essai gratuit</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
