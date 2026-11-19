import { Link } from "react-router-dom";
import type { LegalDoc } from "@/components/LegalLayout";
import { LEGAL } from "@/lib/legal";

/** Allgemeine Geschäftsbedingungen — unverbindliche Übersetzung (es gilt die portugiesische Fassung). */
const termsDe: LegalDoc = {
  title: "Allgemeine Geschäftsbedingungen",
  intro: (
    <p>
      Dies sind die Nutzungsregeln von {LEGAL.brand} für Kunden und Landwirte. Bitte lesen Sie sie
      aufmerksam, insbesondere die Abschnitte über nicht abgeholte Bestellungen und über das
      Widerrufsrecht.
    </p>
  ),
  sections: [
    {
      id: "identificacao",
      title: "Identifikation und Gegenstand",
      content: (
        <>
          <p>
            Die Plattform {LEGAL.brand} wird betrieben von <strong>{LEGAL.companyName}</strong>,
            juristische Person Nr. {LEGAL.nipc}, mit Sitz in {LEGAL.address} (nachfolgend
            „{LEGAL.brand}“ oder „wir“), erreichbar unter{" "}
            <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
          </p>
          <p>
            {LEGAL.brand} ist ein regionaler digitaler Marktplatz, der Verbraucher („Kunden“) mit
            lokalen Landwirten und Erzeugern („Landwirte“) verbindet. {LEGAL.brand} handelt als{" "}
            <strong>Vermittler</strong>: Es stellt das Schaufenster, die Abwicklung von Bestellungen
            und Zahlungen sowie Kommunikationswerkzeuge bereit, ist aber nicht Verkäufer der
            Produkte. Der Kaufvertrag wird direkt zwischen Kunde und Landwirt geschlossen.
          </p>
          <p>
            Diese Allgemeinen Geschäftsbedingungen regeln den Zugang zur Plattform und ihre Nutzung.
            Die Verarbeitung personenbezogener Daten regelt die{" "}
            <Link to="/privacidade">Datenschutzerklärung</Link>.
          </p>
        </>
      ),
    },
    {
      id: "aceitacao",
      title: "Annahme und Geschäftsfähigkeit",
      content: (
        <>
          <p>
            Mit der Erstellung eines Kontos oder einer Bestellung erklären Sie, diese Bedingungen
            gelesen zu haben und zu akzeptieren. Wenn Sie nicht einverstanden sind, dürfen Sie die
            Plattform nicht nutzen.
          </p>
          <p>
            Für ein Konto müssen Sie mindestens 18 Jahre alt und geschäftsfähig sein. Landwirte
            erklären, im Rahmen ihrer beruflichen Tätigkeit zu handeln.
          </p>
        </>
      ),
    },
    {
      id: "contas",
      title: "Benutzerkonten",
      content: (
        <>
          <p>
            Dasselbe Konto kann ein Kunden- und ein Landwirt-Profil haben, die E-Mail und Passwort
            gemeinsam nutzen. Sie können sich mit E-Mail und Passwort oder mit einem Google-Konto
            registrieren.
          </p>
          <ul>
            <li>Die Angaben müssen wahr, vollständig und aktuell sein.</li>
            <li>
              Sie sind für die Vertraulichkeit Ihrer Zugangsdaten und für alle Aktivitäten in Ihrem
              Konto verantwortlich. Informieren Sie uns sofort bei Verdacht auf Missbrauch.
            </li>
            <li>Das Konto ist persönlich und nicht übertragbar.</li>
          </ul>
        </>
      ),
    },
    {
      id: "agricultores",
      title: "Landwirte",
      content: (
        <>
          <p>
            Um zu verkaufen, muss der Landwirt die Registrierung des Betriebs abschließen (u. a.
            Firmenname, Steuernummer, CAE-Code, Betriebsnummer und gegebenenfalls Zertifikate).{" "}
            {LEGAL.brand} kann diese Angaben prüfen und Profile ablehnen, sperren oder entfernen,
            die sie nicht erfüllen.
          </p>
          <p>Der Landwirt verpflichtet sich,</p>
          <ul>
            <li>
              nur Produkte zu verkaufen, die er rechtmäßig vermarkten darf, und die geltenden Regeln
              zu Lebensmittelsicherheit, Hygiene, Kennzeichnung und Rückverfolgbarkeit einzuhalten;
            </li>
            <li>
              die Produkte genau zu beschreiben (Herkunft, Produktionsweise, Menge, Einheit und
              Preis inkl. MwSt.) und den Bestand aktuell zu halten;
            </li>
            <li>
              angenommene Bestellungen zu erfüllen, die veröffentlichten Abhol- und Lieferzeiten
              einzuhalten und die gesetzlich vorgeschriebenen Steuerbelege auszustellen;
            </li>
            <li>die gesetzlichen Gewährleistungen für die verkauften Produkte zu übernehmen.</li>
          </ul>
          <p>
            Für die Vermittlung behält {LEGAL.brand} eine Provision von{" "}
            <strong>{LEGAL.commissionPercent} % des Werts jeder Bestellung</strong> ein; der Rest wird
            nach Abschluss der Bestellung an den Landwirt ausgezahlt.
          </p>
        </>
      ),
    },
    {
      id: "ordenacao",
      title: "Reihenfolge und Hervorhebung",
      content: (
        <>
          <p>
            Bei der Standardsortierung („Relevanz“) von Katalog und Suche sowie bei der Auswahl der
            auf der Startseite hervorgehobenen Landwirte verwenden wir zwei Hauptparameter, die
            addiert werden:
          </p>
          <ul>
            <li>
              <strong>Aktivitätspunktzahl (0 bis 100)</strong>, täglich über die letzten 30 Tage
              berechnet: Aktualisierung von Katalog und Bestand (40 %), schnelle Annahme von
              Bestellungen und keine Stornierungen wegen fehlenden Bestands (40 %) sowie Antworten
              an Kunden im Chat innerhalb von 24 Stunden (20 %). Eine Komponente ohne Daten (z. B.
              ohne Bestellungen im Zeitraum) wird nicht bestraft: Ihr Gewicht wird auf die übrigen
              verteilt.
            </li>
            <li>
              Bei der Registrierung geprüfte <strong>Zertifikate</strong> des Betriebs (10 Punkte pro
              Zertifikat, bis zu 50).
            </li>
          </ul>
          <p>
            Die Startseite hebt die 6 verifizierten Landwirte mit der höchsten Summe hervor, die an
            diesem Tag Produkte verfügbar und eine Aktivitätspunktzahl von mindestens 40 haben. Eine
            bessere Position lässt sich nicht kaufen. Der Kunde kann jederzeit eine andere
            Sortierung wählen (Preis, Entfernung, Produktionsweise u. a.).
          </p>
          <p>
            Der Landwirt kann eine <strong>Pause</strong> (Urlaub, Nebensaison) von bis zu 6
            Monaten aktivieren: Während der Pause sind die Produkte ausgeblendet, es gehen keine
            Bestellungen ein und die Punktzahl ist eingefroren. Dasselbe geschieht automatisch, wenn
            kein Produkt Saison hat. Der Landwirt sieht seine Punktzahl und Verbesserungsvorschläge
            auf der Verkaufsseite und kann Erinnerungen auf der Plattform erhalten; die Aktivität
            führt nie dazu, dass das Profil ausgeblendet wird.
          </p>
        </>
      ),
    },
    {
      id: "encomendas",
      title: "Bestellungen, Preise und Zahlung",
      content: (
        <>
          <p>
            Die Preise werden in Euro angegeben und enthalten die gesetzliche Mehrwertsteuer. Vor der
            Bestätigung sieht der Kunde die Zusammenfassung der Bestellung, den Gesamtbetrag und die
            gewählte Abhol- oder Lieferzeit.
          </p>
          <p>
            Die Zahlung erfolgt bei der Bestellung und wird von {LEGAL.brand} einbehalten, bis der
            Kunde die Produkte abholt oder erhält. Nach der Zahlung bestätigt der Landwirt die
            Bestellung. Hat der Landwirt nicht genügend Bestand, kann er sie stornieren; der Kunde
            erhält dann eine <strong>vollständige Erstattung</strong>.
          </p>
        </>
      ),
    },
    {
      id: "levantamento",
      title: "Abholung und Lieferung",
      content: (
        <>
          <p>
            Jede Bestellung hat einen Abholcode (auch als QR-Code), den der Kunde dem Landwirt
            zeigt. Die Abholung erfolgt am vom Landwirt angegebenen Ort, innerhalb der Öffnungszeiten
            und bis zu der in der Bestellung angegebenen Frist.
          </p>
          <p>
            Bietet der Landwirt Lieferung nach Hause an, gibt der Kunde die Adresse an und markiert
            den genauen Lieferpunkt. Er muss sicherstellen, dass jemand die Bestellung zur
            vereinbarten Zeit annehmen kann.
          </p>
        </>
      ),
    },
    {
      id: "nao-levantadas",
      title: "Nicht abgeholte Bestellungen",
      content: (
        <>
          <p>
            Die Produkte sind größtenteils verderblich und werden für den Kunden reserviert. Wird die
            Bestellung nicht bis zur Frist abgeholt, läuft sie automatisch ab: Der Landwirt muss sie
            nicht länger aufbewahren und <strong>es werden nur 10 % des bezahlten Betrags
            erstattet</strong>. Der Kunde wird darüber auf der Plattform benachrichtigt.
          </p>
          <p>
            Wenn Sie den Termin nicht einhalten können, kontaktieren Sie den Landwirt so früh wie
            möglich über den Bestell-Chat.
          </p>
        </>
      ),
    },
    {
      id: "livre-resolucao",
      title: "Widerrufsrecht",
      content: (
        <>
          <p>
            Nach dem Gesetzesdekret Nr. 24/2014 kann der Verbraucher einen Fernabsatzkauf in der
            Regel innerhalb von 14 Tagen widerrufen. Dieses Recht <strong>gilt nicht</strong> für
            Waren, die schnell verderben können oder deren Verfallsdatum schnell überschritten würde
            (Art. 17 Abs. 1 Buchst. d), wie frisches Obst, Gemüse, Eier, Milchprodukte oder Fleisch.
          </p>
          <p>
            Bei nicht verderblichen Produkten kann der Kunde das Widerrufsrecht ausüben, indem er{" "}
            {LEGAL.brand} unter <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> kontaktiert; die
            Produkte sind in gutem Zustand zurückzusenden. Die Erstattung erfolgt über dasselbe
            Zahlungsmittel innerhalb von 14 Tagen nach Erhalt der Rücksendung.
          </p>
        </>
      ),
    },
    {
      id: "conformidade",
      title: "Vertragsmäßigkeit der Produkte und Reklamationen",
      content: (
        <p>
          Der Landwirt haftet als Verkäufer für die Vertragswidrigkeit der Produkte gemäß
          Gesetzesdekret Nr. 84/2021. Entspricht ein Produkt nicht der Beschreibung oder ist es in
          schlechtem Zustand, melden Sie das Problem auf der Bestellseite oder im Chat;{" "}
          {LEGAL.brand} begleitet die Lösung zwischen den Parteien.
        </p>
      ),
    },
    {
      id: "experiencias",
      title: "Erlebnisse auf dem Hof",
      content: (
        <>
          <p>
            Landwirte können Erlebnisse auf ihrem Betrieb anbieten, die über die Plattform gebucht
            und bezahlt werden. Die Buchung wird mit der Zahlung bestätigt und bei der Ankunft mit
            dem QR-Code geprüft.
          </p>
          <p>
            Die Stornierung durch den Kunden ist bis 5 Tage vor dem Termin kostenlos. Danach werden
            25 % des Erlebnispreises einbehalten (20 % für den Landwirt und 5 % für {LEGAL.brand});
            bezahlte zusätzliche Geschenke werden erstattet. Bei Nichterscheinen wird der gezahlte
            Betrag nicht erstattet. Storniert der Landwirt, erhält der Kunde den vollen Betrag
            zurück.
          </p>
        </>
      ),
    },
    {
      id: "alojamento",
      title: "Unterkunft auf dem Hof",
      content: (
        <>
          <p>
            Landwirte können Unterkünfte auf ihrem Betrieb anbieten, sofern diese als Ferienunterkunft
            (Alojamento Local) oder Landtourismus (Turismo no Espaço Rural) registriert sind; die
            Registrierungsnummer gibt der Landwirt an und sie wird dem Kunden angezeigt. Die Buchung
            wird mit der Zahlung bestätigt und beim Check-in mit dem QR-Code geprüft.
          </p>
          <p>
            Es gelten dieselben Stornierungsregeln wie bei Erlebnissen, gerechnet ab dem Anreisetag:
            kostenlos bis 5 Tage vorher; danach werden 25 % des Unterkunftspreises einbehalten (20 %
            für den Landwirt und 5 % für {LEGAL.brand}), zusätzliche Geschenke werden erstattet. Bei
            Nichterscheinen bis zum Abreisetag wird der Betrag nicht erstattet. Kurtaxe, Gästemeldung
            an die Behörden und Rechnungsstellung liegen in der Verantwortung des Landwirts.
          </p>
        </>
      ),
    },
    {
      id: "avaliacoes",
      title: "Bewertungen und Nutzerinhalte",
      content: (
        <>
          <p>
            Einen Landwirt kann nur bewerten, wer über die Plattform bei ihm gekauft hat
            (Kaufnachweis), mit einer Bewertung pro Bestellung, nachdem er sie erhalten hat, wenn der
            Landwirt sie storniert oder wenn die Lieferung nach Hause 24 Stunden nach dem
            vorgesehenen Termin noch aussteht. Bewertungen müssen ehrlich und respektvoll sein.
            Falsche, beleidigende, diskriminierende oder rechtswidrige Inhalte, Werbung und
            personenbezogene Daten Dritter sind in Bewertungen und im Bestell-Chat verboten.
          </p>
          <p>
            Eine veröffentlichte Bewertung kann nicht geändert werden. Ihre Löschung kann mit
            Begründung beantragt werden und wird vom {LEGAL.brand}-Team geprüft. Wer einen Missbrauch
            durch einen Landwirt meldet, muss konkrete Nachweise vorlegen; ohne Nachweise kann der
            Landwirt wegen Verleumdung rechtlich vorgehen.
          </p>
          <p>
            Wir können Inhalte entfernen, die gegen diese Regeln verstoßen. Mit der Veröffentlichung
            von Inhalten (Texte, Fotos) räumen Sie {LEGAL.brand} eine nicht ausschließliche,
            unentgeltliche Lizenz ein, sie auf der Plattform anzuzeigen, solange sie veröffentlicht
            sind.
          </p>
        </>
      ),
    },
    {
      id: "utilizacao",
      title: "Zulässige Nutzung",
      content: (
        <ul>
          <li>Die Plattform nicht für rechtswidrige oder betrügerische Zwecke nutzen.</li>
          <li>
            Nicht versuchen, auf Konten oder Daten Dritter zuzugreifen oder die Sicherheit bzw. den
            Betrieb des Dienstes zu stören.
          </li>
          <li>Keine Daten der Plattform ohne Genehmigung automatisiert erfassen.</li>
          <li>Die Plattform nicht umgehen, um die Provision bei dort begonnenen Bestellungen zu vermeiden.</li>
        </ul>
      ),
    },
    {
      id: "propriedade",
      title: "Geistiges Eigentum",
      content: (
        <p>
          Die Marke {LEGAL.brand}, das Design, die Software und die Inhalte der Plattform gehören{" "}
          {LEGAL.brand} oder seinen Lizenzgebern. Die von Landwirten veröffentlichten Inhalte
          (Fotos, Beschreibungen) liegen in deren Verantwortung und Eigentum.
        </p>
      ),
    },
    {
      id: "responsabilidade",
      title: "Haftung",
      content: (
        <>
          <p>
            Als Vermittler haftet {LEGAL.brand} nicht für Qualität, Sicherheit oder
            Vertragsmäßigkeit der Produkte, die dem Landwirt obliegen, noch für falsche Angaben der
            Nutzer. Wir bemühen uns, die Plattform verfügbar und sicher zu halten, garantieren aber
            keinen unterbrechungsfreien Betrieb.
          </p>
          <p>
            Nichts in diesen Bedingungen schränkt die gesetzlichen Rechte der Verbraucher oder die
            Haftung von {LEGAL.brand} für Vorsatz oder grobe Fahrlässigkeit ein.
          </p>
        </>
      ),
    },
    {
      id: "suspensao",
      title: "Sperrung und Schließung des Kontos",
      content: (
        <p>
          Sie können Ihr Konto jederzeit schließen, indem Sie uns kontaktieren. Wir können Konten,
          die gegen diese Bedingungen oder das Gesetz verstoßen, sperren oder schließen, wenn
          möglich nach vorheriger Mitteilung. Laufende Bestellungen werden je nach Status
          abgeschlossen oder erstattet.
        </p>
      ),
    },
    {
      id: "alteracoes",
      title: "Änderungen der Bedingungen",
      content: (
        <p>
          Wir können diese Bedingungen aktualisieren, um rechtliche oder dienstbezogene Änderungen
          abzubilden. Wesentliche Änderungen werden auf der Plattform mit angemessener Frist
          angekündigt und gelten nicht für bereits getätigte Bestellungen.
        </p>
      ),
    },
    {
      id: "litigios",
      title: "Anwendbares Recht und Streitbeilegung",
      content: (
        <>
          <p>Diese Bedingungen unterliegen portugiesischem Recht.</p>
          <p>
            Bei Verbraucherstreitigkeiten kann sich der Kunde an eine Stelle zur alternativen
            Streitbeilegung wenden (Gesetz Nr. 144/2015), insbesondere an das{" "}
            <a href="https://www.cniacc.pt" target="_blank" rel="noopener noreferrer">
              CNIACC – Nationales Informations- und Schiedszentrum für Verbraucherstreitigkeiten
            </a>
            . Weitere Informationen im{" "}
            <a href="https://www.consumidor.gov.pt" target="_blank" rel="noopener noreferrer">
              Verbraucherportal
            </a>
            .
          </p>
          <p>
            Wir verfügen über ein{" "}
            <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener noreferrer">
              elektronisches Beschwerdebuch
            </a>
            .
          </p>
        </>
      ),
    },
    {
      id: "contactos",
      title: "Kontakt",
      content: (
        <p>
          Für Fragen zu diesen Bedingungen: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> ·{" "}
          {LEGAL.phone}.
        </p>
      ),
    },
  ],
};

export default termsDe;
