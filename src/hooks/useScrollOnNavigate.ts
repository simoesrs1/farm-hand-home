import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Scroll ao mudar de página, igual para todas as rotas (o BrowserRouter não o faz):
 * - página nova → topo;
 * - endereço com âncora (ex.: /termos#ordenacao) → secção correspondente,
 *   também quando o site é aberto diretamente nesse endereço;
 * - "Voltar"/"Avançar" do navegador → nada, o navegador repõe a posição anterior;
 * - mudança só nos parâmetros (?filtro=...) → nada.
 * Chamado uma única vez, em App.tsx.
 */
export function useScrollOnNavigate() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  const firstRender = useRef(true);

  useEffect(() => {
    const isFirst = firstRender.current;
    firstRender.current = false;

    // "POP" é o Voltar/Avançar, mas também a primeira entrada no site: aí só
    // tratamos a âncora e deixamos o navegador repor o scroll de um recarregamento.
    if (navigationType === "POP" && !(isFirst && hash)) return;

    if (!hash) {
      window.scrollTo({ top: 0 });
      return;
    }

    // A secção só existe depois de a página nova ser desenhada.
    const id = window.setTimeout(() => {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: "start" });
    }, 50);
    return () => window.clearTimeout(id);
    // navigationType só interessa no momento da mudança de endereço.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, hash]);
}
