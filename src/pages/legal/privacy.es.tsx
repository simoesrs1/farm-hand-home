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
          El responsable del tratamiento de sus datos es <strong>{LEGAL.companyName}</strong>, NIPC{" "}
          {LEGAL.nipc}, con domicilio social en {LEGAL.address}. Para cualquier cuestión sobre
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
            proveedor de autenticación), foto de perfil y tipo de perfil. Si inicia sesión con
            Google, recibimos el nombre, el email y la foto de su cuenta de Google.
          </li>
          <li>
            <strong>Agricultores:</strong> denominación, NIF, código CAE, número de explotación,
            dirección, lugar y coordenadas de recogida, teléfono, sitio web, horarios, descripción y
            certificados.
          </li>
          <li>
            <strong>Pedidos:</strong> productos, importes, horario de recogida, código de recogida y,
            en las entregas a domicilio, la dirección y el punto de entrega marcado en el mapa.
          </li>
          <li>
            <strong>Comunicaciones y actividad:</strong> mensajes del chat de los pedidos,
            notificaciones, problemas comunicados, valoraciones y favoritos.
          </li>
          <li>
            <strong>Datos técnicos:</strong> dirección IP y registros de acceso necesarios para la
            seguridad del servicio, y los datos guardados en el navegador descritos en la sección de
            cookies.
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
            <strong>Ejecutar el contrato</strong> (art. 6.1.b del RGPD): crear y gestionar la
            cuenta, procesar pedidos y pagos, permitir la recogida y la entrega, el chat entre
            Cliente y Agricultor y las notificaciones.
          </li>
          <li>
            <strong>Cumplir obligaciones legales</strong> (letra c): facturación, contabilidad y
            respuesta a solicitudes de las autoridades.
          </li>
          <li>
            <strong>Intereses legítimos</strong> (letra f): verificar a los Agricultores, prevenir
            el fraude y los abusos, garantizar la seguridad de la plataforma y mejorar el servicio.
            Incluye el cálculo de la puntuación de actividad de los Agricultores (actualización del
            catálogo, rapidez de respuesta a pedidos y en el chat), usada para ordenar el catálogo,
            elegir destacados y enviar recordatorios. Esta puntuación nunca lleva a suspender u
            ocultar el perfil; los criterios se describen en los{" "}
            <Link to="/termos#ordenacao">Términos</Link>.
          </li>
          <li>
            <strong>Consentimiento</strong> (letra a): cookies de preferencias y mapas de Google.
            Puede retirarlo en cualquier momento, sin que afecte al tratamiento ya realizado.
          </li>
        </ul>
      ),
    },
    {
      id: "partilha",
      title: "Con quién los compartimos",
      content: (
        <>
          <ul>
            <li>
              <strong>Agricultores:</strong> cuando hace un pedido, el Agricultor recibe su nombre,
              los detalles del pedido y, si pidió entrega, la dirección y el punto de entrega.
            </li>
            <li>
              <strong>Clientes:</strong> el perfil público del Agricultor (explotación, ubicación,
              horarios, valoraciones) es visible para todos. En sus valoraciones aparece su nombre y
              la inicial del apellido y, solo si lo autoriza, su foto de perfil. Puede retirar esa
              autorización en cualquier momento en Mis pedidos.
            </li>
            <li>
              <strong>Prestadores de servicios</strong> que tratan datos por nuestra cuenta, con
              contrato de encargo del tratamiento: alojamiento, base de datos y autenticación
              (Supabase), alojamiento de la aplicación (Cloudflare), autenticación de Google y Google
              Maps (Google) y cálculo de rutas por carretera (openrouteservice, de HeiGIT gGmbH,
              Alemania).
            </li>
            <li>
              <strong>Descripciones con IA:</strong> cuando el Agricultor usa "Escribir con IA" en un
              producto, experiencia o alojamiento, el texto que escribió, los datos de ese formulario
              y hasta 3 fotos se envían a Anthropic (proveedor del modelo Claude), solo para proponer
              la descripción. No se envía nada sin que el Agricultor pulse el botón, y la propuesta
              solo sustituye el texto si el Agricultor la acepta.
            </li>
            <li>
              <strong>Traducción automática:</strong> cuando alguien ve la Plataforma en otro
              idioma, los textos escritos por usuarios (descripciones de productos, granjas,
              experiencias y alojamiento, valoraciones, notificaciones y mensajes del chat de un
              pedido) se envían a Anthropic para traducirlos. Solo se envía el texto, sin nombre,
              contacto ni dirección de quien lo escribió. Las traducciones se guardan en nuestra base
              de datos para no volver a pedirlas, y los mensajes del chat solo se traducen para las
              dos partes del pedido.
            </li>
            <li>
              <strong>Cálculo de rutas:</strong> cuando el Agricultor organiza la ruta de las
              entregas a domicilio, los puntos de entrega (coordenadas, sin nombre ni dirección) se
              envían a openrouteservice para calcular la ruta más rápida por carretera.
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
      id: "transferencias",
      title: "Transferencias internacionales",
      content: (
        <p>
          Algunos prestadores pueden tratar datos fuera del Espacio Económico Europeo, en particular
          en los Estados Unidos. En esos casos, la transferencia se basa en una decisión de
          adecuación de la Comisión Europea (como el EU-US Data Privacy Framework) o en cláusulas
          contractuales tipo.
        </p>
      ),
    },
    {
      id: "conservacao",
      title: "Durante cuánto tiempo",
      content: (
        <ul>
          <li>Datos de la cuenta: mientras la cuenta esté activa.</li>
          <li>Pedidos y datos de facturación: 10 años, según exige la legislación fiscal y contable.</li>
          <li>Mensajes y denuncias: mientras sean necesarios para el pedido y para posibles reclamaciones o litigios.</li>
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
            portabilidad y oposición, y a retirar el consentimiento en cualquier momento. Puede
            ejercerlos escribiendo a <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>;
            respondemos en el plazo de un mes. Parte de los datos puede corregirse directamente en su{" "}
            <Link to="/perfil">perfil</Link>.
          </p>
          <p>
            También puede presentar una reclamación ante la autoridad portuguesa de protección de
            datos, CNPD (
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
      title: "Seguridad",
      content: (
        <p>
          Usamos conexiones cifradas (HTTPS), contraseñas cifradas y reglas de acceso en la base de
          datos que garantizan que cada usuario solo ve los datos a los que tiene derecho. Ningún
          sistema es infalible; si detectamos una violación de datos que le afecte, le informaremos
          en los términos de la ley.
        </p>
      ),
    },
    {
      id: "menores",
      title: "Menores",
      content: <p>La plataforma está destinada a mayores de 18 años. No recogemos intencionadamente datos de menores.</p>,
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
          Podemos actualizar esta política. Los cambios relevantes se comunican en la plataforma y,
          si cambian las finalidades de las cookies, volveremos a pedir su consentimiento. Consulte
          también los <Link to="/termos">Términos y condiciones</Link>.
        </p>
      ),
    },
  ],
};

export default privacyEs;
