import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  /** Texto curto por cima do título (ex.: "Destaques"). */
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  /** h1 no topo de uma página; h2 (por defeito) nas secções. */
  as?: "h1" | "h2";
  className?: string;
}

/** Cabeçalho de secção partilhado: sobretítulo, título e texto. */
const SectionHeading = ({
  eyebrow,
  title,
  description,
  align = "left",
  as: Heading = "h2",
  className,
}: SectionHeadingProps) => (
  <div className={cn(align === "center" && "mx-auto text-center", "max-w-2xl", className)}>
    {eyebrow && (
      <p className="text-sm font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
    )}
    <Heading className="mt-2 text-balance font-display text-3xl text-foreground md:text-4xl">
      {title}
    </Heading>
    {description && (
      <p className={cn("mt-3 text-muted-foreground", align === "center" && "mx-auto max-w-lg")}>
        {description}
      </p>
    )}
  </div>
);

export default SectionHeading;
