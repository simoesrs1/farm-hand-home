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
          nosso fornecedor de autenticação), tipo de perfil, idioma preferido e, se a carregar,
          fotografia de perfil. A fotografia fica num endereço público, para poder aparecer nas
          avaliações que autorizar. Se entrar com a Google, recebemos o nome e o email da sua
          conta Google.
        </li>
        <li>
          <strong>Agricultores:</strong> denominação, NIF, código CAE, número de exploração,
          morada, local e coordenadas de levantamento, telefone, website, horários, descrição,
          certificados, períodos de pausa e respetiva mensagem, estado de verificação e, no
          alojamento, o número de registo (Alojamento Local ou Turismo no Espaço Rural). Nos
          pedidos de alteração de dados guardamos a justificação, os documentos comprovativos e a
          decisão da equipa. O histórico de stock regista quem fez cada alteração.
        </li>
        <li>
          <strong>Pagamentos dos Agricultores:</strong> o identificador da conta na Stripe e se
          a conta está pronta a receber. Os dados de identificação e o IBAN são entregues
          diretamente à Stripe e não ficam na plataforma.
        </li>
        <li>
          <strong>Encomendas e reservas:</strong> produtos, valores, comissão, horário de
          levantamento, código de levantamento e, nas entregas ao domicílio, a morada e o ponto
          de entrega marcado no mapa. Nas reservas de experiências e alojamento: datas, número
          de pessoas ou hóspedes, quartos, brindes escolhidos, cancelamentos, taxas e reembolsos.
        </li>
        <li>
          <strong>Comunicações e atividade:</strong> mensagens do chat das encomendas e ficheiros
          anexados, denúncias e respetivas provas, queixas de entrega não recebida, avaliações,
          pedidos de eliminação de avaliações, notificações e favoritos.
        </li>
        <li>
          <strong>Utilização de IA:</strong> o registo de cada utilização de "Escrever com IA"
          (para o limite diário) e as traduções automáticas guardadas. Ver a secção sobre
          Inteligência Artificial.
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
          conta, processar encomendas, reservas, cancelamentos e pagamentos, permitir o
          levantamento e a entrega, o chat entre Cliente e Agricultor, as notificações e os
          emails de serviço, e a proposta de descrições com IA pedida pelo Agricultor.
        </li>
        <li>
          <strong>Cumprir obrigações legais</strong> (al. c)): faturação, contabilidade e
          resposta a pedidos de autoridades.
        </li>
        <li>
          <strong>Interesses legítimos</strong> (al. f)): verificar Agricultores, prevenir
          fraude e abusos, analisar denúncias, queixas e pedidos, garantir a segurança da
          plataforma, traduzir automaticamente conteúdos para o idioma de quem os lê e melhorar
          o serviço. Inclui o cálculo da pontuação de atividade dos Agricultores (atualização do
          catálogo, rapidez de resposta a encomendas e no chat), usada para ordenar o catálogo,
          escolher destaques e enviar lembretes. Esta pontuação nunca leva à suspensão ou
          ocultação do perfil; os critérios estão descritos nos{" "}
          <Link to="/termos#ordenacao">Termos</Link>.
        </li>
        <li>
          <strong>Consentimento</strong> (al. a)): cookies de preferências e mapas da Google.
          Pode retirá-lo a qualquer momento, sem afetar o tratamento já realizado.
        </li>
      </ul>
    ),
  },
  {
    id: "automaticos",
    title: "Processos automáticos",
    content: (
      <>
        <p>
          Alguns passos acontecem automaticamente, segundo regras fixas e públicas, sem
          intervenção da inteligência artificial:
        </p>
        <ul>
          <li>
            encomendas não levantadas até ao prazo-limite expiram, com reembolso de 10% (ver{" "}
            <Link to="/termos#nao-levantadas">Termos</Link>);
          </li>
          <li>
            a pontuação de atividade é calculada todos os dias com os dados dos últimos 30 dias;
          </li>
          <li>
            quando um Agricultor pede a alteração de dados oficiais, o perfil e os produtos
            ficam ocultos até a equipa analisar o pedido (no máximo 7 dias);
          </li>
          <li>
            os lotes de stock cuja validade passou saem automaticamente do stock à venda.
          </li>
        </ul>
        <p>
          As decisões sobre denúncias, queixas, pedidos de eliminação de avaliações e pedidos de
          alteração de dados são sempre tomadas por uma pessoa da equipa. Pode pedir
          esclarecimentos ou contestar qualquer destes passos através de{" "}
          <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
        </p>
      </>
    ),
  },
  {
    id: "partilha",
    title: "Com quem partilhamos",
    content: (
      <>
        <ul>
          <li>
            <strong>Agricultores:</strong> quando encomenda ou reserva, o Agricultor recebe o seu
            nome, os detalhes da encomenda ou reserva e, se pediu entrega, a morada e o ponto de
            entrega.
          </li>
          <li>
            <strong>Clientes:</strong> o perfil público do Agricultor (exploração, localização,
            horários, avaliações) é visível para todos. Nas suas avaliações aparece o primeiro
            nome e a inicial do apelido e, só se o autorizar, a sua fotografia de perfil. Pode
            retirar essa autorização a qualquer momento em As minhas encomendas.
          </li>
          <li>
            <strong>Prestadores de serviços</strong> que tratam dados por nossa conta, com
            contrato de subcontratação: alojamento, base de dados, ficheiros e autenticação
            (Supabase), alojamento da aplicação (Cloudflare), autenticação Google e Google Maps
            (Google), envio de emails (Resend), cálculo de percursos por estrada
            (openrouteservice, da HeiGIT gGmbH, Alemanha) e inteligência artificial (Anthropic,
            ver a secção seguinte).
          </li>
          <li>
            <strong>Stripe:</strong> quando o Agricultor configura os pagamentos, enviamos à
            Stripe o nome da empresa, o email e o país. A Stripe recolhe diretamente a
            identificação e os dados bancários e trata-os também como responsável próprio, para
            cumprir as obrigações de prevenção de fraude e de branqueamento de capitais, nos
            termos da sua{" "}
            <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">
              política de privacidade
            </a>
            .
          </li>
          <li>
            <strong>Tipos de letra:</strong> o site carrega tipos de letra da Google (Google
            Fonts), o que transmite o seu endereço IP à Google.
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
    id: "ia",
    title: "Utilização de Inteligência Artificial",
    content: (
      <>
        <p>
          Usamos modelos de inteligência artificial (IA) do fornecedor <strong>Anthropic</strong>{" "}
          (modelos Claude) em duas funcionalidades:
        </p>
        <ul>
          <li>
            <strong>"Escrever com IA" (Agricultores):</strong> quando o Agricultor carrega no
            botão num produto, experiência ou alojamento, enviamos o texto que escreveu, os dados
            desse formulário, o nome da quinta e até 3 fotografias, apenas para propor uma
            descrição. Nada é enviado sem o Agricultor carregar no botão, e a proposta só
            substitui o texto se o Agricultor a aceitar; o texto publicado é da sua
            responsabilidade. Recomendamos não usar fotografias em que apareçam pessoas.
            Guardamos o registo de cada utilização para aplicar o limite diário. Fundamento:
            execução do contrato.
          </li>
          <li>
            <strong>Tradução automática:</strong> quando alguém vê a plataforma noutro idioma, os
            textos escritos por utilizadores (descrições e notas de produtos, quintas,
            experiências e alojamento, avaliações, notificações, nomes dos artigos das encomendas
            e mensagens do chat) são enviados à Anthropic para serem traduzidos. Só é enviado o
            texto, sem o nome, contacto ou morada de quem o escreveu. As mensagens do chat só são
            traduzidas para as duas partes da encomenda, e o texto original continua sempre
            disponível ("Ver original"). As traduções ficam guardadas na nossa base de dados para
            não voltarem a ser pedidas. Fundamento: interesse legítimo em tornar a plataforma
            compreensível em vários idiomas; pode opor-se escrevendo-nos.
          </li>
        </ul>
        <p>Sobre o tratamento pela Anthropic:</p>
        <ul>
          <li>
            a Anthropic atua como nossa subcontratante, ao abrigo de um acordo de tratamento de
            dados, e <strong>não usa estes dados para treinar os seus modelos</strong>;
          </li>
          <li>
            os pedidos e as respostas são apagados pela Anthropic no prazo de 30 dias, salvo
            conteúdo assinalado por violar a sua política de utilização ou quando a lei exija a
            sua conservação;
          </li>
          <li>
            os dados podem ser tratados nos Estados Unidos e noutros países fora do Espaço
            Económico Europeu, com base em cláusulas contratuais-tipo aprovadas pela Comissão
            Europeia.
          </li>
        </ul>
        <p>
          A IA <strong>não toma decisões</strong> sobre si: não decide encomendas, pagamentos,
          avaliações, pontuações nem o acesso à plataforma. Os textos traduzidos ou propostos pela
          IA são gerados automaticamente e podem conter erros; em caso de dúvida, prevalece o
          texto original.
        </p>
      </>
    ),
  },
  {
    id: "transferencias",
    title: "Transferências internacionais",
    content: (
      <p>
        Alguns prestadores tratam dados fora do Espaço Económico Europeu, nomeadamente nos
        Estados Unidos (por exemplo, Anthropic, Stripe, Resend e Google). Nesses casos, a
        transferência assenta numa decisão de adequação da Comissão Europeia (como o EU-US Data
        Privacy Framework, para os prestadores certificados) ou em cláusulas contratuais-tipo.
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
          Encomendas, reservas e dados de faturação: 10 anos, conforme exigido pela legislação
          fiscal e contabilística.
        </li>
        <li>
          Mensagens do chat, anexos, denúncias e queixas: enquanto forem necessários para a
          encomenda e para eventuais reclamações ou litígios, ou até pedir a sua eliminação.
        </li>
        <li>
          Pedidos de alteração de dados e certificados: enquanto o Agricultor tiver conta.
        </li>
        <li>
          Traduções automáticas e registos de utilização da IA: sem prazo definido, por
          enquanto; são apagados a seu pedido. Na Anthropic: até 30 dias.
        </li>
        <li>Pontuação de atividade: calculada com os dados dos últimos 30 dias.</li>
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
          e oposição (incluindo ao tratamento baseado em interesse legítimo, como a tradução
          automática), e de retirar o consentimento a qualquer momento. Pode exercê-los
          escrevendo para <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>; respondemos no
          prazo de um mês. Parte dos dados pode ser corrigida diretamente no seu{" "}
          <Link to="/perfil">perfil</Link>. O encerramento da conta e o apagamento dos dados são
          feitos a pedido, por email, mantendo apenas o que a lei nos obriga a conservar.
        </p>
        <p>
          Pode também apresentar reclamação à Comissão Nacional de Proteção de Dados (CNPD), Av.
          D. Carlos I, 134, 1.º, 1200-651 Lisboa,{" "}
          <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">
            www.cnpd.pt
          </a>
          .
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
        dados que garantem que cada utilizador só vê os dados a que tem direito. Os certificados,
        documentos e anexos ficam em armazenamento privado. Nenhum sistema é infalível; se
        detetarmos uma violação de dados que o afete, informamos nos termos da lei.
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
