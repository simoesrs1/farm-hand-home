import { Link } from "react-router-dom";
import type { LegalDoc } from "@/components/LegalLayout";
import { LEGAL } from "@/lib/legal";

/** Terms and Conditions — courtesy translation (the Portuguese version prevails). */
const termsEn: LegalDoc = {
  title: "Terms and Conditions",
  intro: (
    <p>
      These are the rules for using {LEGAL.brand}, for Customers and Farmers. Please read them
      carefully, especially the sections on uncollected orders and on the right of withdrawal.
    </p>
  ),
  sections: [
    {
      id: "identificacao",
      title: "Identification and purpose",
      content: (
        <>
          <p>
            The {LEGAL.brand} platform is operated by <strong>{LEGAL.companyName}</strong>, legal
            entity no. {LEGAL.nipc}, with registered office at {LEGAL.address} (hereinafter
            "{LEGAL.brand}" or "we"), who can be contacted at{" "}
            <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
          </p>
          <p>
            {LEGAL.brand} is a local digital marketplace that connects consumers ("Customers") with
            local farmers and producers ("Farmers"). {LEGAL.brand} acts as an{" "}
            <strong>intermediary</strong>: it provides the shop window, order and payment
            processing and communication tools, but it is not the seller of the products. The sales
            contract is concluded directly between the Customer and the Farmer.
          </p>
          <p>
            These Terms and Conditions govern access to and use of the platform. The processing of
            personal data is governed by the <Link to="/privacidade">Privacy Policy</Link>.
          </p>
        </>
      ),
    },
    {
      id: "aceitacao",
      title: "Acceptance and capacity",
      content: (
        <>
          <p>
            By creating an account or placing an order, you declare that you have read and accept
            these Terms. If you do not agree, you must not use the platform.
          </p>
          <p>
            To create an account you must be at least 18 years old and have legal capacity to
            contract. Farmers declare that they act in the course of their professional activity.
          </p>
        </>
      ),
    },
    {
      id: "contas",
      title: "User accounts",
      content: (
        <>
          <p>
            The same account can have a Customer profile and a Farmer profile, which share the same
            email and password. You can register with email and password or with a Google account.
          </p>
          <ul>
            <li>The information provided must be true, complete and kept up to date.</li>
            <li>
              You are responsible for keeping your credentials confidential and for all activity on
              your account. Let us know immediately if you suspect misuse.
            </li>
            <li>The account is personal and non-transferable.</li>
          </ul>
        </>
      ),
    },
    {
      id: "agricultores",
      title: "Farmers",
      content: (
        <>
          <p>
            To sell, the Farmer must complete the farm registration (including company name, tax
            number, CAE code, farm registration number and, where applicable, certificates).{" "}
            {LEGAL.brand} may verify this information and refuse, suspend or remove profiles that do
            not comply.
          </p>
          <p>The Farmer undertakes to:</p>
          <ul>
            <li>
              sell only products they may legally market, complying with the applicable food
              safety, hygiene, labelling and traceability rules;
            </li>
            <li>
              describe products accurately (origin, production method, quantity, unit and price
              including VAT) and keep stock up to date;
            </li>
            <li>
              honour accepted orders, respect the collection and delivery hours they have published
              and issue the tax documents required by law;
            </li>
            <li>provide the legal guarantees for the products they sell.</li>
          </ul>
          <p>
            For its intermediation, {LEGAL.brand} retains a commission of{" "}
            <strong>{LEGAL.commissionPercent}% of the value of each order</strong>, with the
            remainder paid to the Farmer once the order is completed.
          </p>
        </>
      ),
    },
    {
      id: "ordenacao",
      title: "Ranking and featuring",
      content: (
        <>
          <p>
            In the default sorting ("Relevance") of the catalogue and search, and in choosing the
            farmers featured on the home page, we use two main parameters, added together:
          </p>
          <ul>
            <li>
              <strong>Activity score (0 to 100)</strong>, calculated daily over the last 30 days:
              catalogue and stock updates (40%), speed in accepting orders and orders not cancelled
              due to lack of stock (40%) and replies to customers in the chat within 24 hours (20%).
              A component with no data (for example, no orders in the period) is not penalised: its
              weight is redistributed among the others.
            </li>
            <li>
              Farm <strong>certificates</strong> validated at registration (10 points per
              certificate, up to 50).
            </li>
          </ul>
          <p>
            The home page features the 6 verified farmers with the highest total who have products
            available that day and an activity score of at least 40. It is not possible to pay for a
            better position. The Customer can always choose another sorting (price, distance,
            production method, among others).
          </p>
          <p>
            The Farmer can activate a <strong>pause</strong> (holidays, off-season) of up to 6
            months: during the pause, products are hidden, no orders are received and the score is
            frozen. The same happens automatically when no product is in season. The Farmer sees
            their score and suggestions to improve it on the sales page and may receive reminders on
            the platform; activity never leads to the profile being hidden.
          </p>
        </>
      ),
    },
    {
      id: "encomendas",
      title: "Orders, prices and payment",
      content: (
        <>
          <p>
            Prices are shown in euros and include VAT at the legal rate in force. Before confirming,
            the Customer sees the order summary, the total to pay and the chosen collection or
            delivery time.
          </p>
          <p>
            Payment is made at the time of ordering and is held by {LEGAL.brand} until the Customer
            collects or receives the products. After payment, the Farmer confirms the order. If the
            Farmer does not have enough stock, they may cancel it, in which case the Customer is{" "}
            <strong>refunded in full</strong>.
          </p>
        </>
      ),
    },
    {
      id: "levantamento",
      title: "Collection and delivery",
      content: (
        <>
          <p>
            Each order has a collection code (also as a QR code) that the Customer shows the Farmer.
            Collection takes place at the location given by the Farmer, within the open-door hours
            and by the deadline shown on the order.
          </p>
          <p>
            When the Farmer offers home delivery, the Customer enters the address and marks the exact
            delivery point. They must ensure that someone can receive the order at the agreed time.
          </p>
        </>
      ),
    },
    {
      id: "nao-levantadas",
      title: "Uncollected orders",
      content: (
        <>
          <p>
            The products are, for the most part, perishable and are reserved for the Customer. If
            the order is not collected by the deadline, it expires automatically: the Farmer is no
            longer obliged to keep it and <strong>only 10% of the amount paid is refunded</strong>.
            The Customer is notified on the platform when this happens.
          </p>
          <p>If you cannot keep to the time, contact the Farmer via the order chat as early as possible.</p>
        </>
      ),
    },
    {
      id: "livre-resolucao",
      title: "Right of withdrawal",
      content: (
        <>
          <p>
            Under Decree-Law no. 24/2014, the consumer Customer may, as a rule, withdraw from a
            distance purchase within 14 days. This right <strong>does not apply</strong> to goods
            liable to deteriorate or expire rapidly (art. 17(1)(d)), such as fresh fruit,
            vegetables, eggs, dairy or meat.
          </p>
          <p>
            For non-perishable products, the Customer may exercise the right of withdrawal by
            contacting {LEGAL.brand} at <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> and must
            return the products in good condition. The refund is made using the same payment method
            within 14 days of receiving the returned goods.
          </p>
        </>
      ),
    },
    {
      id: "conformidade",
      title: "Product conformity and complaints",
      content: (
        <p>
          The Farmer, as seller, is liable for any lack of conformity of the products under
          Decree-Law no. 84/2021. If a product does not match its description or is in poor
          condition, report the problem on the order page or via the chat; {LEGAL.brand} follows
          the resolution between the parties.
        </p>
      ),
    },
    {
      id: "experiencias",
      title: "Farm experiences",
      content: (
        <>
          <p>
            Farmers may offer experiences on their farm, booked and paid for through the platform.
            The booking is confirmed at the time of payment and validated with the QR code on
            arrival.
          </p>
          <p>
            Cancellation by the Customer is free up to 5 days before the session. After that, 25% of
            the experience price is retained (20% for the Farmer and 5% for {LEGAL.brand}); paid
            extra gifts are refunded. In the event of a no-show, the amount paid is not refunded. If
            the Farmer cancels, the Customer receives the full amount back.
          </p>
        </>
      ),
    },
    {
      id: "alojamento",
      title: "Farm accommodation",
      content: (
        <>
          <p>
            Farmers may offer accommodation on their farm, provided it is registered as Local
            Accommodation (AL) or Rural Tourism (TER); the registration number is provided by the
            Farmer and shown to the Customer. The booking is confirmed at the time of payment and
            validated with the QR code at check-in.
          </p>
          <p>
            The same cancellation rules as for experiences apply, counted from the check-in date:
            free up to 5 days before; after that, 25% of the accommodation price is retained (20%
            for the Farmer and 5% for {LEGAL.brand}), with extra gifts refunded. In the event of a
            no-show up to the check-out date, the amount is not refunded. Tourist tax, guest
            reporting to the authorities and invoicing are the Farmer's responsibility.
          </p>
        </>
      ),
    },
    {
      id: "subscricoes",
      title: "Subscriptions",
      content: (
        <>
          <p>
            Farmers can create subscription plans (boxes) delivered regularly to the Customer's home. For each plan the Farmer sets the price per billing period (weekly, fortnightly or monthly), how often deliveries are made, what is included, the time until the first delivery and the maximum delivery distance. These terms are shown to the Customer before subscribing.
          </p>
          <p>
            The subscription is paid at the start of each period and renews automatically until cancelled. Each delivery in the period is recorded as an order, with a QR code to confirm delivery. Existing subscribers keep the terms they signed up with, even if the Farmer changes the plan.
          </p>
          <p>
            The Customer may cancel at any time, in My orders. Deliveries scheduled more than 48 hours ahead are refunded; closer ones are already being prepared and remain. If the Farmer cancels, all pending deliveries are refunded to the Customer.
          </p>
          <p>
            If a promised delivery is not made, the Customer may complain under the orders section. If the {LEGAL.brand} team upholds the complaint, the Customer receives the value of that delivery plus compensation of {LEGAL.subscriptionCompensationPercent}% of that value, and the Farmer is charged a fine of {LEGAL.subscriptionFinePercent}% in favour of the platform. The compensation and the fine are borne by the Farmer and deducted from amounts due to them. Before the decision, the Farmer has 48 hours to show proof of delivery.
          </p>
        </>
      ),
    },
    {
      id: "avaliacoes",
      title: "Reviews and user content",
      content: (
        <>
          <p>
            Only people who have bought from a Farmer through the platform (proof of purchase) can
            review them, with one review per order, after receiving it, if the Farmer cancels it, or
            if the home delivery is still outstanding 24 hours after the expected date. Reviews must
            be honest and respectful. False, offensive, discriminatory or illegal content,
            advertising or third parties' personal data are prohibited, both in reviews and in the
            order chat.
          </p>
          <p>
            A published review cannot be changed. Its removal can be requested with justification
            and is subject to review by the {LEGAL.brand} team. Anyone reporting abuse by a Farmer
            must provide concrete proof; without proof, the Farmer may take legal action for
            defamation.
          </p>
          <p>
            We may remove content that breaks these rules. By publishing content (texts, photos),
            you grant {LEGAL.brand} a non-exclusive, free licence to display it on the platform while
            it is published.
          </p>
        </>
      ),
    },
    {
      id: "utilizacao",
      title: "Acceptable use",
      content: (
        <ul>
          <li>Do not use the platform for illegal or fraudulent purposes.</li>
          <li>
            Do not attempt to access third parties' accounts or data, or interfere with the security
            or operation of the service.
          </li>
          <li>Do not collect data from the platform by automated means without authorisation.</li>
          <li>Do not bypass the platform to avoid the commission on orders started on it.</li>
        </ul>
      ),
    },
    {
      id: "propriedade",
      title: "Intellectual property",
      content: (
        <p>
          The {LEGAL.brand} brand, design, software and platform content belong to {LEGAL.brand} or
          its licensors. Content published by Farmers (photos, descriptions) is their responsibility
          and property.
        </p>
      ),
    },
    {
      id: "responsabilidade",
      title: "Liability",
      content: (
        <>
          <p>
            As an intermediary, {LEGAL.brand} is not responsible for the quality, safety or
            conformity of the products, which are the Farmer's responsibility, nor for incorrect
            information provided by users. We strive to keep the platform available and secure, but
            we do not guarantee uninterrupted operation.
          </p>
          <p>
            Nothing in these Terms limits the rights granted to consumers by law, nor{" "}
            {LEGAL.brand}'s liability for wilful misconduct or gross negligence.
          </p>
        </>
      ),
    },
    {
      id: "suspensao",
      title: "Account suspension and closure",
      content: (
        <p>
          You can close your account at any time by contacting us. We may suspend or close accounts
          that breach these Terms or the law, giving notice whenever possible. Orders in progress
          will be completed or refunded according to their status.
        </p>
      ),
    },
    {
      id: "alteracoes",
      title: "Changes to the Terms",
      content: (
        <p>
          We may update these Terms to reflect legal or service changes. Relevant changes are
          announced on the platform with reasonable notice and do not apply to orders already
          placed.
        </p>
      ),
    },
    {
      id: "litigios",
      title: "Applicable law and dispute resolution",
      content: (
        <>
          <p>These Terms are governed by Portuguese law.</p>
          <p>
            In the event of a consumer dispute, the Customer may turn to an Alternative Dispute
            Resolution body (Law no. 144/2015), namely the{" "}
            <a href="https://www.cniacc.pt" target="_blank" rel="noopener noreferrer">
              CNIACC – National Centre for Information and Arbitration of Consumer Disputes
            </a>
            . More information on the{" "}
            <a href="https://www.consumidor.gov.pt" target="_blank" rel="noopener noreferrer">
              Consumer Portal
            </a>
            .
          </p>
          <p>
            We provide an{" "}
            <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener noreferrer">
              Electronic Complaints Book
            </a>
            .
          </p>
        </>
      ),
    },
    {
      id: "contactos",
      title: "Contacts",
      content: (
        <p>
          For any question about these Terms: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> ·{" "}
          {LEGAL.phone}.
        </p>
      ),
    },
  ],
};

export default termsEn;
