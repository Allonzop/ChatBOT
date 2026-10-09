import { LogOut, Menu, Settings, ShieldCheck, Store, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Monogram } from "@/components/Monogram";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { brand } from "@/config/brand";
import { useAuth } from "@/lib/auth";
import { ConversationsProvider } from "@/lib/conversations";
import { AiNotice } from "./Footer";
import { ConversationList } from "./ConversationList";

function UserMenu({ isAdmin }: { isAdmin: boolean }) {
  const { user, signOut } = useAuth();
  const [, navigate] = useLocation();
  const initial = (user?.email ?? "?").slice(0, 1).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Mon compte">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-secondary text-xs font-semibold">{initial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">{user?.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/app/profil")}>
          <Store className="h-4 w-4" /> Fiche entreprise
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/app/compte")}>
          <Settings className="h-4 w-4" /> Compte et plan
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem onSelect={() => navigate("/admin")}>
            <ShieldCheck className="h-4 w-4" /> Administration
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await signOut();
            navigate("/");
          }}
        >
          <LogOut className="h-4 w-4" /> Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children, isAdmin = false }: { children: ReactNode; isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <ConversationsProvider>
      <div className="flex h-dvh flex-col">
        <header className="z-30 glass">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-4">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Historique">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85vw] max-w-sm p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Historique</SheetTitle>
                  <SheetDescription>Tes conversations</SheetDescription>
                </SheetHeader>
                <ConversationList inSheet onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <Link href="/app" className="flex min-w-0 items-center gap-2.5">
              <Monogram size="sm" />
              <span className="truncate font-semibold tracking-tight">{brand.name}</span>
            </Link>
            <div className="ml-auto flex items-center gap-1">
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/app/profil">
                  <UserRound className="h-4 w-4" /> Ma fiche
                </Link>
              </Button>
              <UserMenu isAdmin={isAdmin} />
            </div>
          </div>
        </header>
        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-72 shrink-0 border-r border-border/60 bg-card/40 md:block">
            <ConversationList />
          </aside>
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
            <div className="border-t border-border/60 px-4 py-2 safe-bottom">
              <AiNotice className="text-center text-[11px]" />
            </div>
          </main>
        </div>
      </div>
    </ConversationsProvider>
  );
}
