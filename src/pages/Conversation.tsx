import { AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { Paywall } from "@/components/Paywall";
import { TaskIcon } from "@/components/TaskIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TASK_BY_KEY, taskLabel } from "@/config/tasks";
import { useAccount } from "@/lib/account";
import { ApiError, getConversation, paywallKind, streamChat, type Conversation, type Message, type PaywallKind } from "@/lib/api";
import { useConversations } from "@/lib/conversations";
import { takePendingMessage } from "@/lib/pending";

let tempCounter = 0;
const tempId = () => `tmp-${Date.now()}-${tempCounter++}`;

export function ConversationPage({ id }: { id: string }) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [paywall, setPaywall] = useState<PaywallKind>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const { upsert } = useConversations();
  const { reload: reloadAccount } = useAccount();

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, []);

  const send = useCallback(
    async (text: string) => {
      if (streaming) return;
      setPaywall(null);
      setUnavailable(null);
      const userMsg: Message = { id: tempId(), role: "user", content: text, created_at: new Date().toISOString() };
      const assistantMsg: Message = { id: tempId(), role: "assistant", content: "", created_at: new Date().toISOString(), pending: true };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      const patchAssistant = (patch: Partial<Message> | ((m: Message) => Message)) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsg.id ? (typeof patch === "function" ? patch(m) : { ...m, ...patch }) : m)),
        );

      await streamChat(
        id,
        text,
        {
          onStart: (info) => setMessages((prev) => prev.map((m) => (m.id === userMsg.id ? { ...m, id: info.user_message_id } : m))),
          onText: (delta) => patchAssistant((m) => ({ ...m, content: m.content + delta })),
          onDone: (info) => {
            patchAssistant((m) => ({ ...m, pending: false, id: info.assistant_message_id ?? m.id }));
            if (conversation) upsert({ ...conversation, updated_at: new Date().toISOString() });
            void reloadAccount();
          },
          onError: (err: ApiError) => {
            const kind = err.status === 402 ? paywallKind(err.code) : null;
            setMessages((prev) => prev.filter((m) => m.id !== assistantMsg.id && (kind || err.status === 503 ? m.id !== userMsg.id : true)));
            if (kind) {
              setPaywall(kind);
            } else if (err.code === "provider_unavailable") {
              setUnavailable("Service momentanément indisponible, les abonnés seront prévenus.");
            } else if (err.code === "provider_busy") {
              setUnavailable("Service saturé, réessaie dans une minute.");
            } else if (err.status === 401) {
              toast.error("Session expirée, reconnecte-toi.");
              navigate("/login");
            } else {
              toast.error(err.message);
            }
          },
        },
        controller.signal,
      );
      // Arrêt par l'utilisateur ou fin de flux : on fige la bulle.
      patchAssistant((m) => ({ ...m, pending: false }));
      setStreaming(false);
      abortRef.current = null;
    },
    [id, streaming, conversation, upsert, reloadAccount, navigate],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);
    setPaywall(null);
    setUnavailable(null);
    getConversation(id)
      .then(({ conversation: c, messages: list }) => {
        if (!active) return;
        setConversation(c);
        setMessages(list);
        setLoading(false);
      })
      .catch((err: ApiError) => {
        if (!active) return;
        setLoading(false);
        if (err.status === 404) setNotFound(true);
        else toast.error(err.message);
      });
    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, [id]);

  // Premier message venu d'une tuile : envoyé dès que la conversation est chargée.
  const pendingSent = useRef<string | null>(null);
  useEffect(() => {
    if (loading || !conversation || pendingSent.current === id) return;
    const pending = takePendingMessage(id);
    pendingSent.current = id;
    if (pending) void send(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, conversation, id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  if (notFound) {
    return (
      <div className="container max-w-3xl py-10 text-center">
        <p className="text-muted-foreground">Cette conversation n'existe pas ou a été supprimée.</p>
        <Button className="mt-4" onClick={() => navigate("/app")}>
          Retour au tableau de bord
        </Button>
      </div>
    );
  }

  const task = conversation ? TASK_BY_KEY[conversation.task_key] : undefined;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/60 px-4 py-2.5">
        <div className="container flex max-w-3xl items-center gap-2 px-0">
          {loading ? (
            <Skeleton className="h-5 w-48" />
          ) : (
            <>
              <TaskIcon name={task?.icon ?? "sparkles"} className="h-4 w-4 shrink-0 text-primary" />
              <h1 className="truncate text-sm font-semibold">{conversation?.title}</h1>
              <Badge variant="outline" className="ml-auto hidden shrink-0 font-normal sm:inline-flex">
                {taskLabel(conversation?.task_key ?? "libre")}
              </Badge>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="container max-w-3xl space-y-4 px-0">
          {loading ? (
            <>
              <Skeleton className="ml-auto h-16 w-2/3" />
              <Skeleton className="h-28 w-4/5" />
            </>
          ) : (
            messages.map((m) => <MessageBubble key={m.id} message={m} />)
          )}
          {paywall && <Paywall kind={paywall} compact />}
          {unavailable && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p>{unavailable}</p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="px-4 pb-3 pt-1">
        <div className="container max-w-3xl px-0">
          <ChatInput
            streaming={streaming}
            disabled={loading || Boolean(paywall)}
            onSend={(text) => void send(text)}
            onStop={() => abortRef.current?.abort()}
          />
        </div>
      </div>
    </div>
  );
}
