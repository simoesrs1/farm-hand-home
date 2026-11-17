import { useEffect, useState, useSyncExternalStore } from "react";
import {
  REDUCED_MOTION_QUERY,
  getAnimationsPaused,
  subscribeAnimationsPaused,
} from "@/lib/animation";

/** true quando o utilizador pausou as animações no rodapé. */
export const useAnimationsPaused = () =>
  useSyncExternalStore(subscribeAnimationsPaused, getAnimationsPaused, () => false);

/**
 * true quando não se deve animar: o sistema pede movimento reduzido
 * (prefers-reduced-motion) ou o utilizador pausou as animações no site.
 * Usar como dependência do useGSAP com `revertOnUpdate: true`.
 */
export const useReducedMotion = () => {
  const paused = useAnimationsPaused();
  const [systemReduced, setSystemReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia(REDUCED_MOTION_QUERY).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = () => setSystemReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return paused || systemReduced;
};
