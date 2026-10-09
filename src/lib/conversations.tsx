import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { deleteConversation, listConversations, renameConversation, type Conversation } from "./api";

interface ConversationsState {
  conversations: Conversation[];
  loading: boolean;
  reload: () => Promise<void>;
  upsert: (c: Conversation) => void;
  rename: (id: string, title: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const Ctx = createContext<ConversationsState | null>(null);

export function ConversationsProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const { conversations: list } = await listConversations();
      setConversations(list);
    } catch {
      /* l'erreur est visible ailleurs */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const upsert = useCallback((c: Conversation) => {
    setConversations((prev) => {
      const others = prev.filter((x) => x.id !== c.id);
      return [c, ...others].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    });
  }, []);

  const rename = useCallback(async (id: string, title: string) => {
    const { conversation } = await renameConversation(id, title);
    setConversations((prev) => prev.map((c) => (c.id === id ? conversation : c)));
  }, []);

  const remove = useCallback(async (id: string) => {
    await deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const value = useMemo(
    () => ({ conversations, loading, reload, upsert, rename, remove }),
    [conversations, loading, reload, upsert, rename, remove],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConversations(): ConversationsState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConversations hors du ConversationsProvider");
  return ctx;
}
