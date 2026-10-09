import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { TaskIcon } from "@/components/TaskIcon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TASK_BY_KEY } from "@/config/tasks";
import type { Conversation } from "@/lib/api";
import { useConversations } from "@/lib/conversations";
import { relativeFr } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ConversationList({ onNavigate }: { onNavigate?: () => void }) {
  const { conversations, loading, rename, remove } = useConversations();
  const [location, navigate] = useLocation();
  const [renaming, setRenaming] = useState<Conversation | null>(null);
  const [deleting, setDeleting] = useState<Conversation | null>(null);
  const [title, setTitle] = useState("");

  const submitRename = async () => {
    if (!renaming) return;
    const next = title.trim();
    if (!next) return;
    try {
      await rename(renaming.id, next);
      setRenaming(null);
    } catch {
      toast.error("Renommage impossible, réessaie.");
    }
  };

  const submitDelete = async () => {
    if (!deleting) return;
    try {
      await remove(deleting.id);
      if (location === `/app/c/${deleting.id}`) navigate("/app");
      setDeleting(null);
      onNavigate?.();
    } catch {
      toast.error("Suppression impossible, réessaie.");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 pb-2 pt-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Historique</p>
        <Button asChild size="sm" variant="ghost" className="h-8 gap-1 px-2 text-xs">
          <Link href="/app" onClick={onNavigate}>
            <Plus className="h-3.5 w-3.5" /> Nouvelle
          </Link>
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {loading ? (
          <div className="space-y-2 px-1">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : conversations.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">Aucune conversation pour l'instant. Choisis une tâche pour commencer.</p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((c) => {
              const active = location === `/app/c/${c.id}`;
              const task = TASK_BY_KEY[c.task_key];
              return (
                <li key={c.id} className="group relative">
                  <Link
                    href={`/app/c/${c.id}`}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-start gap-2.5 rounded-md px-2.5 py-2 pr-9 text-sm transition-colors hover:bg-secondary",
                      active && "bg-secondary",
                    )}
                  >
                    <TaskIcon name={task?.icon ?? "sparkles"} className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{c.title}</span>
                      <span className="block text-xs text-muted-foreground">{relativeFr(c.updated_at)}</span>
                    </span>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1.5 h-7 w-7 opacity-70 focus:opacity-100 group-hover:opacity-100"
                        aria-label="Actions"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() => {
                          setRenaming(c);
                          setTitle(c.title);
                        }}
                      >
                        <Pencil className="h-4 w-4" /> Renommer
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleting(c)}>
                        <Trash2 className="h-4 w-4" /> Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={Boolean(renaming)} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer la conversation</DialogTitle>
            <DialogDescription>Un titre court pour la retrouver dans l'historique.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitRename();
            }}
            className="space-y-4"
          >
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} autoFocus />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setRenaming(null)}>
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette conversation ?</DialogTitle>
            <DialogDescription>« {deleting?.title} » et ses messages seront effacés. Cette action est définitive.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={() => void submitDelete()}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
