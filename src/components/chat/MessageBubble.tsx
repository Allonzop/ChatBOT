import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Monogram } from "@/components/Monogram";
import { Button } from "@/components/ui/button";
import type { Message } from "@/lib/api";
import { copyText } from "@/lib/format";
import { cn } from "@/lib/utils";

export function MessageBubble({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const onCopy = async () => {
    if (await copyText(message.content)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className={cn("flex gap-3 animate-fade-in", isUser && "justify-end")}>
      {!isUser && <Monogram size="sm" className="mt-1 hidden sm:inline-flex" />}
      <div className={cn("group relative max-w-[92%] sm:max-w-[80%]", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "whitespace-pre-wrap break-words rounded-lg px-4 py-3 text-[15px] leading-relaxed",
            isUser ? "bg-primary text-primary-foreground" : "glass",
          )}
        >
          {message.content}
          {message.pending && !message.content && <span className="inline-block h-4 w-2 animate-pulse-soft bg-foreground/60 align-middle" />}
          {message.pending && message.content && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse-soft bg-foreground/60 align-middle" />}
        </div>
        {!isUser && !message.pending && message.content && (
          <div className="mt-1 flex justify-start">
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs text-muted-foreground" onClick={() => void onCopy()}>
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copié" : "Copier"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
