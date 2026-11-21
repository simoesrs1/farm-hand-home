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
          The controller of your data is <strong>{LEGAL.companyName}</strong>, tax no.{" "}
          {LEGAL.nipc}, with registered office at {LEGAL.address}. For any privacy question,
          contact us at <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
        </p>
      ),
    },
    {
      id: "dados",
      title: "What data we collect",
      content: (
        <ul>
          <li>
            <strong>Account:</strong> name, email, password (stored encrypted by our
            authentication provider), profile type, preferred language and, if you upload one, a
            profile photo. The photo is kept at a public address so that it can appear in the
            reviews you allow. If you sign in with Google, we receive the name and email of your
            Google account.
          </li>
          <li>
            <strong>Farmers:</strong> business name, tax number (NIF), CAE code, holding number,
            address, pickup location and coordinates, phone, website, opening hours,
            description, certificates, pause periods and their message, verification status and,
            for accommodation, the registration number (Local Accommodation or Rural Tourism). For
            data change requests we keep the justification, the supporting documents and the
            team's decision. The stock history records who made each change.
          </li>
          <li>
            <strong>Farmer payments:</strong> the Stripe account identifier and whether the
            account is ready to receive payments. Identity data and the IBAN are given directly to
            Stripe and are not kept on the platform.
          </li>
          <li>
            <strong>Orders and bookings:</strong> products, amounts, commission, pickup time,
            pickup code and, for home delivery, the address and the delivery point marked on the
            map. For experience and accommodation bookings: dates, number of people or guests,
            rooms, chosen gifts, cancellations, fees and refunds. For subscriptions: the plan, price, frequency, delivery address and point, billing dates, cancellation and, where applicable, any compensation received.
          </li>
          <li>
            <strong>Communications and activity:</strong> order chat messages and attached files,
            reports and their evidence, complaints about undelivered orders, reviews, review
            removal requests, notifications and favourites.
          </li>
          <li>
            <strong>Use of AI:</strong> a record of each use of "Write with AI" (for the daily
            limit) and the stored automatic translations. See the section on Artificial
            Intelligence.
          </li>
          <li>
            <strong>Technical data:</strong> IP address and access logs needed for the security
            of the service, and the data stored in the browser described in the cookies section.
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
            <strong>Performing the contract</strong> (Art. 6(1)(b) GDPR): creating and managing
            the account, processing orders, bookings, cancellations and payments, enabling pickup
            and delivery, the chat between Customer and Farmer, notifications and service emails,
            and the AI description proposals requested by the Farmer.
          </li>
          <li>
            <strong>Complying with legal obligations</strong> (point (c)): invoicing, accounting
            and responding to requests from authorities.
          </li>
          <li>
            <strong>Legitimate interests</strong> (point (f)): verifying Farmers, preventing fraud
            and abuse, handling reports, complaints and requests, keeping the platform secure,
            automatically translating content into the reader's language and improving the
            service. This includes calculating the Farmers' activity score (catalogue updates,
            speed of response to orders and in the chat), used to sort the catalogue, choose
            highlights and send reminders. This score never leads to the profile being suspended
            or hidden; the criteria are described in the <Link to="/termos#ordenacao">Terms</Link>.
          </li>
          <li>
            <strong>Consent</strong> (point (a)): preference cookies and Google maps. You may
            withdraw it at any time, without affecting processing already carried out.
          </li>
        </ul>
      ),
    },
    {
      id: "automaticos",
      title: "Automatic processes",
      content: (
        <>
          <p>
            Some steps happen automatically, following fixed and public rules, without the
            involvement of artificial intelligence:
          </p>
          <ul>
            <li>
              orders not picked up by the deadline expire, with a 10% refund (see the{" "}
              <Link to="/termos#nao-levantadas">Terms</Link>);
            </li>
            <li>the activity score is calculated every day using data from the last 30 days;</li>
            <li>
              when a Farmer requests a change to official data, the profile and products are
              hidden until the team reviews the request (within 7 days at most);
            </li>
            <li>stock batches past their expiry date are automatically removed from sale.</li>
          </ul>
          <p>
            Decisions on reports, complaints, review removal requests and data change requests
            are always made by a member of the team. You may ask for clarification or challenge
            any of these steps by writing to <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
          </p>
        </>
      ),
    },
    {
      id: "partilha",
      title: "Who we share it with",
      content: (
        <>
          <ul>
            <li>
              <strong>Farmers:</strong> when you order or book, the Farmer receives your name, the
              order or booking details and, if you asked for delivery, the address and delivery
              point.
            </li>
            <li>
              <strong>Customers:</strong> the Farmer's public profile (farm, location, hours,
              reviews) is visible to everyone. Your reviews show your first name and the initial
              of your surname and, only if you allow it, your profile photo. You can withdraw that
              permission at any time in My orders.
            </li>
            <li>
              <strong>Service providers</strong> that process data on our behalf under a
              processing agreement: hosting, database, files and authentication (Supabase),
              application hosting (Cloudflare), Google sign-in and Google Maps (Google), email
              delivery (Resend), road route calculation (openrouteservice, by HeiGIT gGmbH,
              Germany) and artificial intelligence (Anthropic, see the next section).
            </li>
            <li>
              <strong>Stripe:</strong> when the Farmer sets up payments, we send Stripe the
              company name, email and country. Stripe collects identity and bank details directly
              and also processes them as an independent controller, to meet its fraud-prevention
              and anti-money-laundering obligations, under its{" "}
              <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">
                privacy policy
              </a>
              .
            </li>
            <li>
              <strong>Fonts:</strong> the site loads fonts from Google (Google Fonts), which
              transmits your IP address to Google.
            </li>
            <li>
              <strong>Route calculation:</strong> when the Farmer plans the home delivery route,
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
      id: "ia",
      title: "Use of Artificial Intelligence",
      content: (
        <>
          <p>
            We use artificial intelligence (AI) models from the provider{" "}
            <strong>Anthropic</strong> (Claude models) in two features:
          </p>
          <ul>
            <li>
              <strong>"Write with AI" (Farmers):</strong> when the Farmer presses the button on a
              product, experience or accommodation, we send the text they wrote, the data in that
              form, the farm name and up to 3 photos, solely to propose a description. Nothing is
              sent unless the Farmer presses the button, and the proposal only replaces the text
              if the Farmer accepts it; the published text is the Farmer's responsibility. We
              recommend not using photos showing people. We keep a record of each use to apply
              the daily limit. Legal basis: performance of the contract.
            </li>
            <li>
              <strong>Automatic translation:</strong> when someone views the platform in another
              language, texts written by users (descriptions and notes of products, farms,
              experiences and accommodation, reviews, notifications, order item names and chat
              messages) are sent to Anthropic to be translated. Only the text is sent, without the
              name, contact details or address of the author. Chat messages are only translated
              for the two parties to the order, and the original text is always available ("Show
              original"). Translations are stored in our database so they do not need to be
              requested again. Legal basis: legitimate interest in making the platform
              understandable in several languages; you may object by writing to us.
            </li>
          </ul>
          <p>Regarding processing by Anthropic:</p>
          <ul>
            <li>
              Anthropic acts as our processor under a data processing agreement and{" "}
              <strong>does not use this data to train its models</strong>;
            </li>
            <li>
              requests and responses are deleted by Anthropic within 30 days, except for content
              flagged for breaching its usage policy or where the law requires it to be kept;
            </li>
            <li>
              the data may be processed in the United States and other countries outside the
              European Economic Area, on the basis of standard contractual clauses approved by the
              European Commission.
            </li>
          </ul>
          <p>
            The AI <strong>does not make decisions</strong> about you: it does not decide on
            orders, payments, reviews, scores or access to the platform. Texts translated or
            proposed by the AI are generated automatically and may contain errors; in case of
            doubt, the original text prevails.
          </p>
        </>
      ),
    },
    {
      id: "transferencias",
      title: "International transfers",
      content: (
        <p>
          Some providers process data outside the European Economic Area, namely in the United
          States (for example Anthropic, Stripe, Resend and Google). In those cases the transfer
          relies on an adequacy decision of the European Commission (such as the EU-US Data
          Privacy Framework, for certified providers) or on standard contractual clauses.
        </p>
      ),
    },
    {
      id: "conservacao",
      title: "How long we keep it",
      content: (
        <ul>
          <li>Account data: while the account is active.</li>
          <li>
            Orders, bookings and invoicing data: 10 years, as required by tax and accounting law.
          </li>
          <li>
            Chat messages, attachments, reports and complaints: for as long as they are needed for
            the order and for any claims or disputes, or until you ask for their deletion.
          </li>
          <li>Data change requests and certificates: while the Farmer has an account.</li>
          <li>
            Automatic translations and AI usage records: for no fixed period at present; they are
            deleted at your request. At Anthropic: up to 30 days.
          </li>
          <li>Activity score: calculated from data for the last 30 days.</li>
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
            You have the right of access, rectification, erasure, restriction of processing, data
            portability and objection (including to processing based on legitimate interest, such
            as automatic translation), and to withdraw consent at any time. You can exercise them
            by writing to <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>; we reply within one
            month. Some data can be corrected directly in your <Link to="/perfil">profile</Link>.
            Closing the account and erasing the data are done on request, by email, keeping only
            what the law requires us to retain.
          </p>
          <p>
            You may also lodge a complaint with the Portuguese data protection authority (CNPD),
            Av. D. Carlos I, 134, 1.º, 1200-651 Lisboa,{" "}
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
      title: "Security",
      content: (
        <p>
          We use encrypted connections (HTTPS), encrypted passwords and database access rules that
          ensure each user only sees the data they are entitled to. Certificates, documents and
          attachments are kept in private storage. No system is infallible; if we detect a data
          breach that affects you, we will inform you as required by law.
        </p>
      ),
    },
    {
      id: "menores",
      title: "Minors",
      content: (
        <p>The platform is intended for people aged 18 or over. We do not knowingly collect data from minors.</p>
      ),
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
