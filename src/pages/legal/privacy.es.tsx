import { Link } from "react-router-dom";
import CookieSection from "@/components/CookieSection";
import type { LegalDoc } from "@/components/LegalLayout";
import { LEGAL } from "@/lib/legal";

/** Política de privacidad — traducción de cortesía (prevalece la versión portuguesa). */
const privacyEs: LegalDoc = {
  title: "Política de privacidad",
  intro: (
    <p>
      Aquí explicamos qué datos personales tratamos, por qué, con quién los compartimos y cómo puede
      ejercer sus derechos, de acuerdo con el Reglamento General de Protección de Datos (RGPD) y la
      Ley portuguesa n.º 58/2019.
    </p>
  ),
  sections: [
    {
      id: "responsavel",
      title: "Responsable del tratamiento",
      content: (
        <p>
          El responsable del tratamiento de sus datos es <strong>{LEGAL.companyName}</strong>,
          NIF {LEGAL.nipc}, con domicilio social en {LEGAL.address}. Para cualquier cuestión de
          privacidad, contáctenos en <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
        </p>
      ),
    },
    {
      id: "dados",
      title: "Qué datos recogemos",
      content: (
        <ul>
          <li>
            <strong>Cuenta:</strong> nombre, email, contraseña (guardada cifrada por nuestro
            proveedor de autenticación), tipo de perfil, idioma preferido y, si la sube, foto de
            perfil. La foto se guarda en una dirección pública para poder aparecer en las
            reseñas que usted autorice. Si inicia sesión con Google, recibimos el nombre y el
            email de su cuenta de Google.
          </li>
          <li>
            <strong>Agricultores:</strong> denominación, NIF, código CAE, número de explotación,
            dirección, lugar y coordenadas de recogida, teléfono, sitio web, horarios,
            descripción, certificados, periodos de pausa y su mensaje, estado de verificación y,
            en el alojamiento, el número de registro (Alojamiento Local o Turismo Rural). En las
            solicitudes de cambio de datos guardamos la justificación, los documentos
            acreditativos y la decisión del equipo. El historial de stock registra quién hizo
            cada cambio.
          </li>
          <li>
            <strong>Pagos de los Agricultores:</strong> el identificador de la cuenta en Stripe
            y si la cuenta está lista para cobrar. Los datos de identificación y el IBAN se
            entregan directamente a Stripe y no se guardan en la plataforma.
          </li>
          <li>
            <strong>Pedidos y reservas:</strong> productos, importes, comisión, horario de
            recogida, código de recogida y, en las entregas a domicilio, la dirección y el punto
            de entrega marcado en el mapa. En las reservas de experiencias y alojamiento: fechas,
            número de personas o huéspedes, habitaciones, regalos elegidos, cancelaciones,
            tarifas y reembolsos. En las suscripciones: el plan, el precio, la periodicidad, la dirección y el punto de
            entrega, las fechas de cobro, la cancelación y, en su caso, la indemnización recibida.
          </li>
          <li>
            <strong>Comunicaciones y actividad:</strong> mensajes del chat de los pedidos y
            archivos adjuntos, denuncias y sus pruebas, quejas por entregas no recibidas,
            reseñas, solicitudes de eliminación de reseñas, notificaciones y favoritos.
          </li>
          <li>
            <strong>Uso de IA:</strong> el registro de cada uso de «Escribir con IA» (para el
            límite diario) y las traducciones automáticas guardadas. Véase la sección sobre
            Inteligencia Artificial.
          </li>
          <li>
            <strong>Datos técnicos:</strong> dirección IP y registros de acceso necesarios para
            la seguridad del servicio, y los datos guardados en el navegador descritos en la
            sección de cookies.
          </li>
        </ul>
      ),
    },
    {
      id: "finalidades",
      title: "Para qué usamos los datos",
      content: (
        <ul>
          <li>
            <strong>Ejecutar el contrato</strong> (art. 6.1.b) del RGPD): crear y gestionar la
            cuenta, tramitar pedidos, reservas, cancelaciones y pagos, permitir la recogida y la
            entrega, el chat entre Cliente y Agricultor, las notificaciones y los emails de
            servicio, y las propuestas de descripción con IA que pide el Agricultor.
          </li>
          <li>
            <strong>Cumplir obligaciones legales</strong> (letra c)): facturación, contabilidad
            y respuesta a solicitudes de autoridades.
          </li>
          <li>
            <strong>Intereses legítimos</strong> (letra f)): verificar Agricultores, prevenir el
            fraude y los abusos, analizar denuncias, quejas y solicitudes, garantizar la
            seguridad de la plataforma, traducir automáticamente contenidos al idioma de quien
            los lee y mejorar el servicio. Incluye el cálculo de la puntuación de actividad de
            los Agricultores (actualización del catálogo, rapidez de respuesta a pedidos y en el
            chat), usada para ordenar el catálogo, elegir destacados y enviar recordatorios. Esta
            puntuación nunca lleva a la suspensión u ocultación del perfil; los criterios se
            describen en los <Link to="/termos#ordenacao">Términos</Link>.
          </li>
          <li>
            <strong>Consentimiento</strong> (letra a)): cookies de preferencias y mapas de
            Google. Puede retirarlo en cualquier momento, sin que ello afecte al tratamiento ya
            realizado.
          </li>
        </ul>
      ),
    },
    {
      id: "automaticos",
      title: "Procesos automáticos",
      content: (
        <>
          <p>
            Algunos pasos ocurren automáticamente, según reglas fijas y públicas, sin
            intervención de la inteligencia artificial:
          </p>
          <ul>
            <li>
              los pedidos no recogidos dentro del plazo límite caducan, con un reembolso del 10 %
              (véanse los <Link to="/termos#nao-levantadas">Términos</Link>);
            </li>
            <li>
              la puntuación de actividad se calcula cada día con los datos de los últimos 30
              días;
            </li>
            <li>
              cuando un Agricultor solicita el cambio de datos oficiales, el perfil y los
              productos quedan ocultos hasta que el equipo analice la solicitud (como máximo 7
              días);
            </li>
            <li>los lotes de stock caducados salen automáticamente de la venta.</li>
          </ul>
          <p>
            Las decisiones sobre denuncias, quejas, solicitudes de eliminación de reseñas y
            solicitudes de cambio de datos las toma siempre una persona del equipo. Puede pedir
            aclaraciones o impugnar cualquiera de estos pasos escribiendo a{" "}
            <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
          </p>
        </>
      ),
    },
    {
      id: "partilha",
      title: "Con quién compartimos",
      content: (
        <>
          <ul>
            <li>
              <strong>Agricultores:</strong> cuando hace un pedido o una reserva, el Agricultor
              recibe su nombre, los detalles del pedido o la reserva y, si pidió entrega, la
              dirección y el punto de entrega.
            </li>
            <li>
              <strong>Clientes:</strong> el perfil público del Agricultor (explotación,
              ubicación, horarios, reseñas) es visible para todos. En sus reseñas aparecen su
              nombre y la inicial de su apellido y, solo si lo autoriza, su foto de perfil. Puede
              retirar esa autorización en cualquier momento en Mis pedidos.
            </li>
            <li>
              <strong>Proveedores de servicios</strong> que tratan datos por cuenta nuestra, con
              contrato de encargo del tratamiento: alojamiento, base de datos, archivos y
              autenticación (Supabase), alojamiento de la aplicación (Cloudflare), inicio de
              sesión con Google y Google Maps (Google), envío de emails (Resend), cálculo de rutas
              por carretera (openrouteservice, de HeiGIT gGmbH, Alemania) e inteligencia
              artificial (Anthropic, véase la sección siguiente).
            </li>
            <li>
              <strong>Stripe:</strong> cuando el Agricultor configura los pagos, enviamos a Stripe
              el nombre de la empresa, el email y el país. Stripe recoge directamente la
              identificación y los datos bancarios y también los trata como responsable propio,
              para cumplir sus obligaciones de prevención del fraude y del blanqueo de capitales,
              según su{" "}
              <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">
                política de privacidad
              </a>
              .
            </li>
            <li>
              <strong>Tipos de letra:</strong> el sitio carga fuentes de Google (Google Fonts), lo
              que transmite su dirección IP a Google.
            </li>
            <li>
              <strong>Cálculo de rutas:</strong> cuando el Agricultor organiza la ruta de las
              entregas a domicilio, los puntos de entrega (coordenadas, sin nombre ni dirección)
              se envían a openrouteservice para calcular la ruta más rápida por carretera.
            </li>
            <li>
              <strong>Autoridades</strong>, cuando la ley lo exija.
            </li>
          </ul>
          <p>No vendemos sus datos ni los usamos para publicidad.</p>
        </>
      ),
    },
    {
      id: "ia",
      title: "Uso de Inteligencia Artificial",
      content: (
        <>
          <p>
            Usamos modelos de inteligencia artificial (IA) del proveedor{" "}
            <strong>Anthropic</strong> (modelos Claude) en dos funciones:
          </p>
          <ul>
            <li>
              <strong>«Escribir con IA» (Agricultores):</strong> cuando el Agricultor pulsa el
              botón en un producto, experiencia o alojamiento, enviamos el texto que escribió, los
              datos de ese formulario, el nombre de la granja y hasta 3 fotos, solo para proponer
              una descripción. No se envía nada si el Agricultor no pulsa el botón, y la propuesta
              solo sustituye el texto si el Agricultor la acepta; el texto publicado es
              responsabilidad suya. Recomendamos no usar fotos en las que aparezcan personas.
              Guardamos el registro de cada uso para aplicar el límite diario. Base jurídica:
              ejecución del contrato.
            </li>
            <li>
              <strong>Traducción automática:</strong> cuando alguien ve la plataforma en otro
              idioma, los textos escritos por usuarios (descripciones y notas de productos,
              granjas, experiencias y alojamiento, reseñas, notificaciones, nombres de los
              artículos de los pedidos y mensajes del chat) se envían a Anthropic para ser
              traducidos. Solo se envía el texto, sin el nombre, contacto ni dirección de quien lo
              escribió. Los mensajes del chat solo se traducen para las dos partes del pedido, y
              el texto original siempre está disponible («Ver original»). Las traducciones se
              guardan en nuestra base de datos para no tener que pedirlas de nuevo. Base
              jurídica: interés legítimo en hacer la plataforma comprensible en varios idiomas;
              puede oponerse escribiéndonos.
            </li>
          </ul>
          <p>Sobre el tratamiento por parte de Anthropic:</p>
          <ul>
            <li>
              Anthropic actúa como nuestro encargado del tratamiento, al amparo de un acuerdo de
              tratamiento de datos, y{" "}
              <strong>no usa estos datos para entrenar sus modelos</strong>;
            </li>
            <li>
              las solicitudes y respuestas se borran por Anthropic en un plazo de 30 días, salvo
              el contenido señalado por infringir su política de uso o cuando la ley exija
              conservarlo;
            </li>
            <li>
              los datos pueden tratarse en Estados Unidos y en otros países fuera del Espacio
              Económico Europeo, sobre la base de cláusulas contractuales tipo aprobadas por la
              Comisión Europea.
            </li>
          </ul>
          <p>
            La IA <strong>no toma decisiones</strong> sobre usted: no decide pedidos, pagos,
            reseñas, puntuaciones ni el acceso a la plataforma. Los textos traducidos o propuestos
            por la IA se generan automáticamente y pueden contener errores; en caso de duda,
            prevalece el texto original.
          </p>
        </>
      ),
    },
    {
      id: "transferencias",
      title: "Transferencias internacionales",
      content: (
        <p>
          Algunos proveedores tratan datos fuera del Espacio Económico Europeo, en particular en
          Estados Unidos (por ejemplo, Anthropic, Stripe, Resend y Google). En esos casos, la
          transferencia se basa en una decisión de adecuación de la Comisión Europea (como el
          EU-US Data Privacy Framework, para los proveedores certificados) o en cláusulas
          contractuales tipo.
        </p>
      ),
    },
    {
      id: "conservacao",
      title: "Durante cuánto tiempo",
      content: (
        <ul>
          <li>Datos de cuenta: mientras la cuenta esté activa.</li>
          <li>
            Pedidos, reservas y datos de facturación: 10 años, según exige la legislación fiscal
            y contable.
          </li>
          <li>
            Mensajes del chat, adjuntos, denuncias y quejas: mientras sean necesarios para el
            pedido y para posibles reclamaciones o litigios, o hasta que solicite su eliminación.
          </li>
          <li>
            Solicitudes de cambio de datos y certificados: mientras el Agricultor tenga cuenta.
          </li>
          <li>
            Traducciones automáticas y registros de uso de la IA: por ahora sin plazo definido;
            se borran a petición suya. En Anthropic: hasta 30 días.
          </li>
          <li>Puntuación de actividad: calculada con los datos de los últimos 30 días.</li>
          <li>Datos en el navegador: según la tabla de la sección de cookies.</li>
        </ul>
      ),
    },
    {
      id: "direitos",
      title: "Sus derechos",
      content: (
        <>
          <p>
            Tiene derecho de acceso, rectificación, supresión, limitación del tratamiento,
            portabilidad y oposición (incluido al tratamiento basado en interés legítimo, como la
            traducción automática), y a retirar el consentimiento en cualquier momento. Puede
            ejercerlos escribiendo a <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>;
            respondemos en el plazo de un mes. Parte de los datos puede corregirse directamente
            en su <Link to="/perfil">perfil</Link>. El cierre de la cuenta y la supresión de los
            datos se hacen a petición, por email, conservando solo lo que la ley nos obliga a
            guardar.
          </p>
          <p>
            También puede presentar una reclamación ante la autoridad portuguesa de protección de
            datos (CNPD), Av. D. Carlos I, 134, 1.º, 1200-651 Lisboa,{" "}
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
      title: "Seguridad",
      content: (
        <p>
          Usamos conexiones cifradas (HTTPS), contraseñas cifradas y reglas de acceso en la base
          de datos que garantizan que cada usuario solo ve los datos a los que tiene derecho. Los
          certificados, documentos y adjuntos se guardan en almacenamiento privado. Ningún sistema
          es infalible; si detectamos una violación de datos que le afecte, le informaremos según
          la ley.
        </p>
      ),
    },
    {
      id: "menores",
      title: "Menores",
      content: (
        <p>
          La plataforma está destinada a mayores de 18 años. No recogemos intencionadamente datos
          de menores.
        </p>
      ),
    },
    {
      id: "cookies",
      title: "Cookies y almacenamiento local",
      content: <CookieSection />,
    },
    {
      id: "alteracoes",
      title: "Cambios en esta política",
      content: (
        <p>
          Podemos actualizar esta política. Los cambios relevantes se comunican en la plataforma
          y, si cambian las finalidades de las cookies, volveremos a pedir su consentimiento.
          Consulte también los <Link to="/termos">Términos y condiciones</Link>.
        </p>
      ),
    },
  ],
};

export default privacyEs;
