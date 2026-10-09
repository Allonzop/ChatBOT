import { Mail, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Monogram } from "@/components/Monogram";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { brand } from "@/config/brand";
import { useAuth } from "@/lib/auth";
import { supabase, supabaseConfigured } from "@/lib/supabase";

type Mode = "signin" | "signup" | "magic";

export function LoginPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const next = params.get("next") || "/app";
  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && user) navigate(next, { replace: true });
  }, [loading, user, next, navigate]);

  const redirectTo = `${window.location.origin}${next.startsWith("/") ? next : "/app"}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseConfigured) {
      toast.error("Supabase n'est pas configuré (SUPABASE_URL / SUPABASE_ANON_KEY).");
      return;
    }
    setBusy(true);
    try {
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
        if (error) throw error;
        setSent("Un lien de connexion vient de partir. Ouvre-le depuis ce téléphone ou cet ordinateur.");
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
        if (error) throw error;
        if (data.session) navigate(next, { replace: true });
        else setSent("Compte créé. Confirme ton adresse depuis le mail que tu viens de recevoir, puis connecte-toi.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(next, { replace: true });
      }
    } catch (err) {
      const message = (err as Error).message || "Connexion impossible.";
      toast.error(
        /invalid login credentials/i.test(message)
          ? "Email ou mot de passe incorrect."
          : /already registered/i.test(message)
            ? "Cette adresse a déjà un compte. Connecte-toi."
            : message,
      );
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<Mode, string> = {
    signin: "Se connecter",
    signup: "Créer mon compte",
    magic: "Recevoir un lien de connexion",
  };

  return (
    <PublicLayout>
      <div className="container flex justify-center py-10 sm:py-16">
        <Card className="glass w-full max-w-md">
          <CardHeader className="items-center text-center">
            <Monogram size="lg" className="mb-3" />
            <CardTitle className="text-2xl">{titles[mode]}</CardTitle>
            <CardDescription>
              {mode === "signup" ? `Essai gratuit, sans carte bancaire. Ensuite ${brand.price}.` : `Ton espace ${brand.name}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4 text-center">
                <p className="text-sm leading-relaxed">{sent}</p>
                <Button variant="ghost" onClick={() => setSent(null)}>
                  Retour
                </Button>
              </div>
            ) : (
              <form onSubmit={(e) => void submit(e)} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="toi@exemple.fr"
                  />
                </div>
                {mode !== "magic" && (
                  <div className="space-y-1.5">
                    <label htmlFor="password" className="text-sm font-medium">
                      Mot de passe
                    </label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === "signup" ? "8 caractères minimum" : "Ton mot de passe"}
                    />
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Un instant…" : mode === "magic" ? <><Wand2 className="h-4 w-4" /> Envoyer le lien</> : titles[mode]}
                </Button>
                <div className="flex flex-col gap-2 pt-2 text-center text-sm text-muted-foreground">
                  {mode !== "magic" ? (
                    <button type="button" className="inline-flex items-center justify-center gap-1.5 hover:text-foreground" onClick={() => setMode("magic")}>
                      <Mail className="h-4 w-4" /> Me connecter par lien magique
                    </button>
                  ) : (
                    <button type="button" className="hover:text-foreground" onClick={() => setMode("signin")}>
                      Me connecter avec un mot de passe
                    </button>
                  )}
                  {mode === "signup" ? (
                    <button type="button" className="hover:text-foreground" onClick={() => setMode("signin")}>
                      J'ai déjà un compte
                    </button>
                  ) : (
                    <button type="button" className="hover:text-foreground" onClick={() => setMode("signup")}>
                      Pas encore de compte ? Essai gratuit
                    </button>
                  )}
                </div>
              </form>
            )}
            <p className="mt-6 text-center text-xs text-muted-foreground">
              En continuant tu acceptes nos{" "}
              <Link href="/mentions-legales" className="underline">
                mentions légales
              </Link>{" "}
              et notre{" "}
              <Link href="/confidentialite" className="underline">
                politique de confidentialité
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
