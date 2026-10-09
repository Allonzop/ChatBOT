import { SendHorizontal, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ChatInput({
  disabled,
  streaming,
  onSend,
  onStop,
}: {
  disabled?: boolean;
  streaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  const submit = () => {
    const text = value.trim();
    if (!text || streaming || disabled) return;
    onSend(text);
    setValue("");
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="glass flex items-end gap-2 rounded-lg p-2"
    >
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={disabled ? "Envoi impossible pour le moment" : "Précise, corrige, demande une variante…"}
        rows={1}
        disabled={disabled}
        maxLength={6000}
        className="min-h-[40px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
      />
      {streaming ? (
        <Button type="button" size="icon" variant="secondary" onClick={onStop} aria-label="Arrêter">
          <Square className="h-4 w-4" />
        </Button>
      ) : (
        <Button type="submit" size="icon" disabled={disabled || !value.trim()} aria-label="Envoyer">
          <SendHorizontal className="h-4 w-4" />
        </Button>
      )}
    </form>
  );
}
