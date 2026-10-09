import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

/** Monogramme CSS : pas de logo, les couleurs primaire et accent suffisent. */
export function Monogram({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-16 w-16 text-xl" };
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-lg bg-gradient-primary font-extrabold tracking-tight text-primary-foreground shadow-glow",
        sizes[size],
        className,
      )}
    >
      {brand.monogram}
    </span>
  );
}
