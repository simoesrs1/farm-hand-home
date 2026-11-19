import { Link } from "react-router-dom";
import CookieSection from "@/components/CookieSection";
import type { LegalDoc } from "@/components/LegalLayout";
import { LEGAL } from "@/lib/legal";

/** Datenschutzerklärung — unverbindliche Übersetzung (es gilt die portugiesische Fassung). */
const privacyDe: LegalDoc = {
  title: "Datenschutzerklärung",
  intro: (
    <p>
      Hier erklären wir, welche personenbezogenen Daten wir verarbeiten, warum, an wen wir sie
      weitergeben und wie Sie Ihre Rechte ausüben können, gemäß der Datenschutz-Grundverordnung
      (DSGVO) und dem portugiesischen Gesetz Nr. 58/2019.
    </p>
  ),
  sections: [
    {
      id: "responsavel",
      title: "Verantwortlicher",
      content: (
        <p>
          Verantwortlich für die Verarbeitung Ihrer Daten ist <strong>{LEGAL.companyName}</strong>,
          Unternehmensnr. {LEGAL.nipc}, mit Sitz in {LEGAL.address}. Bei Fragen zum Datenschutz
          kontaktieren Sie uns unter <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
        </p>
      ),
    },
    {
      id: "dados",
      title: "Welche Daten wir erheben",
      content: (
        <ul>
          <li>
            <strong>Konto:</strong> Name, E-Mail, Passwort (von unserem Authentifizierungsanbieter
            verschlüsselt gespeichert), Profilfoto und Profiltyp. Wenn Sie sich mit Google anmelden,
            erhalten wir Name, E-Mail und Foto Ihres Google-Kontos.
          </li>
          <li>
            <strong>Landwirte:</strong> Firmenname, Steuernummer, CAE-Code, Betriebsnummer, Adresse,
            Abholort und Koordinaten, Telefon, Website, Öffnungszeiten, Beschreibung und
            Zertifikate.
          </li>
          <li>
            <strong>Bestellungen:</strong> Produkte, Beträge, Abholzeit, Abholcode und bei
            Lieferungen nach Hause die Adresse und der auf der Karte markierte Lieferpunkt.
          </li>
          <li>
            <strong>Kommunikation und Aktivität:</strong> Nachrichten im Bestell-Chat,
            Benachrichtigungen, gemeldete Probleme, Bewertungen und Favoriten.
          </li>
          <li>
            <strong>Technische Daten:</strong> IP-Adresse und Zugriffsprotokolle, die für die
            Sicherheit des Dienstes nötig sind, sowie die im Browser gespeicherten Daten, die im
            Abschnitt über Cookies beschrieben sind.
          </li>
        </ul>
      ),
    },
    {
      id: "finalidades",
      title: "Wofür wir die Daten verwenden",
      content: (
        <ul>
          <li>
            <strong>Vertragserfüllung</strong> (Art. 6 Abs. 1 lit. b DSGVO): Konto erstellen und
            verwalten, Bestellungen und Zahlungen abwickeln, Abholung und Lieferung ermöglichen, den
            Chat zwischen Kunde und Landwirt sowie Benachrichtigungen.
          </li>
          <li>
            <strong>Erfüllung rechtlicher Pflichten</strong> (lit. c): Rechnungsstellung,
            Buchhaltung und Beantwortung behördlicher Anfragen.
          </li>
          <li>
            <strong>Berechtigte Interessen</strong> (lit. f): Landwirte prüfen, Betrug und
            Missbrauch verhindern, die Sicherheit der Plattform gewährleisten und den Dienst
            verbessern. Dazu gehört die Berechnung der Aktivitätspunktzahl der Landwirte
            (Aktualisierung des Katalogs, Reaktionsschnelligkeit bei Bestellungen und im Chat), mit
            der der Katalog sortiert, hervorgehobene Landwirte ausgewählt und Erinnerungen
            verschickt werden. Diese Punktzahl führt nie zur Sperrung oder Ausblendung des Profils;
            die Kriterien sind in den <Link to="/termos#ordenacao">AGB</Link> beschrieben.
          </li>
          <li>
            <strong>Einwilligung</strong> (lit. a): Präferenz-Cookies und Google-Karten. Sie können
            sie jederzeit widerrufen, ohne dass dies die bereits erfolgte Verarbeitung berührt.
          </li>
        </ul>
      ),
    },
    {
      id: "partilha",
      title: "An wen wir Daten weitergeben",
      content: (
        <>
          <ul>
            <li>
              <strong>Landwirte:</strong> Wenn Sie bestellen, erhält der Landwirt Ihren Namen, die
              Bestelldetails und, falls Sie Lieferung gewählt haben, die Adresse und den
              Lieferpunkt.
            </li>
            <li>
              <strong>Kunden:</strong> Das öffentliche Profil des Landwirts (Betrieb, Standort,
              Öffnungszeiten, Bewertungen) ist für alle sichtbar. In Ihren Bewertungen erscheinen Ihr
              Vorname und der erste Buchstabe Ihres Nachnamens und, nur wenn Sie es erlauben, Ihr
              Profilfoto. Sie können diese Erlaubnis jederzeit unter Meine Bestellungen widerrufen.
            </li>
            <li>
              <strong>Dienstleister</strong>, die Daten in unserem Auftrag auf Grundlage eines
              Auftragsverarbeitungsvertrags verarbeiten: Hosting, Datenbank und Authentifizierung
              (Supabase), Hosting der Anwendung (Cloudflare), Google-Anmeldung und Google Maps
              (Google) sowie Berechnung von Straßenrouten (openrouteservice, HeiGIT gGmbH,
              Deutschland).
            </li>
            <li>
              <strong>KI-Beschreibungen:</strong> Wenn der Landwirt bei einem Produkt, Erlebnis oder
              einer Unterkunft „Mit KI schreiben“ nutzt, werden sein Text, die Formulardaten und bis
              zu 3 Fotos an Anthropic (Anbieter des Modells Claude) gesendet, nur um eine
              Beschreibung vorzuschlagen. Ohne Klick des Landwirts wird nichts gesendet, und der
              Vorschlag ersetzt den Text nur, wenn der Landwirt zustimmt.
            </li>
            <li>
              <strong>Automatische Übersetzung:</strong> Wenn jemand die Plattform in einer anderen
              Sprache aufruft, werden von Nutzern verfasste Texte (Beschreibungen von Produkten,
              Höfen, Erlebnissen und Unterkünften, Bewertungen, Benachrichtigungen und Nachrichten im
              Bestell-Chat) zur Übersetzung an Anthropic gesendet. Es wird nur der Text gesendet,
              ohne Name, Kontaktdaten oder Adresse des Verfassers. Die Übersetzungen werden in
              unserer Datenbank gespeichert, damit sie nicht erneut angefordert werden, und
              Chat-Nachrichten werden nur für die beiden Parteien der Bestellung übersetzt.
            </li>
            <li>
              <strong>Routenberechnung:</strong> Wenn der Landwirt die Route der Lieferungen nach
              Hause plant, werden die Lieferpunkte (Koordinaten, ohne Name oder Adresse) an
              openrouteservice gesendet, um die schnellste Straßenroute zu berechnen.
            </li>
            <li>
              <strong>Behörden</strong>, wenn das Gesetz es verlangt.
            </li>
          </ul>
          <p>Wir verkaufen Ihre Daten nicht und verwenden sie nicht für Werbung.</p>
        </>
      ),
    },
    {
      id: "transferencias",
      title: "Internationale Übermittlungen",
      content: (
        <p>
          Einige Dienstleister können Daten außerhalb des Europäischen Wirtschaftsraums verarbeiten,
          insbesondere in den Vereinigten Staaten. In diesen Fällen stützt sich die Übermittlung auf
          einen Angemessenheitsbeschluss der Europäischen Kommission (wie das EU-US Data Privacy
          Framework) oder auf Standardvertragsklauseln.
        </p>
      ),
    },
    {
      id: "conservacao",
      title: "Wie lange wir Daten speichern",
      content: (
        <ul>
          <li>Kontodaten: solange das Konto aktiv ist.</li>
          <li>Bestell- und Rechnungsdaten: 10 Jahre, wie steuer- und handelsrechtlich vorgeschrieben.</li>
          <li>Nachrichten und Meldungen: solange sie für die Bestellung und mögliche Reklamationen oder Streitigkeiten nötig sind.</li>
          <li>Daten im Browser: gemäß der Tabelle im Abschnitt über Cookies.</li>
        </ul>
      ),
    },
    {
      id: "direitos",
      title: "Ihre Rechte",
      content: (
        <>
          <p>
            Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der
            Verarbeitung, Datenübertragbarkeit und Widerspruch sowie das Recht, Ihre Einwilligung
            jederzeit zu widerrufen. Sie können diese Rechte per E-Mail an{" "}
            <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> ausüben; wir antworten innerhalb
            eines Monats. Ein Teil der Daten kann direkt in Ihrem <Link to="/perfil">Profil</Link>{" "}
            korrigiert werden.
          </p>
          <p>
            Sie können auch Beschwerde bei der portugiesischen Datenschutzbehörde CNPD einlegen (
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
      title: "Sicherheit",
      content: (
        <p>
          Wir verwenden verschlüsselte Verbindungen (HTTPS), verschlüsselte Passwörter und
          Zugriffsregeln in der Datenbank, die sicherstellen, dass jeder Nutzer nur die Daten sieht,
          auf die er Anspruch hat. Kein System ist unfehlbar; wenn wir eine Datenschutzverletzung
          feststellen, die Sie betrifft, informieren wir Sie nach Maßgabe des Gesetzes.
        </p>
      ),
    },
    {
      id: "menores",
      title: "Minderjährige",
      content: <p>Die Plattform richtet sich an Personen ab 18 Jahren. Wir erheben nicht wissentlich Daten von Minderjährigen.</p>,
    },
    {
      id: "cookies",
      title: "Cookies und lokaler Speicher",
      content: <CookieSection />,
    },
    {
      id: "alteracoes",
      title: "Änderungen dieser Erklärung",
      content: (
        <p>
          Wir können diese Erklärung aktualisieren. Wesentliche Änderungen werden auf der Plattform
          mitgeteilt, und wenn sich die Zwecke der Cookies ändern, bitten wir erneut um Ihre
          Einwilligung. Siehe auch die <Link to="/termos">Allgemeinen Geschäftsbedingungen</Link>.
        </p>
      ),
    },
  ],
};

export default privacyDe;
