import { Link } from "react-router-dom";
import type { LegalDoc } from "@/components/LegalLayout";
import { LEGAL } from "@/lib/legal";

/** Términos y condiciones — traducción de cortesía (prevalece la versión portuguesa). */
const termsEs: LegalDoc = {
  title: "Términos y condiciones",
  intro: (
    <p>
      Estas son las reglas de uso de {LEGAL.brand}, para Clientes y Agricultores. Le pedimos que las
      lea con atención, en especial las secciones sobre pedidos no recogidos y sobre el derecho de
      desistimiento.
    </p>
  ),
  sections: [
    {
      id: "identificacao",
      title: "Identificación y objeto",
      content: (
        <>
          <p>
            La plataforma {LEGAL.brand} es explotada por <strong>{LEGAL.companyName}</strong>,
            persona jurídica n.º {LEGAL.nipc}, con domicilio social en {LEGAL.address} (en adelante,
            "{LEGAL.brand}" o "nosotros"), a la que puede contactar en{" "}
            <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
          </p>
          <p>
            {LEGAL.brand} es un mercado digital de proximidad que conecta a consumidores
            ("Clientes") con agricultores y productores locales ("Agricultores"). {LEGAL.brand}{" "}
            actúa como <strong>intermediario</strong>: proporciona el escaparate, la gestión de los
            pedidos y del pago y las herramientas de comunicación, pero no es el vendedor de los
            productos. El contrato de compraventa se celebra directamente entre el Cliente y el
            Agricultor.
          </p>
          <p>
            Estos Términos y condiciones regulan el acceso y el uso de la plataforma. El tratamiento
            de datos personales se rige por la <Link to="/privacidade">Política de privacidad</Link>.
          </p>
        </>
      ),
    },
    {
      id: "aceitacao",
      title: "Aceptación y capacidad",
      content: (
        <>
          <p>
            Al crear una cuenta o realizar un pedido, declara que ha leído y acepta estos Términos.
            Si no está de acuerdo, no debe utilizar la plataforma.
          </p>
          <p>
            Para crear una cuenta es necesario tener al menos 18 años y capacidad legal para
            contratar. Los Agricultores declaran actuar en el ámbito de su actividad profesional.
          </p>
        </>
      ),
    },
    {
      id: "contas",
      title: "Cuentas de usuario",
      content: (
        <>
          <p>
            La misma cuenta puede tener un perfil de Cliente y un perfil de Agricultor, que comparten
            el email y la contraseña. Puede registrarse con email y contraseña o con una cuenta de
            Google.
          </p>
          <ul>
            <li>Los datos facilitados deben ser veraces, completos y estar actualizados.</li>
            <li>
              Es responsable de mantener la confidencialidad de sus credenciales y de toda la
              actividad realizada en su cuenta. Avísenos de inmediato si sospecha de un uso indebido.
            </li>
            <li>La cuenta es personal e intransferible.</li>
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
            Para vender, el Agricultor debe completar el registro de la explotación (incluidos
            denominación, NIF, código CAE, número de explotación y, cuando proceda, certificados).{" "}
            {LEGAL.brand} puede verificar esta información y rechazar, suspender o eliminar perfiles
            que no la cumplan.
          </p>
          <p>El Agricultor se compromete a:</p>
          <ul>
            <li>
              vender solo productos que pueda comercializar legalmente, cumpliendo las normas de
              seguridad alimentaria, higiene, etiquetado y trazabilidad aplicables;
            </li>
            <li>
              describir los productos con rigor (origen, modo de producción, cantidad, unidad y
              precio con IVA incluido) y mantener el stock actualizado;
            </li>
            <li>
              cumplir los pedidos aceptados, respetar los horarios de recogida y entrega que ha
              publicado y emitir la documentación fiscal exigida por la ley;
            </li>
            <li>asegurar las garantías legales de los productos que vende.</li>
          </ul>
          <p>
            Por la intermediación, {LEGAL.brand} retiene una comisión del{" "}
            <strong>{LEGAL.commissionPercent} % del valor de cada pedido</strong>; el resto se paga
            al Agricultor tras la conclusión del pedido.
          </p>
        </>
      ),
    },
    {
      id: "ordenacao",
      title: "Clasificación y destacados",
      content: (
        <>
          <p>
            En la ordenación predeterminada ("Relevancia") del catálogo y la búsqueda, y en la
            elección de los agricultores destacados en la página de inicio, usamos dos parámetros
            principales, sumados:
          </p>
          <ul>
            <li>
              <strong>Puntuación de actividad (0 a 100)</strong>, calculada diariamente sobre los
              últimos 30 días: actualización del catálogo y del stock (40 %), rapidez para aceptar
              pedidos y pedidos no cancelados por falta de stock (40 %) y respuestas a los clientes
              en el chat en menos de 24 horas (20 %). Un componente sin datos (por ejemplo, sin
              pedidos en el periodo) no penaliza: su peso se reparte entre los demás.
            </li>
            <li>
              <strong>Certificados</strong> de la explotación validados en el registro (10 puntos por
              certificado, hasta 50).
            </li>
          </ul>
          <p>
            Los destacados de la página de inicio muestran a los 6 agricultores verificados con mayor
            suma que tengan productos disponibles ese día y una puntuación de actividad de al menos
            40. No es posible pagar para obtener una posición mejor. El Cliente siempre puede elegir
            otra ordenación (precio, distancia, modo de producción, entre otras).
          </p>
          <p>
            El Agricultor puede activar una <strong>pausa</strong> (vacaciones, fuera de temporada)
            de hasta 6 meses: durante la pausa, los productos quedan ocultos, no recibe pedidos y la
            puntuación queda congelada. Lo mismo ocurre automáticamente cuando ningún producto está
            de temporada. El Agricultor ve su puntuación y sugerencias para mejorarla en la página de
            ventas y puede recibir recordatorios en la plataforma; la actividad nunca lleva a ocultar
            el perfil.
          </p>
        </>
      ),
    },
    {
      id: "encomendas",
      title: "Pedidos, precios y pago",
      content: (
        <>
          <p>
            Los precios se muestran en euros e incluyen el IVA al tipo legal vigente. Antes de
            confirmar, el Cliente ve el resumen del pedido, el total a pagar y el horario de recogida
            o entrega elegido.
          </p>
          <p>
            El pago se realiza en el momento del pedido y {LEGAL.brand} lo retiene hasta que el
            Cliente recoge o recibe los productos. Tras el pago, el Agricultor confirma el pedido. Si
            el Agricultor no tiene stock suficiente, puede cancelarlo, y el Cliente es{" "}
            <strong>reembolsado íntegramente</strong>.
          </p>
        </>
      ),
    },
    {
      id: "levantamento",
      title: "Recogida y entrega",
      content: (
        <>
          <p>
            Cada pedido tiene un código de recogida (también en formato QR) que el Cliente muestra
            al Agricultor. La recogida se hace en el lugar indicado por el Agricultor, dentro del
            horario de puertas abiertas y hasta el plazo límite que aparece en el pedido.
          </p>
          <p>
            Cuando el Agricultor ofrece entrega a domicilio, el Cliente indica la dirección y marca
            el punto exacto de entrega. Debe asegurarse de que alguien puede recibir el pedido en el
            horario acordado.
          </p>
        </>
      ),
    },
    {
      id: "nao-levantadas",
      title: "Pedidos no recogidos",
      content: (
        <>
          <p>
            Los productos son, en gran parte, perecederos y se reservan para el Cliente. Si el
            pedido no se recoge antes del plazo límite, caduca automáticamente: el Agricultor deja
            de estar obligado a guardarlo y <strong>solo se reembolsa el 10 % del importe
            pagado</strong>. El Cliente recibe una notificación en la plataforma cuando ocurre.
          </p>
          <p>
            Si no puede cumplir el horario, contacte con el Agricultor por el chat del pedido lo
            antes posible.
          </p>
        </>
      ),
    },
    {
      id: "livre-resolucao",
      title: "Derecho de desistimiento",
      content: (
        <>
          <p>
            Según el Decreto-Ley n.º 24/2014, el Cliente consumidor puede, por regla general,
            desistir de una compra a distancia en un plazo de 14 días. Este derecho{" "}
            <strong>no se aplica</strong> a bienes que puedan deteriorarse o caducar con rapidez
            (art. 17.º, n.º 1, letra d)), como fruta, verduras, huevos, lácteos o carne frescos.
          </p>
          <p>
            Para productos no perecederos, el Cliente puede ejercer el derecho de desistimiento
            contactando con {LEGAL.brand} en <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> y
            debe devolver los productos en buen estado. El reembolso se hace por el mismo medio de
            pago, en un plazo de 14 días desde la recepción de la devolución.
          </p>
        </>
      ),
    },
    {
      id: "conformidade",
      title: "Conformidad de los productos y reclamaciones",
      content: (
        <p>
          El Agricultor, como vendedor, responde de la falta de conformidad de los productos según
          el Decreto-Ley n.º 84/2021. Si un producto no corresponde a lo anunciado o está en mal
          estado, comunique el problema en la página del pedido o por el chat; {LEGAL.brand} hace el
          seguimiento de la resolución entre las partes.
        </p>
      ),
    },
    {
      id: "experiencias",
      title: "Experiencias en la granja",
      content: (
        <>
          <p>
            Los Agricultores pueden ofrecer experiencias en su explotación, reservadas y pagadas a
            través de la plataforma. La reserva se confirma en el momento del pago y se valida con
            el código QR a la llegada.
          </p>
          <p>
            La cancelación por el Cliente es gratuita hasta 5 días antes de la sesión. Después, se
            retiene el 25 % del valor de la experiencia (20 % para el Agricultor y 5 % para{" "}
            {LEGAL.brand}); los regalos extra pagados se reembolsan. Si no se presenta, el importe
            pagado no se devuelve. Si el Agricultor cancela, el Cliente recibe el importe íntegro.
          </p>
        </>
      ),
    },
    {
      id: "alojamento",
      title: "Alojamiento en la granja",
      content: (
        <>
          <p>
            Los Agricultores pueden ofrecer alojamiento en su explotación agrícola, siempre que esté
            registrado como Alojamiento Local o Turismo en el Espacio Rural; el número de registro lo
            indica el Agricultor y se muestra al Cliente. La reserva se confirma en el momento del
            pago y se valida con el código QR en el check-in.
          </p>
          <p>
            Se aplican las mismas reglas de cancelación que a las experiencias, contadas desde la
            fecha de entrada: gratuita hasta 5 días antes; después, se retiene el 25 % del valor del
            alojamiento (20 % para el Agricultor y 5 % para {LEGAL.brand}), y se reembolsan los
            regalos extra. Si no se presenta hasta la fecha de salida, el importe no se devuelve. La
            tasa turística, la comunicación de huéspedes a las autoridades y la facturación son
            responsabilidad del Agricultor.
          </p>
        </>
      ),
    },
    {
      id: "subscricoes",
      title: "Suscripciones",
      content: (
        <>
          <p>
            Los Agricultores pueden crear planes de suscripción (cestas) con entrega regular en casa del Cliente. En cada plan el Agricultor define el precio por periodo de cobro (semanal, quincenal o mensual), la frecuencia de las entregas, qué incluye, el plazo hasta la primera entrega y la distancia máxima de entrega. Estas condiciones se muestran al Cliente antes de suscribirse.
          </p>
          <p>
            La suscripción se paga al inicio de cada periodo y se renueva automáticamente hasta su cancelación. Cada entrega del periodo queda registrada como un pedido, con código QR para confirmar la entrega. Quien ya se suscribió mantiene sus condiciones, aunque el Agricultor cambie el plan.
          </p>
          <p>
            El Cliente puede cancelar en cualquier momento, en Mis pedidos. Las entregas previstas para dentro de más de 48 horas se reembolsan; las más próximas ya están en preparación y se mantienen. Si es el Agricultor quien cancela, se reembolsan al Cliente todas las entregas pendientes.
          </p>
          <p>
            Si no se realiza una entrega prometida, el Cliente puede presentar una queja según la sección de pedidos. Si el equipo de {LEGAL.brand} da la razón al Cliente, este recibe el valor de esa entrega más una indemnización del {LEGAL.subscriptionCompensationPercent} % de dicho valor, y se aplica al Agricultor una multa del {LEGAL.subscriptionFinePercent} % a favor de la plataforma. La indemnización y la multa corren a cargo del Agricultor y se descuentan de los importes que tenga que recibir. Antes de la decisión, el Agricultor dispone de 48 horas para demostrar la entrega.
          </p>
        </>
      ),
    },
    {
      id: "avaliacoes",
      title: "Valoraciones y contenidos de los usuarios",
      content: (
        <>
          <p>
            Solo puede valorar a un Agricultor quien le haya comprado a través de la plataforma
            (prueba de compra), con una valoración por pedido, después de recibirlo, si el Agricultor
            lo cancela o si la entrega a domicilio sigue pendiente 24 horas después de la fecha
            prevista. Las valoraciones deben ser honestas y respetuosas. Se prohíben los contenidos
            falsos, ofensivos, discriminatorios o ilegales, la publicidad y los datos personales de
            terceros, tanto en las valoraciones como en el chat de los pedidos.
          </p>
          <p>
            Una valoración publicada no puede modificarse. Su eliminación puede solicitarse con
            justificación y queda sujeta al análisis del equipo de {LEGAL.brand}. Quien denuncie un
            abuso por parte de un Agricultor debe presentar pruebas concretas; a falta de pruebas, el
            Agricultor puede emprender acciones judiciales por difamación.
          </p>
          <p>
            Podemos eliminar los contenidos que infrinjan estas reglas. Al publicar contenidos
            (textos, fotos), concede a {LEGAL.brand} una licencia no exclusiva y gratuita para
            mostrarlos en la plataforma mientras estén publicados.
          </p>
        </>
      ),
    },
    {
      id: "utilizacao",
      title: "Uso aceptable",
      content: (
        <ul>
          <li>No utilizar la plataforma con fines ilegales o fraudulentos.</li>
          <li>
            No intentar acceder a cuentas o datos de terceros, ni interferir en la seguridad o el
            funcionamiento del servicio.
          </li>
          <li>No recopilar datos de la plataforma por medios automatizados sin autorización.</li>
          <li>No eludir la plataforma para evitar la comisión en pedidos iniciados en ella.</li>
        </ul>
      ),
    },
    {
      id: "propriedade",
      title: "Propiedad intelectual",
      content: (
        <p>
          La marca {LEGAL.brand}, el diseño, el software y los contenidos de la plataforma
          pertenecen a {LEGAL.brand} o a sus licenciantes. Los contenidos publicados por los
          Agricultores (fotos, descripciones) son de su responsabilidad y titularidad.
        </p>
      ),
    },
    {
      id: "responsabilidade",
      title: "Responsabilidad",
      content: (
        <>
          <p>
            Como intermediario, {LEGAL.brand} no es responsable de la calidad, seguridad o
            conformidad de los productos, que corresponden al Agricultor, ni de la información
            incorrecta facilitada por los usuarios. Nos esforzamos por mantener la plataforma
            disponible y segura, pero no garantizamos un funcionamiento ininterrumpido.
          </p>
          <p>
            Nada en estos Términos limita los derechos que la ley reconoce a los consumidores, ni la
            responsabilidad de {LEGAL.brand} por dolo o culpa grave.
          </p>
        </>
      ),
    },
    {
      id: "suspensao",
      title: "Suspensión y cierre de la cuenta",
      content: (
        <p>
          Puede cerrar su cuenta en cualquier momento contactando con nosotros. Podemos suspender o
          cerrar las cuentas que infrinjan estos Términos o la ley, con aviso previo siempre que sea
          posible. Los pedidos en curso se completarán o reembolsarán según su estado.
        </p>
      ),
    },
    {
      id: "alteracoes",
      title: "Cambios en los Términos",
      content: (
        <p>
          Podemos actualizar estos Términos para reflejar cambios legales o del servicio. Los cambios
          relevantes se comunican en la plataforma con una antelación razonable y no se aplican a
          pedidos ya realizados.
        </p>
      ),
    },
    {
      id: "litigios",
      title: "Ley aplicable y resolución de litigios",
      content: (
        <>
          <p>Estos Términos se rigen por la ley portuguesa.</p>
          <p>
            En caso de litigio de consumo, el Cliente puede recurrir a una entidad de Resolución
            Alternativa de Litigios (Ley n.º 144/2015), en particular al{" "}
            <a href="https://www.cniacc.pt" target="_blank" rel="noopener noreferrer">
              CNIACC – Centro Nacional de Información y Arbitraje de Conflictos de Consumo
            </a>
            . Más información en el{" "}
            <a href="https://www.consumidor.gov.pt" target="_blank" rel="noopener noreferrer">
              Portal del Consumidor
            </a>
            .
          </p>
          <p>
            Disponemos de{" "}
            <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener noreferrer">
              Libro de Reclamaciones Electrónico
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
          Para cualquier cuestión sobre estos Términos: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>{" "}
          · {LEGAL.phone}.
        </p>
      ),
    },
  ],
};

export default termsEs;
