/**
 * Ponto central das animações (GSAP).
 *
 * - Regista os plugins uma única vez e define as predefinições.
 * - Guarda a preferência "Pausar animações" do utilizador (botão no rodapé).
 * - Exporta animações reutilizáveis. Devem ser chamadas dentro de `useGSAP`
 *   (com `scope`), para a limpeza ser automática ao desmontar o componente.
 *
 * Regras: animar só transform e opacidade; o H1 do hero nunca começa com
 * opacidade 0 (prejudica o LCP); com movimento reduzido não se anima nada.
 */
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flip } from "gsap/Flip";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(useGSAP, ScrollTrigger, Flip, SplitText);
gsap.defaults({ ease: "power3.out", duration: 0.7 });

export { gsap, useGSAP, ScrollTrigger, Flip, SplitText };

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

// ---------- Preferência manual "Pausar animações" ----------

const STORAGE_KEY = "valorrural:animacoes-pausadas";
const listeners = new Set<() => void>();

const readStoredPause = () => {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

let paused = readStoredPause();

/** Classe no <html> para as poucas animações em CSS (ex.: faixa de avaliações). */
const syncRootClass = () => {
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("motion-paused", paused);
  }
};
syncRootClass();

export const getAnimationsPaused = () => paused;

export const setAnimationsPaused = (value: boolean) => {
  paused = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // Sem acesso ao armazenamento (ex.: janela privada): a escolha vale só para esta sessão.
  }
  syncRootClass();
  listeners.forEach((notify) => notify());
};

export const subscribeAnimationsPaused = (notify: () => void) => {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
};

// ---------- Animações reutilizáveis ----------

/** Entrada simples: sobe e aparece. Para elementos secundários (não para o H1 do hero). */
export const fadeUp = (targets: gsap.TweenTarget, vars: gsap.TweenVars = {}) =>
  gsap.from(targets, { autoAlpha: 0, y: 24, ...vars });

/** Entrada em sequência de uma lista (cartões, passos). */
export const staggerIn = (targets: gsap.TweenTarget, vars: gsap.TweenVars = {}) =>
  gsap.from(targets, { autoAlpha: 0, y: 32, stagger: 0.08, ...vars });

/**
 * Título dividido em linhas que sobem por dentro de uma máscara.
 * Não usa opacidade, para o título contar logo para o LCP.
 * `autoSplit` volta a dividir quando as fontes carregam ou a largura muda.
 */
export const splitHeading = (target: gsap.DOMTarget, vars: gsap.TweenVars = {}) =>
  SplitText.create(target, {
    type: "lines",
    mask: "lines",
    autoSplit: true,
    aria: "auto",
    onSplit: (self) => gsap.from(self.lines, { yPercent: 110, stagger: 0.08, duration: 0.9, ...vars }),
  });

/**
 * Mostra os elementos à medida que entram no ecrã, em grupos.
 * Usa um único ScrollTrigger.batch em vez de um trigger por elemento.
 */
export const revealOnScroll = (targets: string | Element[], vars: gsap.TweenVars = {}) => {
  gsap.set(targets, { autoAlpha: 0, y: 32 });
  return ScrollTrigger.batch(targets, {
    start: "top 88%",
    once: true,
    onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, stagger: 0.08, overwrite: true, ...vars }),
  });
};
