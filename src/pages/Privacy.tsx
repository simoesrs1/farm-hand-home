import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import LegalLayout, { LegalSection } from "@/components/LegalLayout";
import { useConsent } from "@/contexts/ConsentContext";
import { CONSENT_CATEGORIES } from "@/lib/consent";
import { LEGAL } from "@/lib/legal";

const STORAGE_ITEMS: {
  name: string;
  type: string;
  category: string;
  purpose: string;
  duration: string;
}[] = [
  {
    name: "sb-…-auth-token",
    type: "Armazenamento local",
    category: "Necessário",
    purpose: "Mantém a sessão iniciada e a segurança da conta.",
    duration: "Até terminar sessão",
  },
  {
    name: "fc_consent",
    type: "Cookie",
    category: "Necessário",
    purpose: "Guarda as suas escolhas sobre cookies.",
    duration: "Sessão do navegador",
  },
  {
    name: "fc_sid",
    type: "Cookie",
    category: "Necessário",
    purpose: "Identifica a sessão do navegador para limitar o carrinho à visita atual.",
    duration: "Sessão do navegador",
  },
  {
    name: "farmconnect_cart",
    type: "Armazenamento local",
    category: "Necessário / Preferências",
    purpose: "Conteúdo do carrinho. Só é guardado entre visitas se autorizar as preferências.",
    duration: "Sessão (ou persistente, com preferências)",
  },
  {
    name: "farmconnect_pickup_slot",
    type: "Armazenamento local",
    category: "Necessário / Preferências",
    purpose: "Horário de levantamento escolhido na página do produto.",
    duration: "Sessão (ou persistente, com preferências)",
  },
  {
    name: "farmconnect:pending_profile_type",
    type: "Armazenamento de sessão",
    category: "Necessário",
    purpose: "Lembra o tipo de perfil escolhido durante o registo com a Google.",
    duration: "Até concluir o registo",
  },
  {
    name: "Cookies da Google (ex.: NID)",
    type: "Cookie de terceiros",
    category: "Mapas",
    purpose: "Definidos pela Google ao carregar o Google Maps.",
    duration: "Definida pela Google",
  },
];

