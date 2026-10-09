import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { EMPTY_PROFILE, getProfile, saveProfile, type BusinessProfile } from "@/lib/api";

type Key = keyof BusinessProfile;

const FIELDS: Array<{ key: Key; label: string; help?: string; placeholder: string; multiline?: boolean }> = [
  { key: "nom_entreprise", label: "Nom de l'entreprise", placeholder: "Ex. Dubois Rénovation" },
  { key: "metier", label: "Métier", placeholder: "Ex. plombier-chauffagiste, boulangerie, coiffure à domicile" },
  { key: "ville", label: "Ville", placeholder: "Ex. Charleville-Mézières" },
  { key: "zone_intervention", label: "Zone d'intervention", placeholder: "Ex. 30 km autour de Sedan, tout le 08", multiline: true },
  { key: "horaires", label: "Horaires", placeholder: "Ex. du lundi au vendredi 8h-18h, samedi matin sur rendez-vous", multiline: true },
  {
    key: "tarifs_indicatifs",
    label: "Tarifs indicatifs",
    help: "Ce que l'assistant a le droit de citer. S'il manque un prix, il demandera au lieu d'inventer.",
    placeholder: "Ex. déplacement 35 €, taux horaire 45 € HT, devis gratuit",
    multiline: true,
  },
  { key: "signature", label: "Signature", help: "Ajoutée en fin de mail ou de SMS.", placeholder: "Ex. Marc Dubois, Dubois Rénovation, 06 00 00 00 00", multiline: true },
  {
    key: "infos_libres",
    label: "Autres informations",
    help: "Spécialités, certifications réelles, délais habituels, ce que tu ne fais pas, tout ce qui aide à écrire juste.",
    placeholder: "Ex. RGE QualiPAC, pas de dépannage le dimanche, paiement en 3 fois possible",
    multiline: true,
  },
];

export function ProfilPage() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getProfile()
      .then(({ profile: p }) => setProfile({ ...EMPTY_PROFILE, ...(p ?? {}) }))
      .catch((err: Error) => {
        toast.error(err.message);
        setProfile({ ...EMPTY_PROFILE });
      });
  }, []);

  const set = (key: Key, value: string) => setProfile((p) => (p ? { ...p, [key]: value } : p));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    try {
      const { profile: saved } = await saveProfile(profile);
      setProfile({ ...EMPTY_PROFILE, ...saved });
      toast.success("Fiche enregistrée. Les prochaines réponses en tiennent compte.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container max-w-2xl py-6 sm:py-8">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-2xl">Ma fiche entreprise</CardTitle>
          <CardDescription>
            C'est ce que l'assistant connaît de toi. Il l'utilise à chaque réponse et n'invente rien qui n'y figure pas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!profile ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <form onSubmit={(e) => void submit(e)} className="space-y-5">
              {FIELDS.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <label htmlFor={f.key} className="text-sm font-medium">
                    {f.label}
                  </label>
                  {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
                  {f.multiline ? (
                    <Textarea id={f.key} value={profile[f.key]} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} rows={3} />
                  ) : (
                    <Input id={f.key} value={profile[f.key]} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
                  )}
                </div>
              ))}

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Ton avec les clients</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(["vouvoiement", "tutoiement"] as const).map((t) => (
                    <label
                      key={t}
                      className={`flex cursor-pointer items-center justify-center rounded-md border px-3 py-2.5 text-sm transition ${
                        profile.ton === t ? "border-primary bg-primary/15 font-medium" : "border-input hover:bg-secondary"
                      }`}
                    >
                      <input type="radio" name="ton" value={t} checked={profile.ton === t} onChange={() => set("ton", t)} className="sr-only" />
                      {t === "vouvoiement" ? "Vouvoiement" : "Tutoiement"}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={busy}>
                  <Save className="h-4 w-4" /> {busy ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
