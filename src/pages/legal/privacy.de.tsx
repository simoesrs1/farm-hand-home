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
          Steuernummer {LEGAL.nipc}, mit Sitz in {LEGAL.address}. Bei Fragen zum Datenschutz
          erreichen Sie uns unter <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
        </p>
      ),
    },
    {
      id: "dados",
      title: "Welche Daten wir erheben",
      content: (
        <ul>
          <li>
            <strong>Konto:</strong> Name, E-Mail, Passwort (von unserem
            Authentifizierungsanbieter verschlüsselt gespeichert), Profiltyp, bevorzugte Sprache
            und, falls Sie eines hochladen, ein Profilfoto. Das Foto liegt unter einer
            öffentlichen Adresse, damit es in den von Ihnen erlaubten Bewertungen erscheinen kann.
            Wenn Sie sich mit Google anmelden, erhalten wir Namen und E-Mail Ihres Google-Kontos.
          </li>
          <li>
            <strong>Landwirte:</strong> Firmenname, Steuernummer (NIF), CAE-Code,
            Betriebsnummer, Adresse, Abholort und Koordinaten, Telefon, Website, Öffnungszeiten,
            Beschreibung, Zertifikate, Pausenzeiträume und deren Nachricht, Prüfstatus und, bei
            Unterkünften, die Registrierungsnummer (Lokale Unterkunft oder Ländlicher Tourismus).
            Bei Anträgen auf Datenänderung speichern wir die Begründung, die Nachweise und die
            Entscheidung des Teams. Die Bestandshistorie hält fest, wer jede Änderung vorgenommen
            hat.
          </li>
          <li>
            <strong>Zahlungen der Landwirte:</strong> die Kennung des Stripe-Kontos und ob das
            Konto Zahlungen empfangen kann. Identitätsdaten und IBAN werden direkt an Stripe
            übermittelt und nicht auf der Plattform gespeichert.
          </li>
          <li>
            <strong>Bestellungen und Buchungen:</strong> Produkte, Beträge, Provision,
            Abholzeit, Abholcode und, bei Lieferung nach Hause, die Adresse und der auf der Karte
            markierte Lieferpunkt. Bei Buchungen von Erlebnissen und Unterkünften: Daten, Anzahl
            der Personen oder Gäste, Zimmer, gewählte Geschenke, Stornierungen, Gebühren und
            Erstattungen.
          </li>
          <li>
            <strong>Kommunikation und Aktivität:</strong> Chatnachrichten zu Bestellungen und
            angehängte Dateien, Meldungen und deren Nachweise, Beschwerden über nicht erhaltene
            Lieferungen, Bewertungen, Anträge auf Löschung von Bewertungen, Benachrichtigungen und
            Favoriten.
          </li>
          <li>
            <strong>Nutzung von KI:</strong> ein Protokoll jeder Nutzung von „Mit KI schreiben"
            (für das Tageslimit) und die gespeicherten automatischen Übersetzungen. Siehe den
            Abschnitt über Künstliche Intelligenz.
          </li>
          <li>
            <strong>Technische Daten:</strong> IP-Adresse und Zugriffsprotokolle, die für die
            Sicherheit des Dienstes nötig sind, sowie die im Abschnitt über Cookies beschriebenen
            Daten im Browser.
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
            <strong>Vertragserfüllung</strong> (Art. 6 Abs. 1 lit. b DSGVO): Konto anlegen und
            verwalten, Bestellungen, Buchungen, Stornierungen und Zahlungen abwickeln, Abholung
            und Lieferung ermöglichen, Chat zwischen Kunde und Landwirt, Benachrichtigungen und
            Service-E-Mails sowie die vom Landwirt angeforderten KI-Beschreibungsvorschläge.
          </li>
          <li>
            <strong>Erfüllung rechtlicher Pflichten</strong> (lit. c): Rechnungsstellung,
            Buchhaltung und Beantwortung behördlicher Anfragen.
          </li>
          <li>
            <strong>Berechtigte Interessen</strong> (lit. f): Landwirte prüfen, Betrug und
            Missbrauch verhindern, Meldungen, Beschwerden und Anträge bearbeiten, die Sicherheit
            der Plattform gewährleisten, Inhalte automatisch in die Sprache des Lesers übersetzen
            und den Dienst verbessern. Dazu gehört die Berechnung des Aktivitätswerts der
            Landwirte (Aktualität des Katalogs, Reaktionsgeschwindigkeit bei Bestellungen und im
            Chat), mit dem der Katalog sortiert, Empfehlungen ausgewählt und Erinnerungen
            versendet werden. Dieser Wert führt nie zur Sperrung oder Ausblendung des Profils; die
            Kriterien sind in den <Link to="/termos#ordenacao">AGB</Link> beschrieben.
          </li>
          <li>
            <strong>Einwilligung</strong> (lit. a): Präferenz-Cookies und Google-Karten. Sie
            können sie jederzeit widerrufen, ohne dass die bereits erfolgte Verarbeitung berührt
            wird.
          </li>
        </ul>
      ),
    },
    {
      id: "automaticos",
      title: "Automatische Abläufe",
      content: (
        <>
          <p>
            Einige Schritte erfolgen automatisch nach festen und öffentlichen Regeln, ohne
            Einsatz künstlicher Intelligenz:
          </p>
          <ul>
            <li>
              nicht bis zur Frist abgeholte Bestellungen verfallen, mit einer Erstattung von 10 %
              (siehe <Link to="/termos#nao-levantadas">AGB</Link>);
            </li>
            <li>
              der Aktivitätswert wird täglich mit den Daten der letzten 30 Tage berechnet;
            </li>
            <li>
              wenn ein Landwirt die Änderung amtlicher Daten beantragt, werden Profil und
              Produkte ausgeblendet, bis das Team den Antrag prüft (höchstens 7 Tage);
            </li>
            <li>abgelaufene Bestandschargen werden automatisch aus dem Verkauf genommen.</li>
          </ul>
          <p>
            Entscheidungen über Meldungen, Beschwerden, Anträge auf Löschung von Bewertungen und
            Anträge auf Datenänderung trifft immer ein Mitglied des Teams. Sie können unter{" "}
            <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> Erläuterungen verlangen oder
            jeden dieser Schritte anfechten.
          </p>
        </>
      ),
    },
    {
      id: "partilha",
      title: "An wen wir Daten weitergeben",
      content: (
        <>
          <ul>
            <li>
              <strong>Landwirte:</strong> wenn Sie bestellen oder buchen, erhält der Landwirt
              Ihren Namen, die Einzelheiten der Bestellung oder Buchung und, wenn Sie eine
              Lieferung gewünscht haben, die Adresse und den Lieferpunkt.
            </li>
            <li>
              <strong>Kunden:</strong> das öffentliche Profil des Landwirts (Hof, Standort,
              Öffnungszeiten, Bewertungen) ist für alle sichtbar. In Ihren Bewertungen erscheinen
              Ihr Vorname und der Anfangsbuchstabe Ihres Nachnamens und, nur wenn Sie es erlauben,
              Ihr Profilfoto. Sie können diese Erlaubnis jederzeit unter Meine Bestellungen
              widerrufen.
            </li>
            <li>
              <strong>Dienstleister</strong>, die Daten in unserem Auftrag auf Grundlage eines
              Auftragsverarbeitungsvertrags verarbeiten: Hosting, Datenbank, Dateien und
              Authentifizierung (Supabase), Hosting der Anwendung (Cloudflare), Google-Anmeldung
              und Google Maps (Google), E-Mail-Versand (Resend), Routenberechnung auf der Straße
              (openrouteservice, von HeiGIT gGmbH, Deutschland) und künstliche Intelligenz
              (Anthropic, siehe nächster Abschnitt).
            </li>
            <li>
              <strong>Stripe:</strong> wenn der Landwirt die Zahlungen einrichtet, übermitteln wir
              Stripe den Firmennamen, die E-Mail und das Land. Stripe erhebt Identitäts- und
              Bankdaten direkt und verarbeitet sie auch als eigenständiger Verantwortlicher, um
              seine Pflichten zur Betrugsprävention und Geldwäschebekämpfung zu erfüllen, gemäß
              seiner{" "}
              <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">
                Datenschutzerklärung
              </a>
              .
            </li>
            <li>
              <strong>Schriftarten:</strong> die Website lädt Schriftarten von Google (Google
              Fonts), wodurch Ihre IP-Adresse an Google übermittelt wird.
            </li>
            <li>
              <strong>Routenberechnung:</strong> wenn der Landwirt die Route der Lieferungen nach
              Hause plant, werden die Lieferpunkte (Koordinaten, ohne Name oder Adresse) an
              openrouteservice gesendet, um die schnellste Straßenroute zu berechnen.
            </li>
            <li>
              <strong>Behörden</strong>, wenn das Gesetz es verlangt.
            </li>
          </ul>
          <p>Wir verkaufen Ihre Daten nicht und nutzen sie nicht für Werbung.</p>
        </>
      ),
    },
    {
      id: "ia",
      title: "Einsatz Künstlicher Intelligenz",
      content: (
        <>
          <p>
            Wir verwenden Modelle künstlicher Intelligenz (KI) des Anbieters{" "}
            <strong>Anthropic</strong> (Claude-Modelle) für zwei Funktionen:
          </p>
          <ul>
            <li>
              <strong>„Mit KI schreiben" (Landwirte):</strong> wenn der Landwirt bei einem
              Produkt, Erlebnis oder einer Unterkunft auf die Schaltfläche drückt, senden wir den
              von ihm geschriebenen Text, die Angaben dieses Formulars, den Namen des Hofs und bis
              zu 3 Fotos, ausschließlich um eine Beschreibung vorzuschlagen. Ohne Klick auf die
              Schaltfläche wird nichts gesendet, und der Vorschlag ersetzt den Text nur, wenn der
              Landwirt ihn annimmt; für den veröffentlichten Text ist der Landwirt verantwortlich.
              Wir empfehlen, keine Fotos zu verwenden, auf denen Personen zu sehen sind. Wir
              protokollieren jede Nutzung, um das Tageslimit anzuwenden. Rechtsgrundlage:
              Vertragserfüllung.
            </li>
            <li>
              <strong>Automatische Übersetzung:</strong> wenn jemand die Plattform in einer
              anderen Sprache ansieht, werden von Nutzern geschriebene Texte (Beschreibungen und
              Hinweise zu Produkten, Höfen, Erlebnissen und Unterkünften, Bewertungen,
              Benachrichtigungen, Artikelnamen in Bestellungen und Chatnachrichten) zur
              Übersetzung an Anthropic gesendet. Es wird nur der Text gesendet, ohne Namen,
              Kontaktdaten oder Adresse des Verfassers. Chatnachrichten werden nur für die beiden
              Parteien der Bestellung übersetzt, und der Originaltext bleibt immer verfügbar
              („Original anzeigen"). Übersetzungen werden in unserer Datenbank gespeichert, damit
              sie nicht erneut angefordert werden müssen. Rechtsgrundlage: berechtigtes Interesse,
              die Plattform in mehreren Sprachen verständlich zu machen; Sie können durch eine
              Nachricht an uns widersprechen.
            </li>
          </ul>
          <p>Zur Verarbeitung durch Anthropic:</p>
          <ul>
            <li>
              Anthropic handelt als unser Auftragsverarbeiter auf Grundlage eines
              Auftragsverarbeitungsvertrags und{" "}
              <strong>verwendet diese Daten nicht zum Training seiner Modelle</strong>;
            </li>
            <li>
              Anfragen und Antworten werden von Anthropic innerhalb von 30 Tagen gelöscht, außer
              bei Inhalten, die wegen Verstoßes gegen die Nutzungsrichtlinie markiert wurden, oder
              wenn das Gesetz eine Aufbewahrung verlangt;
            </li>
            <li>
              die Daten können in den Vereinigten Staaten und anderen Ländern außerhalb des
              Europäischen Wirtschaftsraums verarbeitet werden, auf Grundlage von der
              Europäischen Kommission genehmigter Standardvertragsklauseln.
            </li>
          </ul>
          <p>
            Die KI <strong>trifft keine Entscheidungen</strong> über Sie: Sie entscheidet nicht
            über Bestellungen, Zahlungen, Bewertungen, Aktivitätswerte oder den Zugang zur
            Plattform. Von der KI übersetzte oder vorgeschlagene Texte werden automatisch erzeugt
            und können Fehler enthalten; im Zweifel gilt der Originaltext.
          </p>
        </>
      ),
    },
    {
      id: "transferencias",
      title: "Internationale Übermittlungen",
      content: (
        <p>
          Einige Anbieter verarbeiten Daten außerhalb des Europäischen Wirtschaftsraums,
          insbesondere in den Vereinigten Staaten (zum Beispiel Anthropic, Stripe, Resend und
          Google). In diesen Fällen stützt sich die Übermittlung auf einen
          Angemessenheitsbeschluss der Europäischen Kommission (etwa das EU-US Data Privacy
          Framework, für zertifizierte Anbieter) oder auf Standardvertragsklauseln.
        </p>
      ),
    },
    {
      id: "conservacao",
      title: "Wie lange wir Daten speichern",
      content: (
        <ul>
          <li>Kontodaten: solange das Konto aktiv ist.</li>
          <li>
            Bestellungen, Buchungen und Rechnungsdaten: 10 Jahre, wie vom Steuer- und
            Buchhaltungsrecht verlangt.
          </li>
          <li>
            Chatnachrichten, Anhänge, Meldungen und Beschwerden: solange sie für die Bestellung
            und für etwaige Reklamationen oder Streitigkeiten nötig sind, oder bis Sie deren
            Löschung verlangen.
          </li>
          <li>Anträge auf Datenänderung und Zertifikate: solange der Landwirt ein Konto hat.</li>
          <li>
            Automatische Übersetzungen und Protokolle der KI-Nutzung: derzeit ohne feste Frist;
            sie werden auf Ihren Wunsch gelöscht. Bei Anthropic: bis zu 30 Tage.
          </li>
          <li>Aktivitätswert: berechnet aus den Daten der letzten 30 Tage.</li>
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
            Verarbeitung, Datenübertragbarkeit und Widerspruch (auch gegen Verarbeitungen auf
            Grundlage berechtigter Interessen, wie die automatische Übersetzung) sowie das Recht,
            Ihre Einwilligung jederzeit zu widerrufen. Sie können diese Rechte per E-Mail an{" "}
            <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> ausüben; wir antworten innerhalb
            eines Monats. Einen Teil der Daten können Sie direkt in Ihrem{" "}
            <Link to="/perfil">Profil</Link> korrigieren. Die Schließung des Kontos und die
            Löschung der Daten erfolgen auf Anfrage per E-Mail; wir bewahren nur auf, was wir
            gesetzlich aufbewahren müssen.
          </p>
          <p>
            Sie können sich auch bei der portugiesischen Datenschutzbehörde (CNPD) beschweren, Av.
            D. Carlos I, 134, 1.º, 1200-651 Lissabon,{" "}
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
      title: "Sicherheit",
      content: (
        <p>
          Wir verwenden verschlüsselte Verbindungen (HTTPS), verschlüsselte Passwörter und
          Zugriffsregeln in der Datenbank, die sicherstellen, dass jeder Nutzer nur die Daten
          sieht, auf die er Anspruch hat. Zertifikate, Dokumente und Anhänge liegen in privatem
          Speicher. Kein System ist unfehlbar; stellen wir eine Datenschutzverletzung fest, die
          Sie betrifft, informieren wir Sie nach Maßgabe des Gesetzes.
        </p>
      ),
    },
    {
      id: "menores",
      title: "Minderjährige",
      content: (
        <p>
          Die Plattform richtet sich an Personen ab 18 Jahren. Wir erheben nicht wissentlich Daten
          von Minderjährigen.
        </p>
      ),
    },
    {
      id: "cookies",
      title: "Cookies und lokale Speicherung",
      content: <CookieSection />,
    },
    {
      id: "alteracoes",
      title: "Änderungen dieser Erklärung",
      content: (
        <p>
          Wir können diese Erklärung aktualisieren. Wesentliche Änderungen werden auf der
          Plattform mitgeteilt, und wenn sich die Zwecke der Cookies ändern, bitten wir Sie erneut
          um Ihre Einwilligung. Siehe auch die{" "}
          <Link to="/termos">Allgemeinen Geschäftsbedingungen</Link>.
        </p>
      ),
    },
  ],
};

export default privacyDe;
