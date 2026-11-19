import { Link } from "react-router-dom";
import CookieSection from "@/components/CookieSection";
import type { LegalDoc } from "@/components/LegalLayout";
import { LEGAL } from "@/lib/legal";

/** Privacy Policy — courtesy translation (the Portuguese version prevails). */
const privacyEn: LegalDoc = {
  title: "Privacy Policy",
  intro: (
    <p>
      Here we explain which personal data we process, why, with whom we share it and how you can
      exercise your rights, under the General Data Protection Regulation (GDPR) and Portuguese Law
      no. 58/2019.
    </p>
  ),
  sections: [
    {
      id: "responsavel",
      title: "Data controller",
      content: (
        <p>
          The controller of your data is <strong>{LEGAL.companyName}</strong>, company no.{" "}
          {LEGAL.nipc}, with registered office at {LEGAL.address}. For any privacy question, contact
          us at <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
        </p>
      ),
    },
    {
      id: "dados",
      title: "What data we collect",
      content: (
        <ul>
          <li>
            <strong>Account:</strong> name, email, password (stored encrypted by our authentication
            provider), profile photo and profile type. If you log in with Google, we receive the
            name, email and photo of your Google account.
          </li>
          <li>
            <strong>Farmers:</strong> company name, tax number, CAE code, farm registration number,
            address, collection point and coordinates, phone, website, opening hours, description
            and certificates.
          </li>
          <li>
            <strong>Orders:</strong> products, amounts, collection time, collection code and, for
            home deliveries, the address and the delivery point marked on the map.
          </li>
          <li>
            <strong>Communications and activity:</strong> order chat messages, notifications,
            reported problems, reviews and favourites.
          </li>
          <li>
            <strong>Technical data:</strong> IP address and access logs needed for the security of
            the service, and the data stored in the browser described in the cookies section.
          </li>
        </ul>
      ),
    },
    {
      id: "finalidades",
      title: "What we use the data for",
      content: (
        <ul>
          <li>
            <strong>Performing the contract</strong> (art. 6(1)(b) GDPR): creating and managing the
            account, processing orders and payments, enabling collection and delivery, the chat
            between Customer and Farmer and notifications.
          </li>
          <li>
            <strong>Complying with legal obligations</strong> (point (c)): invoicing, accounting and
            responding to requests from authorities.
          </li>
          <li>
            <strong>Legitimate interests</strong> (point (f)): verifying Farmers, preventing fraud
            and abuse, ensuring the security of the platform and improving the service. This
            includes calculating the Farmers' activity score (catalogue updates, speed of response
            to orders and in the chat), used to sort the catalogue, choose featured farmers and send
            reminders. This score never leads to the profile being suspended or hidden; the criteria
            are described in the <Link to="/termos#ordenacao">Terms</Link>.
          </li>
          <li>
            <strong>Consent</strong> (point (a)): preference cookies and Google maps. You can
            withdraw it at any time, without affecting processing already carried out.
          </li>
        </ul>
      ),
    },
    {
      id: "partilha",
      title: "Who we share it with",
      content: (
        <>
          <ul>
            <li>
              <strong>Farmers:</strong> when you order, the Farmer receives your name, the order
              details and, if you asked for delivery, the address and delivery point.
            </li>
            <li>
              <strong>Customers:</strong> the Farmer's public profile (farm, location, opening hours,
              reviews) is visible to everyone. Your reviews show your first name and the initial of
              your surname and, only if you allow it, your profile photo. You can withdraw that
              permission at any time in My orders.
            </li>
            <li>
              <strong>Service providers</strong> that process data on our behalf under a data
              processing agreement: hosting, database and authentication (Supabase), application
              hosting (Cloudflare), Google authentication and Google Maps (Google) and road route
              calculation (openrouteservice, by HeiGIT gGmbH, Germany).
            </li>
            <li>
              <strong>AI descriptions:</strong> when the Farmer uses "Write with AI" on a product,
              experience or accommodation, the text they wrote, that form's details and up to 3
              photos are sent to Anthropic (provider of the Claude model), only to propose the
              description. Nothing is sent unless the Farmer presses the button, and the proposal
              only replaces the text if the Farmer accepts it.
            </li>
            <li>
              <strong>Automatic translation:</strong> when someone views the Platform in another
              language, texts written by users (descriptions of products, farms, experiences and
              accommodation, reviews, notifications and order chat messages) are sent to Anthropic
              to be translated. Only the text is sent, without the author's name, contact details or
              address. Translations are stored in our database so they aren't requested again, and
              chat messages are only translated for the two parties to the order.
            </li>
            <li>
              <strong>Route calculation:</strong> when the Farmer organises the home delivery route,
              the delivery points (coordinates, without name or address) are sent to
              openrouteservice to calculate the fastest road route.
            </li>
            <li>
              <strong>Authorities</strong>, when required by law.
            </li>
          </ul>
          <p>We do not sell your data or use it for advertising.</p>
        </>
      ),
    },
    {
      id: "transferencias",
      title: "International transfers",
      content: (
        <p>
          Some providers may process data outside the European Economic Area, namely in the United
          States. In such cases, the transfer is based on a European Commission adequacy decision
          (such as the EU-US Data Privacy Framework) or on standard contractual clauses.
        </p>
      ),
    },
    {
      id: "conservacao",
      title: "How long we keep it",
      content: (
        <ul>
          <li>Account data: while the account is active.</li>
          <li>Orders and invoicing data: 10 years, as required by tax and accounting legislation.</li>
          <li>Messages and reports: for as long as needed for the order and any complaints or disputes.</li>
          <li>Data in the browser: as shown in the table in the cookies section.</li>
        </ul>
      ),
    },
    {
      id: "direitos",
      title: "Your rights",
      content: (
        <>
          <p>
            You have the right of access, rectification, erasure, restriction of processing,
            portability and objection, and to withdraw consent at any time. You can exercise them by
            writing to <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>; we reply within one
            month. Some data can be corrected directly in your <Link to="/perfil">profile</Link>.
          </p>
          <p>
            You can also lodge a complaint with the Portuguese data protection authority, CNPD (
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
      title: "Security",
      content: (
        <p>
          We use encrypted connections (HTTPS), encrypted passwords and database access rules that
          ensure each user only sees the data they are entitled to. No system is infallible; if we
          detect a data breach affecting you, we will inform you as required by law.
        </p>
      ),
    },
    {
      id: "menores",
      title: "Minors",
      content: <p>The platform is intended for people over 18. We do not knowingly collect data from minors.</p>,
    },
    {
      id: "cookies",
      title: "Cookies and local storage",
      content: <CookieSection />,
    },
    {
      id: "alteracoes",
      title: "Changes to this policy",
      content: (
        <p>
          We may update this policy. Relevant changes are announced on the platform and, if the
          purposes of the cookies change, we will ask for your consent again. See also the{" "}
          <Link to="/termos">Terms and Conditions</Link>.
        </p>
      ),
    },
  ],
};

export default privacyEn;
