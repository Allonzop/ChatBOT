import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { TaskIcon } from "@/components/TaskIcon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { buildFirstMessage, buildTitle, type TaskDefinition } from "@/config/tasks";
import { createConversation } from "@/lib/api";
import { useConversations } from "@/lib/conversations";
import { setPendingMessage } from "@/lib/pending";

export function TaskDialog({ task, onClose }: { task: TaskDefinition | null; onClose: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [, navigate] = useLocation();
  const { upsert } = useConversations();

  const set = (name: string, value: string) => setValues((v) => ({ ...v, [name]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    const message = buildFirstMessage(task, values);
    if (!message.trim()) return;
    setBusy(true);
    try {
      const { conversation } = await createConversation(task.key, buildTitle(task, values));
      upsert(conversation);
      setPendingMessage(conversation.id, message);
      setValues({});
      onClose();
      navigate(`/app/c/${conversation.id}`);
    } catch (err) {
      toast.error((err as Error).message || "Impossible de démarrer la conversation.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={Boolean(task)}
      onOpenChange={(open) => {
        if (!open) {
          setValues({});
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        {task && (
          <form onSubmit={(e) => void submit(e)} className="space-y-5">
            <DialogHeader>
              <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <TaskIcon name={task.icon} className="h-5 w-5" />
              </div>
              <DialogTitle>{task.title}</DialogTitle>
              <DialogDescription>{task.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {task.fields.map((field) => {
                const id = `field-${field.name}`;
                const value = values[field.name] ?? (field.type === "select" ? (field.options?.[0]?.value ?? "") : "");
                return (
                  <div key={field.name} className="space-y-1.5">
                    <label htmlFor={id} className="text-sm font-medium">
                      {field.label}
                      {field.required && <span className="text-primary"> *</span>}
                    </label>
                    {field.type === "textarea" ? (
                      <Textarea
                        id={id}
                        value={value}
                        onChange={(e) => set(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                        rows={4}
                        maxLength={4000}
                      />
                    ) : field.type === "select" ? (
                      <select
                        id={id}
                        value={value}
                        onChange={(e) => set(field.name, e.target.value)}
                        required={field.required}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {field.options?.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id={id}
                        value={value}
                        onChange={(e) => set(field.name, e.target.value)}
                        placeholder={field.placeholder}
                        required={field.required}
                        maxLength={300}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Un instant…" : "Rédiger"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
