import { Link } from "react-router-dom";
import LegalLayout, { LegalSection } from "@/components/LegalLayout";
import { LEGAL } from "@/lib/legal";

const sections: LegalSection[] = [
  {
    id: "identificacao",
    title: "Identificação e objeto",
    content: (
      <>
        <p>
          A plataforma {LEGAL.brand} é explorada por <strong>{LEGAL.companyName}</strong>, pessoa
          coletiva n.º {LEGAL.nipc}, com sede em {LEGAL.address} (doravante "{LEGAL.brand}" ou
          "nós"), contactável através de <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
        </p>
        <p>
          O {LEGAL.brand} é um mercado digital de proximidade que liga consumidores
          ("Clientes") a agricultores e produtores locais ("Agricultores"). O {LEGAL.brand} atua
          como <strong>intermediário</strong>: disponibiliza a montra, o processamento das
          encomendas e do pagamento e as ferramentas de comunicação, mas não é o vendedor dos
          produtos. O contrato de compra e venda é celebrado diretamente entre o Cliente e o
          Agricultor.
        </p>
        <p>
          Estes Termos e Condições regulam o acesso e a utilização da plataforma. O tratamento de
          dados pessoais é regulado pela <Link to="/privacidade">Política de Privacidade</Link>.
        </p>
      </>
    ),
  },
  {
    id: "aceitacao",
    title: "Aceitação e capacidade",
    content: (
      <>
        <p>
          Ao criar uma conta ou ao realizar uma encomenda, declara que leu e aceita estes Termos.
          Se não concordar, não deve utilizar a plataforma.
        </p>
        <p>
          Para criar conta é necessário ter pelo menos 18 anos e capacidade legal para contratar.
          Os Agricultores declaram agir no âmbito da sua atividade profissional.
        </p>
      </>
    ),
  },
  {
    id: "contas",
    title: "Contas de utilizador",
    content: (
      <>
        <p>
          A mesma conta pode ter um perfil de Cliente e um perfil de Agricultor, que partilham o
          email e a palavra-passe. Pode registar-se com email e palavra-passe ou com uma conta
          Google.
        </p>
        <ul>
          <li>Os dados fornecidos devem ser verdadeiros, completos e mantidos atualizados.</li>
          <li>
            É responsável por manter a confidencialidade das suas credenciais e por toda a
            atividade realizada na sua conta. Avise-nos de imediato se suspeitar de uso indevido.
          </li>
          <li>A conta é pessoal e intransmissível.</li>
        </ul>
      </>
    ),
  },
  {
    id: "agricultores",
    title: "Agricultores",
    content: (
      <>
        <p>
          Para vender, o Agricultor tem de completar o registo da exploração (incluindo
          denominação, NIF, código CAE, número de exploração e, quando aplicável, certificados).
          O {LEGAL.brand} pode verificar estas informações e recusar, suspender ou remover perfis
          que não as cumpram.
        </p>
        <p>O Agricultor compromete-se a:</p>
        <ul>
          <li>
            vender apenas produtos que pode legalmente comercializar, cumprindo as normas de
            segurança alimentar, higiene, rotulagem e rastreabilidade aplicáveis;
          </li>
          <li>
            descrever os produtos com rigor (origem, modo de produção, quantidade, unidade e
            preço com IVA incluído) e manter o stock atualizado;
          </li>
          <li>
            honrar as encomendas aceites, respeitar os horários de levantamento e entrega que
            publicou e emitir a documentação fiscal exigida por lei;
          </li>
          <li>assegurar as garantias legais dos produtos que vende.</li>
        </ul>
        <p>
          Pela intermediação, o {LEGAL.brand} retém uma comissão de{" "}
          <strong>{LEGAL.commissionPercent}% do valor de cada encomenda</strong>, sendo o
          remanescente pago ao Agricultor após a conclusão da encomenda.
        </p>
      </>
    ),
  },
  {
    id: "ordenacao",
    title: "Ordenação e destaque",
    content: (
      <>
        <p>
          Na ordenação predefinida ("Relevância") do catálogo e da pesquisa, e na escolha dos
          agricultores em destaque na página inicial, usamos dois parâmetros principais, somados:
        </p>
        <ul>
          <li>
            <strong>Pontuação de atividade (0 a 100)</strong>, calculada diariamente sobre os
            últimos 30 dias: atualização do catálogo e do stock (40%), rapidez a aceitar encomendas
            e encomendas não canceladas por falta de stock (40%) e respostas aos clientes no chat em
            menos de 24 horas (20%). Uma componente sem dados (por exemplo, sem encomendas no
            período) não penaliza: o seu peso é redistribuído pelas restantes.
          </li>
          <li>
            <strong>Certificados</strong> da exploração validados no registo (10 pontos por
            certificado, até 50).
          </li>
        </ul>
        <p>
          Os destaques da página inicial mostram os 6 agricultores verificados com maior soma que
          tenham produtos disponíveis nesse dia e uma pontuação de atividade de pelo menos 40. Não é possível pagar para obter melhor posição.
          O Cliente pode sempre escolher outra ordenação (preço, distância, modo de produção, entre
          outras).
        </p>
        <p>
          O Agricultor pode ativar uma <strong>pausa</strong> (férias, entressafra) até 6 meses:
          durante a pausa, os produtos ficam ocultos, não recebe encomendas e a pontuação fica
          congelada. O mesmo acontece automaticamente quando nenhum produto está na época. O
          Agricultor vê a sua pontuação e sugestões para a melhorar na página de vendas e pode
          receber lembretes na plataforma; a atividade nunca leva à ocultação do perfil.
        </p>
      </>
    ),
  },
  {
    id: "encomendas",
    title: "Encomendas, preços e pagamento",
    content: (
      <>
        <p>
          Os preços são apresentados em euros e incluem IVA à taxa legal em vigor. Antes de
          confirmar, o Cliente vê o resumo da encomenda, o total a pagar e o horário de
          levantamento ou entrega escolhido.
        </p>
        <p>
          O pagamento é efetuado no momento da encomenda e fica retido pelo {LEGAL.brand} até o
          Cliente levantar ou receber os produtos. Após o pagamento, o Agricultor confirma a
          encomenda. Se o Agricultor não tiver stock suficiente, pode cancelá-la, sendo o
          Cliente <strong>reembolsado na totalidade</strong>.
        </p>
      </>
    ),
  },
  {
    id: "levantamento",
    title: "Levantamento e entrega",
    content: (
      <>
        <p>
          Cada encomenda tem um código de levantamento (também em formato QR) que o Cliente
          apresenta ao Agricultor. O levantamento é feito no local indicado pelo Agricultor,
          dentro do horário de porta aberta e até ao prazo-limite mostrado na encomenda.
        </p>
        <p>
          Quando o Agricultor oferece entrega ao domicílio, o Cliente indica a morada e marca o
          ponto exato de entrega. Deve garantir que alguém pode receber a encomenda no horário
          combinado.
        </p>
      </>
    ),
  },
  {
    id: "nao-levantadas",
    title: "Encomendas não levantadas",
    content: (
      <>
        <p>
          Os produtos são, em grande parte, perecíveis e são reservados para o Cliente. Se a
          encomenda não for levantada até ao prazo-limite, expira automaticamente: o Agricultor
          deixa de estar obrigado a guardá-la e <strong>apenas 10% do valor pago é
          reembolsado</strong>. O Cliente é notificado na plataforma quando isto acontece.
        </p>
        <p>
          Se não puder cumprir o horário, contacte o Agricultor através do chat da encomenda o
          mais cedo possível.
        </p>
      </>
    ),
  },
  {
    id: "livre-resolucao",
    title: "Direito de livre resolução",
    content: (
      <>
        <p>
          Nos termos do Decreto-Lei n.º 24/2014, o Cliente consumidor pode, em regra, desistir de
          uma compra à distância no prazo de 14 dias. Este direito{" "}
          <strong>não se aplica</strong> a bens suscetíveis de se deteriorarem ou de ficarem
          rapidamente fora de prazo (art. 17.º, n.º 1, alínea d)), como fruta, legumes, ovos,
          lacticínios ou carne frescos.
        </p>
        <p>
          Para produtos não perecíveis, o Cliente pode exercer o direito de livre resolução
          contactando o {LEGAL.brand} em <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>,
          devendo devolver os produtos em bom estado. O reembolso é feito pelo mesmo meio de
          pagamento, no prazo de 14 dias após a receção da devolução.
        </p>
      </>
    ),
  },
  {
    id: "conformidade",
    title: "Conformidade dos produtos e reclamações",
    content: (
      <>
        <p>
          O Agricultor, enquanto vendedor, responde pela falta de conformidade dos produtos nos
          termos do Decreto-Lei n.º 84/2021. Se um produto não corresponder ao anunciado ou
          estiver em mau estado, reporte o problema na página da encomenda ou através do chat;
          o {LEGAL.brand} acompanha a resolução entre as partes.
        </p>
      </>
    ),
  },
  {
    id: "avaliacoes",
    title: "Avaliações e conteúdos dos utilizadores",
    content: (
      <>
        <p>
          Só pode avaliar um Agricultor quem lhe tenha comprado através da plataforma (prova de
          compra). As avaliações
          devem ser honestas e respeitosas. São proibidos conteúdos falsos, ofensivos,
          discriminatórios, ilegais, publicidade ou dados pessoais de terceiros, tanto nas
          avaliações como no chat das encomendas.
        </p>
        <p>
          Podemos remover conteúdos que violem estas regras. Ao publicar conteúdos (textos,
          fotografias), concede ao {LEGAL.brand} uma licença não exclusiva e gratuita para os
          exibir na plataforma enquanto estiverem publicados.
        </p>
      </>
    ),
  },
  {
    id: "utilizacao",
    title: "Utilização aceitável",
    content: (
      <ul>
        <li>Não utilizar a plataforma para fins ilegais ou fraudulentos.</li>
        <li>
          Não tentar aceder a contas ou dados de terceiros, nem interferir com a segurança ou o
          funcionamento do serviço.
        </li>
        <li>Não recolher dados da plataforma por meios automatizados sem autorização.</li>
        <li>Não contornar a plataforma para evitar a comissão em encomendas nela iniciadas.</li>
      </ul>
    ),
  },
  {
    id: "propriedade",
    title: "Propriedade intelectual",
    content: (
      <p>
        A marca {LEGAL.brand}, o design, o software e os conteúdos da plataforma pertencem ao
        {" "}{LEGAL.brand} ou aos seus licenciantes. Os conteúdos publicados pelos Agricultores
        (fotografias, descrições) são da sua responsabilidade e titularidade.
      </p>
    ),
  },
  {
    id: "responsabilidade",
    title: "Responsabilidade",
    content: (
      <>
        <p>
          Enquanto intermediário, o {LEGAL.brand} não é responsável pela qualidade, segurança ou
          conformidade dos produtos, que cabem ao Agricultor, nem por informação incorreta
          fornecida pelos utilizadores. Esforçamo-nos por manter a plataforma disponível e
          segura, mas não garantimos funcionamento ininterrupto.
        </p>
        <p>
          Nada nestes Termos limita os direitos que a lei reconhece aos consumidores, nem a
          responsabilidade do {LEGAL.brand} por dolo ou culpa grave.
        </p>
      </>
    ),
  },
  {
    id: "suspensao",
    title: "Suspensão e encerramento de conta",
    content: (
      <p>
        Pode encerrar a sua conta a qualquer momento, contactando-nos. Podemos suspender ou
        encerrar contas que violem estes Termos ou a lei, mediante aviso sempre que possível.
        Encomendas em curso serão concluídas ou reembolsadas conforme o seu estado.
      </p>
    ),
  },
  {
    id: "alteracoes",
    title: "Alterações aos Termos",
    content: (
      <p>
        Podemos atualizar estes Termos para refletir alterações legais ou do serviço. As
        alterações relevantes são comunicadas na plataforma com antecedência razoável e não se
        aplicam a encomendas já realizadas.
      </p>
    ),
  },
  {
    id: "litigios",
    title: "Lei aplicável e resolução de litígios",
    content: (
      <>
        <p>Estes Termos regem-se pela lei portuguesa.</p>
        <p>
          Em caso de litígio de consumo, o Cliente pode recorrer a uma entidade de Resolução
          Alternativa de Litígios (Lei n.º 144/2015), nomeadamente ao{" "}
          <a href="https://www.cniacc.pt" target="_blank" rel="noopener noreferrer">
            CNIACC – Centro Nacional de Informação e Arbitragem de Conflitos de Consumo
          </a>
          . Mais informações no{" "}
          <a href="https://www.consumidor.gov.pt" target="_blank" rel="noopener noreferrer">
            Portal do Consumidor
          </a>
          .
        </p>
        <p>
          Dispomos de{" "}
          <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener noreferrer">
            Livro de Reclamações Eletrónico
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "contactos",
    title: "Contactos",
    content: (
      <p>
        Para qualquer questão sobre estes Termos: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>{" "}
        · {LEGAL.phone}.
      </p>
    ),
  },
];

const Terms = () => (
  <LegalLayout
    eyebrow="Legal"
    title="Termos e Condições"
    intro={
      <p>
        Estas são as regras de utilização do {LEGAL.brand}, para Clientes e Agricultores. Pedimos
        que as leia com atenção, em especial as secções sobre encomendas não levantadas e sobre
        o direito de livre resolução.
      </p>
    }
    sections={sections}
  />
);

export default Terms;
