import { Link } from "wouter";
import { brand } from "@/config/brand";

export function AiNotice({ className = "" }: { className?: string }) {
  return <p className={`text-xs leading-relaxed text-muted-foreground ${className}`}>{brand.aiNotice}</p>;
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60">
      <div className="container flex flex-col gap-3 py-6 text-xs text-muted-foreground">
        <AiNotice />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>© {new Date().getFullYear()} {brand.company}</span>
          <Link href="/mentions-legales" className="hover:text-foreground">
            Mentions légales
          </Link>
          <Link href="/confidentialite" className="hover:text-foreground">
            Confidentialité
          </Link>
        </div>
      </div>
    </footer>
  );
}
