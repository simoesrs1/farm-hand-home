import type { RefObject } from "react";
import { gsap, revealOnScroll, useGSAP } from "@/lib/animation";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Mostra os elementos `selector` (dentro de `scope`) à medida que entram no ecrã.
 * `deps`: dados que mudam a lista (ex.: número de cartões carregados).
 * Com movimento reduzido ou animações pausadas, os elementos aparecem logo.
 */
export const useReveal = (scope: RefObject<HTMLElement>, selector: string, deps: unknown[] = []) => {
  const reducedMotion = useReducedMotion();

  useGSAP(
    () => {
      if (reducedMotion || !scope.current) return;
      const targets = gsap.utils.toArray<Element>(selector, scope.current);
      if (targets.length) revealOnScroll(targets);
    },
    { scope, dependencies: [reducedMotion, ...deps], revertOnUpdate: true },
  );
};