const CookieSection = () => {
  const { openPreferences, choices, decided } = useConsent();
  return (
    <>
      <p>
        Cookies são pequenos ficheiros guardados no seu navegador; tecnologias semelhantes, como
        o armazenamento local, funcionam de forma parecida. Usamo-los nos termos do artigo 5.º
        da Lei n.º 41/2004: os estritamente necessários não precisam de consentimento; todos os
        outros só são usados se os autorizar.
      </p>
      <p>
        <strong>Não usamos cookies de publicidade nem de análise estatística.</strong> A sua
        escolha é guardada apenas durante a sessão do navegador: quando o fechar, voltamos a
        perguntar.
      </p>

      <ul>
        {CONSENT_CATEGORIES.map((c) => (
          <li key={c.id}>
            <strong>{c.title}</strong> — {c.description}
          </li>
        ))}
      </ul>

      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table className="w-full min-w-[640px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border text-foreground">
              <th className="px-3 py-2 font-semibold">Nome</th>
              <th className="px-3 py-2 font-semibold">Tipo</th>
              <th className="px-3 py-2 font-semibold">Categoria</th>
              <th className="px-3 py-2 font-semibold">Finalidade</th>
              <th className="px-3 py-2 font-semibold">Duração</th>
            </tr>
          </thead>
          <tbody>
            {STORAGE_ITEMS.map((item) => (
              <tr key={item.name} className="border-b border-border align-top">
                <td className="px-3 py-2 font-mono text-[11px] text-foreground">{item.name}</td>
                <td className="px-3 py-2">{item.type}</td>
                <td className="px-3 py-2">{item.category}</td>
                <td className="px-3 py-2">{item.purpose}</td>
                <td className="px-3 py-2">{item.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p>
        A Google trata os dados recolhidos pelo Google Maps de acordo com a sua{" "}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
          política de privacidade
        </a>
        . Pode também apagar cookies nas definições do seu navegador.
      </p>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground">
          {decided
            ? `Estado atual: preferências ${choices.preferences ? "ativas" : "desativadas"}, mapas ${
                choices.maps ? "ativos" : "desativados"
              }.`
            : "Ainda não fez nenhuma escolha nesta sessão."}
        </p>
        <Button onClick={openPreferences} className="gap-2 sm:shrink-0">
          <Cookie className="h-4 w-4" />
          Gerir cookies
        </Button>
      </div>
    </>
  );
};

const sections: LegalSection[] = [
  {
    id: "responsavel",
    title: "Responsável pelo tratamento",
    content: (
      <p>
        O responsável pelo tratamento dos seus dados é <strong>{LEGAL.companyName}</strong>,
        NIPC {LEGAL.nipc}, com sede em {LEGAL.address}. Para qualquer questão sobre privacidade
        contacte-nos em <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>
    ),
  },
  {
    id: "dados",
    title: "Que dados recolhemos",
    content: (
      <ul>
        <li>
          <strong>Conta:</strong> nome, email, palavra-passe (guardada de forma cifrada pelo
          nosso fornecedor de autenticação), fotografia de perfil e tipo de perfil. Se entrar
          com a Google, recebemos o nome, email e fotografia da sua conta Google.
        </li>
        <li>
          <strong>Agricultores:</strong> denominação, NIF, código CAE, número de exploração,
          morada, local e coordenadas de levantamento, telefone, website, horários, descrição e
          certificados.
        </li>
        <li>
          <strong>Encomendas:</strong> produtos, valores, horário de levantamento, código de
          levantamento e, nas entregas ao domicílio, a morada e o ponto de entrega marcado no
          mapa.
        </li>
        <li>
          <strong>Comunicações e atividade:</strong> mensagens do chat das encomendas,
          notificações, problemas reportados, avaliações e favoritos.
        </li>
        <li>
          <strong>Dados técnicos:</strong> endereço IP e registos de acesso necessários à
          segurança do serviço, e os dados guardados no navegador descritos na secção de
          cookies.
        </li>
      </ul>
    ),
  },
  {
    id: "finalidades",
    title: "Para que usamos os dados",
    content: (
      <ul>
        <li>
          <strong>Executar o contrato</strong> (art. 6.º, n.º 1, al. b) do RGPD): criar e gerir a
          conta, processar encomendas e pagamentos, permitir o levantamento e a entrega, o chat
          entre Cliente e Agricultor e as notificações.
        </li>
        <li>
          <strong>Cumprir obrigações legais</strong> (al. c)): faturação, contabilidade e
          resposta a pedidos de autoridades.
        </li>
        <li>
          <strong>Interesses legítimos</strong> (al. f)): verificar Agricultores, prevenir
          fraude e abusos, garantir a segurança da plataforma e melhorar o serviço. Inclui o
          cálculo da pontuação de atividade dos Agricultores (atualização do catálogo, rapidez de
          resposta a encomendas e no chat), usada para ordenar o catálogo, escolher destaques e
          enviar lembretes. Esta pontuação nunca leva à suspensão ou ocultação do perfil; os
          critérios estão descritos nos <Link to="/termos#ordenacao">Termos</Link>.
        </li>
        <li>
          <strong>Consentimento</strong> (al. a)): cookies de preferências e mapas da Google.
          Pode retirá-lo a qualquer momento, sem afetar o tratamento já realizado.
        </li>
      </ul>
    ),
  },
  {
    id: "partilha",
    title: "Com quem partilhamos",
    content: (
      <>
        <ul>
          <li>
            <strong>Agricultores:</strong> quando encomenda, o Agricultor recebe o seu nome, os
            detalhes da encomenda e, se pediu entrega, a morada e o ponto de entrega.
          </li>
          <li>
            <strong>Clientes:</strong> o perfil público do Agricultor (exploração, localização,
            horários, avaliações) é visível para todos.
          </li>
          <li>
            <strong>Prestadores de serviços</strong> que tratam dados por nossa conta, com
            contrato de subcontratação: alojamento, base de dados e autenticação (Supabase),
            alojamento da aplicação (Lovable), autenticação Google e Google Maps (Google).
          </li>
          <li>
            <strong>Autoridades</strong>, quando a lei o exija.
          </li>
        </ul>
        <p>Não vendemos os seus dados nem os usamos para publicidade.</p>
      </>
    ),
  },
  {
    id: "transferencias",
    title: "Transferências internacionais",
    content: (
      <p>
        Alguns prestadores podem tratar dados fora do Espaço Económico Europeu, nomeadamente nos
        Estados Unidos. Nesses casos, a transferência assenta numa decisão de adequação da
        Comissão Europeia (como o EU-US Data Privacy Framework) ou em cláusulas contratuais-tipo.
      </p>
    ),
  },
  {
    id: "conservacao",
    title: "Durante quanto tempo",
    content: (
      <ul>
        <li>Dados de conta: enquanto a conta estiver ativa.</li>
        <li>
          Encomendas e dados de faturação: 10 anos, conforme exigido pela legislação fiscal e
          contabilística.
        </li>
        <li>
          Mensagens e reportes: enquanto forem necessários para a encomenda e para eventuais
          reclamações ou litígios.
        </li>
        <li>Dados no navegador: conforme a tabela da secção de cookies.</li>
      </ul>
    ),
  },
  {
    id: "direitos",
    title: "Os seus direitos",
    content: (
      <>
        <p>
          Tem direito de acesso, retificação, apagamento, limitação do tratamento, portabilidade
          e oposição, e de retirar o consentimento a qualquer momento. Pode exercê-los
          escrevendo para <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>; respondemos no
          prazo de um mês. Parte dos dados pode ser corrigida diretamente no seu{" "}
          <Link to="/perfil">perfil</Link>.
        </p>
        <p>
          Pode também apresentar reclamação à Comissão Nacional de Proteção de Dados (
          <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">
            www.cnpd.pt
          </a>
          ).
        </p>
      </>
    ),
  },
  {
    id: "seguranca",
    title: "Segurança",
    content: (
      <p>
        Usamos ligações cifradas (HTTPS), palavras-passe cifradas e regras de acesso na base de
        dados que garantem que cada utilizador só vê os dados a que tem direito. Nenhum sistema
        é infalível; se detetarmos uma violação de dados que o afete, informamos nos termos da
        lei.
      </p>
    ),
  },
  {
    id: "menores",
    title: "Menores",
    content: <p>A plataforma destina-se a maiores de 18 anos. Não recolhemos intencionalmente dados de menores.</p>,
  },
  {
    id: "cookies",
    title: "Cookies e armazenamento local",
    content: <CookieSection />,
  },
  {
    id: "alteracoes",
    title: "Alterações a esta política",
    content: (
      <p>
        Podemos atualizar esta política. Alterações relevantes são comunicadas na plataforma e,
        se mudarem as finalidades dos cookies, voltamos a pedir o seu consentimento. Consulte
        também os <Link to="/termos">Termos e Condições</Link>.
      </p>
    ),
  },
];

const Privacy = () => (
  <LegalLayout
    eyebrow="Legal"
    title="Política de Privacidade"
    intro={
      <p>
        Explicamos aqui que dados pessoais tratamos, porquê, com quem os partilhamos e como pode
        exercer os seus direitos, nos termos do Regulamento Geral sobre a Proteção de Dados
        (RGPD) e da Lei n.º 58/2019.
      </p>
    }
    sections={sections}
  />
);

export default Privacy;
