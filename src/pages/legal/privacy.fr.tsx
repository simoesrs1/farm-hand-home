import { Link } from "react-router-dom";
import CookieSection from "@/components/CookieSection";
import type { LegalDoc } from "@/components/LegalLayout";
import { LEGAL } from "@/lib/legal";

/** Politique de confidentialité — traduction de courtoisie (la version portugaise prévaut). */
const privacyFr: LegalDoc = {
  title: "Politique de confidentialité",
  intro: (
    <p>
      Nous expliquons ici quelles données personnelles nous traitons, pourquoi, avec qui nous les
      partageons et comment vous pouvez exercer vos droits, conformément au Règlement général sur la
      protection des données (RGPD) et à la loi portugaise n° 58/2019.
    </p>
  ),
  sections: [
    {
      id: "responsavel",
      title: "Responsable du traitement",
      content: (
        <p>
          Le responsable du traitement de vos données est <strong>{LEGAL.companyName}</strong>,
          NIPC {LEGAL.nipc}, dont le siège est situé {LEGAL.address}. Pour toute question relative à
          la vie privée, contactez-nous à <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
        </p>
      ),
    },
    {
      id: "dados",
      title: "Quelles données nous collectons",
      content: (
        <ul>
          <li>
            <strong>Compte :</strong> nom, email, mot de passe (conservé chiffré par notre
            fournisseur d'authentification), photo de profil et type de profil. Si vous vous
            connectez avec Google, nous recevons le nom, l'email et la photo de votre compte Google.
          </li>
          <li>
            <strong>Agriculteurs :</strong> dénomination, NIF, code CAE, numéro d'exploitation,
            adresse, lieu et coordonnées de retrait, téléphone, site web, horaires, description et
            certificats.
          </li>
          <li>
            <strong>Commandes :</strong> produits, montants, horaire de retrait, code de retrait et,
            pour les livraisons à domicile, l'adresse et le point de livraison indiqué sur la carte.
          </li>
          <li>
            <strong>Communications et activité :</strong> messages du chat des commandes,
            notifications, problèmes signalés, avis et favoris.
          </li>
          <li>
            <strong>Données techniques :</strong> adresse IP et journaux d'accès nécessaires à la
            sécurité du service, ainsi que les données enregistrées dans le navigateur décrites dans
            la section sur les cookies.
          </li>
        </ul>
      ),
    },
    {
      id: "finalidades",
      title: "À quoi servent les données",
      content: (
        <ul>
          <li>
            <strong>Exécuter le contrat</strong> (art. 6, par. 1, point b) du RGPD) : créer et gérer
            le compte, traiter les commandes et les paiements, permettre le retrait et la livraison,
            le chat entre Client et Agriculteur et les notifications.
          </li>
          <li>
            <strong>Respecter des obligations légales</strong> (point c)) : facturation,
            comptabilité et réponse aux demandes des autorités.
          </li>
          <li>
            <strong>Intérêts légitimes</strong> (point f)) : vérifier les Agriculteurs, prévenir la
            fraude et les abus, garantir la sécurité de la plateforme et améliorer le service. Cela
            inclut le calcul du score d'activité des Agriculteurs (mise à jour du catalogue, rapidité
            de réponse aux commandes et dans le chat), utilisé pour trier le catalogue, choisir les
            agriculteurs mis en avant et envoyer des rappels. Ce score n'entraîne jamais la
            suspension ou le masquage du profil ; les critères sont décrits dans les{" "}
            <Link to="/termos#ordenacao">Conditions</Link>.
          </li>
          <li>
            <strong>Consentement</strong> (point a)) : cookies de préférences et cartes Google. Vous
            pouvez le retirer à tout moment, sans incidence sur le traitement déjà effectué.
          </li>
        </ul>
      ),
    },
    {
      id: "partilha",
      title: "Avec qui nous les partageons",
      content: (
        <>
          <ul>
            <li>
              <strong>Agriculteurs :</strong> lorsque vous commandez, l'Agriculteur reçoit votre nom,
              le détail de la commande et, si vous avez demandé une livraison, l'adresse et le point
              de livraison.
            </li>
            <li>
              <strong>Clients :</strong> le profil public de l'Agriculteur (exploitation,
              localisation, horaires, avis) est visible par tous. Vos avis affichent votre prénom et
              l'initiale de votre nom et, seulement si vous l'autorisez, votre photo de profil. Vous
              pouvez retirer cette autorisation à tout moment dans Mes commandes.
            </li>
            <li>
              <strong>Prestataires de services</strong> qui traitent des données pour notre compte,
              dans le cadre d'un contrat de sous-traitance : hébergement, base de données et
              authentification (Supabase), hébergement de l'application (Cloudflare),
              authentification Google et Google Maps (Google) et calcul d'itinéraires routiers
              (openrouteservice, de HeiGIT gGmbH, Allemagne).
            </li>
            <li>
              <strong>Descriptions par IA :</strong> lorsque l'Agriculteur utilise « Écrire avec
              l'IA » pour un produit, une expérience ou un hébergement, le texte qu'il a écrit, les
              données de ce formulaire et jusqu'à 3 photos sont envoyés à Anthropic (fournisseur du
              modèle Claude), uniquement pour proposer la description. Rien n'est envoyé sans que
              l'Agriculteur appuie sur le bouton, et la proposition ne remplace le texte que si
              l'Agriculteur l'accepte.
            </li>
            <li>
              <strong>Traduction automatique :</strong> lorsque quelqu'un consulte la Plateforme dans
              une autre langue, les textes rédigés par les utilisateurs (descriptions de produits,
              fermes, expériences et hébergements, avis, notifications et messages du chat d'une
              commande) sont envoyés à Anthropic pour être traduits. Seul le texte est envoyé, sans
              le nom, les coordonnées ni l'adresse de son auteur. Les traductions sont conservées
              dans notre base de données pour ne pas être redemandées, et les messages du chat ne
              sont traduits que pour les deux parties de la commande.
            </li>
            <li>
              <strong>Calcul d'itinéraire :</strong> lorsque l'Agriculteur organise l'itinéraire des
              livraisons à domicile, les points de livraison (coordonnées, sans nom ni adresse) sont
              envoyés à openrouteservice pour calculer l'itinéraire routier le plus rapide.
            </li>
            <li>
              <strong>Autorités</strong>, lorsque la loi l'exige.
            </li>
          </ul>
          <p>Nous ne vendons pas vos données et ne les utilisons pas à des fins publicitaires.</p>
        </>
      ),
    },
    {
      id: "transferencias",
      title: "Transferts internationaux",
      content: (
        <p>
          Certains prestataires peuvent traiter des données en dehors de l'Espace économique
          européen, notamment aux États-Unis. Dans ce cas, le transfert repose sur une décision
          d'adéquation de la Commission européenne (comme le EU-US Data Privacy Framework) ou sur des
          clauses contractuelles types.
        </p>
      ),
    },
    {
      id: "conservacao",
      title: "Durée de conservation",
      content: (
        <ul>
          <li>Données du compte : tant que le compte est actif.</li>
          <li>Commandes et données de facturation : 10 ans, comme l'exige la législation fiscale et comptable.</li>
          <li>Messages et signalements : tant qu'ils sont nécessaires pour la commande et pour d'éventuelles réclamations ou litiges.</li>
          <li>Données dans le navigateur : selon le tableau de la section sur les cookies.</li>
        </ul>
      ),
    },
    {
      id: "direitos",
      title: "Vos droits",
      content: (
        <>
          <p>
            Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation du
            traitement, de portabilité et d'opposition, ainsi que du droit de retirer votre
            consentement à tout moment. Vous pouvez les exercer en écrivant à{" "}
            <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> ; nous répondons dans un délai d'un
            mois. Une partie des données peut être corrigée directement dans votre{" "}
            <Link to="/perfil">profil</Link>.
          </p>
          <p>
            Vous pouvez aussi introduire une réclamation auprès de l'autorité portugaise de
            protection des données, la CNPD (
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
      title: "Sécurité",
      content: (
        <p>
          Nous utilisons des connexions chiffrées (HTTPS), des mots de passe chiffrés et des règles
          d'accès dans la base de données qui garantissent que chaque utilisateur ne voit que les
          données auxquelles il a droit. Aucun système n'est infaillible ; si nous détectons une
          violation de données vous concernant, nous vous en informerons conformément à la loi.
        </p>
      ),
    },
    {
      id: "menores",
      title: "Mineurs",
      content: <p>La plateforme est destinée aux personnes de plus de 18 ans. Nous ne collectons pas sciemment de données de mineurs.</p>,
    },
    {
      id: "cookies",
      title: "Cookies et stockage local",
      content: <CookieSection />,
    },
    {
      id: "alteracoes",
      title: "Modifications de cette politique",
      content: (
        <p>
          Nous pouvons mettre à jour cette politique. Les modifications importantes sont annoncées
          sur la plateforme et, si les finalités des cookies changent, nous vous redemanderons votre
          consentement. Consultez aussi les <Link to="/termos">Conditions générales</Link>.
        </p>
      ),
    },
  ],
};

export default privacyFr;
