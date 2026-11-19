import { Link } from "react-router-dom";
import CookieSection from "@/components/CookieSection";
import LegalLayout, { type LegalDoc, type LegalSection } from "@/components/LegalLayout";
import { LEGAL } from "@/lib/legal";
import privacyEn from "@/pages/legal/privacy.en";
import privacyDe from "@/pages/legal/privacy.de";
import privacyEs from "@/pages/legal/privacy.es";
import privacyFr from "@/pages/legal/privacy.fr";

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
            horários, avaliações) é visível para todos. Nas suas avaliações aparece o primeiro
            nome e a inicial do apelido e, só se o autorizar, a sua fotografia de perfil. Pode
            retirar essa autorização a qualquer momento em As minhas encomendas.
          </li>
          <li>
            <strong>Prestadores de serviços</strong> que tratam dados por nossa conta, com
            contrato de subcontratação: alojamento, base de dados e autenticação (Supabase),
            alojamento da aplicação (Cloudflare), autenticação Google e Google Maps (Google) e
            cálculo de percursos por estrada (openrouteservice, da HeiGIT gGmbH, Alemanha).
          </li>
          <li>
            <strong>Descrições com IA:</strong> quando o Agricultor usa "Escrever com IA" num
            produto, experiência ou alojamento, o texto que escreveu, os dados desse formulário e
            até 3 fotografias são enviados à Anthropic (fornecedora do modelo Claude), apenas para
            propor a descrição. Nada é enviado sem o Agricultor carregar no botão, e a proposta só
            substitui o texto se o Agricultor a aceitar.
          </li>
          <li>
            <strong>Tradução automática:</strong> quando alguém vê a Plataforma noutro idioma, os
            textos escritos por utilizadores (descrições de produtos, quintas, experiências e
            alojamento, avaliações, notificações e mensagens do chat de uma encomenda) são
            enviados à Anthropic para serem traduzidos. Só é enviado o texto, sem nome, contacto
            ou morada de quem o escreveu. As traduções ficam guardadas na nossa base de dados
            para não voltarem a ser pedidas, e as mensagens do chat só são traduzidas para as
            duas partes da encomenda.
          </li>
          <li>
            <strong>Cálculo de percursos:</strong> quando o Agricultor organiza a rota das
            entregas ao domicílio, os pontos de entrega (coordenadas, sem nome nem morada) são
            enviados ao openrouteservice para calcular o percurso mais rápido por estrada.
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

/** Versão original (português), que prevalece sobre as traduções. */
const privacyPt: LegalDoc = {
  title: "Política de Privacidade",
  intro: (
    <p>
      Explicamos aqui que dados pessoais tratamos, porquê, com quem os partilhamos e como pode
      exercer os seus direitos, nos termos do Regulamento Geral sobre a Proteção de Dados
      (RGPD) e da Lei n.º 58/2019.
    </p>
  ),
  sections,
};

// Ao alterar a política, atualizar também as traduções em src/pages/legal/privacy.*.tsx.
// A secção de cookies (CookieSection) é a mesma em todos os idiomas, com textos em legal.json.
const Privacy = () => (
  <LegalLayout original={privacyPt} translations={{ en: privacyEn, de: privacyDe, es: privacyEs, fr: privacyFr }} />
);

export default Privacy;
