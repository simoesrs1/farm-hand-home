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
          numéro fiscal {LEGAL.nipc}, dont le siège est situé {LEGAL.address}. Pour toute
          question relative à la confidentialité, contactez-nous à{" "}
          <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
        </p>
      ),
    },
    {
      id: "dados",
      title: "Quelles données nous collectons",
      content: (
        <ul>
          <li>
            <strong>Compte :</strong> nom, email, mot de passe (stocké chiffré par notre
            fournisseur d'authentification), type de profil, langue préférée et, si vous en
            ajoutez une, photo de profil. La photo est conservée à une adresse publique afin de
            pouvoir apparaître dans les avis que vous autorisez. Si vous vous connectez avec
            Google, nous recevons le nom et l'email de votre compte Google.
          </li>
          <li>
            <strong>Agriculteurs :</strong> dénomination, numéro fiscal (NIF), code CAE, numéro
            d'exploitation, adresse, lieu et coordonnées de retrait, téléphone, site web,
            horaires, description, certificats, périodes de pause et leur message, statut de
            vérification et, pour l'hébergement, le numéro d'enregistrement (Hébergement local ou
            Tourisme rural). Pour les demandes de modification de données, nous conservons la
            justification, les pièces justificatives et la décision de l'équipe. L'historique du
            stock enregistre l'auteur de chaque modification.
          </li>
          <li>
            <strong>Paiements des Agriculteurs :</strong> l'identifiant du compte Stripe et
            l'indication que le compte est prêt à recevoir des paiements. Les données d'identité
            et l'IBAN sont remis directement à Stripe et ne sont pas conservés sur la plateforme.
          </li>
          <li>
            <strong>Commandes et réservations :</strong> produits, montants, commission, horaire
            de retrait, code de retrait et, pour la livraison à domicile, l'adresse et le point de
            livraison marqué sur la carte. Pour les réservations d'expériences et d'hébergement :
            dates, nombre de personnes ou de voyageurs, chambres, cadeaux choisis, annulations,
            frais et remboursements. Pour les abonnements : la formule, le prix, la fréquence, l'adresse et le point de
            livraison, les dates de prélèvement, la résiliation et, le cas échéant, l'indemnisation reçue.
          </li>
          <li>
            <strong>Communications et activité :</strong> messages du chat des commandes et
            fichiers joints, signalements et leurs preuves, réclamations pour livraison non
            reçue, avis, demandes de suppression d'avis, notifications et favoris.
          </li>
          <li>
            <strong>Utilisation de l'IA :</strong> l'enregistrement de chaque utilisation de
            « Écrire avec l'IA » (pour la limite quotidienne) et les traductions automatiques
            conservées. Voir la section sur l'Intelligence Artificielle.
          </li>
          <li>
            <strong>Données techniques :</strong> adresse IP et journaux d'accès nécessaires à la
            sécurité du service, ainsi que les données stockées dans le navigateur décrites dans
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
            <strong>Exécuter le contrat</strong> (art. 6, par. 1, point b) du RGPD) : créer et
            gérer le compte, traiter les commandes, réservations, annulations et paiements,
            permettre le retrait et la livraison, le chat entre Client et Agriculteur, les
            notifications et les emails de service, ainsi que les propositions de description par
            IA demandées par l'Agriculteur.
          </li>
          <li>
            <strong>Respecter les obligations légales</strong> (point c)) : facturation,
            comptabilité et réponse aux demandes des autorités.
          </li>
          <li>
            <strong>Intérêts légitimes</strong> (point f)) : vérifier les Agriculteurs, prévenir
            la fraude et les abus, traiter les signalements, réclamations et demandes, assurer la
            sécurité de la plateforme, traduire automatiquement les contenus dans la langue du
            lecteur et améliorer le service. Cela inclut le calcul du score d'activité des
            Agriculteurs (mise à jour du catalogue, rapidité de réponse aux commandes et dans le
            chat), utilisé pour trier le catalogue, choisir les mises en avant et envoyer des
            rappels. Ce score n'entraîne jamais la suspension ou le masquage du profil ; les
            critères sont décrits dans les <Link to="/termos#ordenacao">Conditions</Link>.
          </li>
          <li>
            <strong>Consentement</strong> (point a)) : cookies de préférences et cartes Google.
            Vous pouvez le retirer à tout moment, sans affecter le traitement déjà effectué.
          </li>
        </ul>
      ),
    },
    {
      id: "automaticos",
      title: "Processus automatiques",
      content: (
        <>
          <p>
            Certaines étapes se déroulent automatiquement, selon des règles fixes et publiques,
            sans intervention de l'intelligence artificielle :
          </p>
          <ul>
            <li>
              les commandes non retirées avant la date limite expirent, avec un remboursement de
              10 % (voir les <Link to="/termos#nao-levantadas">Conditions</Link>) ;
            </li>
            <li>
              le score d'activité est calculé chaque jour avec les données des 30 derniers jours ;
            </li>
            <li>
              lorsqu'un Agriculteur demande la modification de données officielles, le profil et
              les produits sont masqués jusqu'à l'examen de la demande par l'équipe (7 jours au
              maximum) ;
            </li>
            <li>les lots de stock périmés sont automatiquement retirés de la vente.</li>
          </ul>
          <p>
            Les décisions relatives aux signalements, réclamations, demandes de suppression
            d'avis et demandes de modification de données sont toujours prises par un membre de
            l'équipe. Vous pouvez demander des explications ou contester chacune de ces étapes en
            écrivant à <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
          </p>
        </>
      ),
    },
    {
      id: "partilha",
      title: "Avec qui nous partageons",
      content: (
        <>
          <ul>
            <li>
              <strong>Agriculteurs :</strong> lorsque vous commandez ou réservez, l'Agriculteur
              reçoit votre nom, les détails de la commande ou de la réservation et, si vous avez
              demandé une livraison, l'adresse et le point de livraison.
            </li>
            <li>
              <strong>Clients :</strong> le profil public de l'Agriculteur (exploitation,
              localisation, horaires, avis) est visible par tous. Vos avis affichent votre prénom
              et l'initiale de votre nom et, seulement si vous l'autorisez, votre photo de profil.
              Vous pouvez retirer cette autorisation à tout moment dans Mes commandes.
            </li>
            <li>
              <strong>Prestataires de services</strong> qui traitent des données pour notre
              compte, dans le cadre d'un contrat de sous-traitance : hébergement, base de données,
              fichiers et authentification (Supabase), hébergement de l'application (Cloudflare),
              connexion Google et Google Maps (Google), envoi d'emails (Resend), calcul
              d'itinéraires routiers (openrouteservice, de HeiGIT gGmbH, Allemagne) et
              intelligence artificielle (Anthropic, voir la section suivante).
            </li>
            <li>
              <strong>Stripe :</strong> lorsque l'Agriculteur configure les paiements, nous
              envoyons à Stripe le nom de l'entreprise, l'email et le pays. Stripe collecte
              directement l'identité et les coordonnées bancaires et les traite aussi en tant que
              responsable indépendant, afin de respecter ses obligations de prévention de la
              fraude et de lutte contre le blanchiment, conformément à sa{" "}
              <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">
                politique de confidentialité
              </a>
              .
            </li>
            <li>
              <strong>Polices :</strong> le site charge des polices depuis Google (Google Fonts),
              ce qui transmet votre adresse IP à Google.
            </li>
            <li>
              <strong>Calcul d'itinéraires :</strong> lorsque l'Agriculteur organise la tournée
              des livraisons à domicile, les points de livraison (coordonnées, sans nom ni
              adresse) sont envoyés à openrouteservice pour calculer l'itinéraire routier le plus
              rapide.
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
      id: "ia",
      title: "Utilisation de l'Intelligence Artificielle",
      content: (
        <>
          <p>
            Nous utilisons des modèles d'intelligence artificielle (IA) du fournisseur{" "}
            <strong>Anthropic</strong> (modèles Claude) dans deux fonctionnalités :
          </p>
          <ul>
            <li>
              <strong>« Écrire avec l'IA » (Agriculteurs) :</strong> lorsque l'Agriculteur appuie
              sur le bouton d'un produit, d'une expérience ou d'un hébergement, nous envoyons le
              texte qu'il a écrit, les données de ce formulaire, le nom de la ferme et jusqu'à 3
              photos, uniquement pour proposer une description. Rien n'est envoyé si
              l'Agriculteur n'appuie pas sur le bouton, et la proposition ne remplace le texte que
              si l'Agriculteur l'accepte ; le texte publié relève de sa responsabilité. Nous
              recommandons de ne pas utiliser de photos montrant des personnes. Nous enregistrons
              chaque utilisation pour appliquer la limite quotidienne. Base juridique : exécution
              du contrat.
            </li>
            <li>
              <strong>Traduction automatique :</strong> lorsque quelqu'un consulte la plateforme
              dans une autre langue, les textes écrits par les utilisateurs (descriptions et
              notes des produits, fermes, expériences et hébergements, avis, notifications, noms
              des articles des commandes et messages du chat) sont envoyés à Anthropic pour être
              traduits. Seul le texte est envoyé, sans le nom, les coordonnées ni l'adresse de son
              auteur. Les messages du chat ne sont traduits que pour les deux parties à la
              commande, et le texte original reste toujours disponible (« Voir l'original »). Les
              traductions sont conservées dans notre base de données pour ne pas devoir être
              redemandées. Base juridique : intérêt légitime à rendre la plateforme
              compréhensible en plusieurs langues ; vous pouvez vous y opposer en nous écrivant.
            </li>
          </ul>
          <p>Concernant le traitement par Anthropic :</p>
          <ul>
            <li>
              Anthropic agit en tant que notre sous-traitant, dans le cadre d'un accord de
              traitement des données, et{" "}
              <strong>n'utilise pas ces données pour entraîner ses modèles</strong> ;
            </li>
            <li>
              les requêtes et les réponses sont supprimées par Anthropic dans un délai de 30
              jours, sauf contenu signalé pour violation de sa politique d'utilisation ou lorsque
              la loi impose sa conservation ;
            </li>
            <li>
              les données peuvent être traitées aux États-Unis et dans d'autres pays hors de
              l'Espace économique européen, sur la base de clauses contractuelles types approuvées
              par la Commission européenne.
            </li>
          </ul>
          <p>
            L'IA <strong>ne prend aucune décision</strong> vous concernant : elle ne décide ni des
            commandes, ni des paiements, ni des avis, ni des scores, ni de l'accès à la
            plateforme. Les textes traduits ou proposés par l'IA sont générés automatiquement et
            peuvent contenir des erreurs ; en cas de doute, le texte original prévaut.
          </p>
        </>
      ),
    },
    {
      id: "transferencias",
      title: "Transferts internationaux",
      content: (
        <p>
          Certains prestataires traitent des données hors de l'Espace économique européen,
          notamment aux États-Unis (par exemple Anthropic, Stripe, Resend et Google). Dans ces
          cas, le transfert repose sur une décision d'adéquation de la Commission européenne
          (comme l'EU-US Data Privacy Framework, pour les prestataires certifiés) ou sur des
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
          <li>
            Commandes, réservations et données de facturation : 10 ans, comme l'exige la
            législation fiscale et comptable.
          </li>
          <li>
            Messages du chat, pièces jointes, signalements et réclamations : aussi longtemps
            qu'ils sont nécessaires à la commande et à d'éventuelles réclamations ou litiges, ou
            jusqu'à ce que vous en demandiez la suppression.
          </li>
          <li>
            Demandes de modification de données et certificats : tant que l'Agriculteur a un
            compte.
          </li>
          <li>
            Traductions automatiques et enregistrements d'utilisation de l'IA : sans durée fixe
            pour l'instant ; ils sont supprimés à votre demande. Chez Anthropic : jusqu'à 30
            jours.
          </li>
          <li>Score d'activité : calculé à partir des données des 30 derniers jours.</li>
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
            traitement, de portabilité et d'opposition (y compris au traitement fondé sur
            l'intérêt légitime, comme la traduction automatique), ainsi que du droit de retirer
            votre consentement à tout moment. Vous pouvez les exercer en écrivant à{" "}
            <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> ; nous répondons dans un délai
            d'un mois. Une partie des données peut être corrigée directement dans votre{" "}
            <Link to="/perfil">profil</Link>. Vous pouvez supprimer votre compte à tout moment dans Paramètres : nous effaçons vos données
            personnelles et ne conservons que ce que la loi impose (commandes et facturation, pendant 10
            ans), sans lien avec votre nom.
          </p>
          <p>
            Vous pouvez aussi introduire une réclamation auprès de l'autorité portugaise de
            protection des données (CNPD), Av. D. Carlos I, 134, 1.º, 1200-651 Lisbonne,{" "}
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
      title: "Sécurité",
      content: (
        <p>
          Nous utilisons des connexions chiffrées (HTTPS), des mots de passe chiffrés et des
          règles d'accès dans la base de données qui garantissent que chaque utilisateur ne voit
          que les données auxquelles il a droit. Les certificats, documents et pièces jointes sont
          conservés dans un stockage privé. Aucun système n'est infaillible ; si nous détectons
          une violation de données vous concernant, nous vous en informerons conformément à la
          loi.
        </p>
      ),
    },
    {
      id: "menores",
      title: "Mineurs",
      content: (
        <p>
          La plateforme est destinée aux personnes de 18 ans ou plus. Nous ne collectons pas
          sciemment de données concernant des mineurs.
        </p>
      ),
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
          Nous pouvons mettre à jour cette politique. Les modifications importantes sont
          annoncées sur la plateforme et, si les finalités des cookies changent, nous vous
          redemanderons votre consentement. Consultez aussi les{" "}
          <Link to="/termos">Conditions générales</Link>.
        </p>
      ),
    },
  ],
};

export default privacyFr;
