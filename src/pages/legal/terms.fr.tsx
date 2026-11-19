import { Link } from "react-router-dom";
import type { LegalDoc } from "@/components/LegalLayout";
import { LEGAL } from "@/lib/legal";

/** Conditions générales — traduction de courtoisie (la version portugaise prévaut). */
const termsFr: LegalDoc = {
  title: "Conditions générales",
  intro: (
    <p>
      Voici les règles d'utilisation de {LEGAL.brand}, pour les Clients et les Agriculteurs. Nous
      vous invitons à les lire attentivement, en particulier les sections sur les commandes non
      retirées et sur le droit de rétractation.
    </p>
  ),
  sections: [
    {
      id: "identificacao",
      title: "Identification et objet",
      content: (
        <>
          <p>
            La plateforme {LEGAL.brand} est exploitée par <strong>{LEGAL.companyName}</strong>,
            personne morale n° {LEGAL.nipc}, dont le siège est situé {LEGAL.address} (ci-après
            « {LEGAL.brand} » ou « nous »), joignable à{" "}
            <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
          </p>
          <p>
            {LEGAL.brand} est une place de marché numérique de proximité qui relie des consommateurs
            (« Clients ») à des agriculteurs et producteurs locaux (« Agriculteurs »). {LEGAL.brand}{" "}
            agit en tant qu'<strong>intermédiaire</strong> : il fournit la vitrine, le traitement des
            commandes et du paiement et les outils de communication, mais n'est pas le vendeur des
            produits. Le contrat de vente est conclu directement entre le Client et l'Agriculteur.
          </p>
          <p>
            Les présentes Conditions générales régissent l'accès à la plateforme et son
            utilisation. Le traitement des données personnelles est régi par la{" "}
            <Link to="/privacidade">Politique de confidentialité</Link>.
          </p>
        </>
      ),
    },
    {
      id: "aceitacao",
      title: "Acceptation et capacité",
      content: (
        <>
          <p>
            En créant un compte ou en passant une commande, vous déclarez avoir lu et accepté les
            présentes Conditions. Si vous n'êtes pas d'accord, vous ne devez pas utiliser la
            plateforme.
          </p>
          <p>
            Pour créer un compte, il faut avoir au moins 18 ans et la capacité juridique de
            contracter. Les Agriculteurs déclarent agir dans le cadre de leur activité
            professionnelle.
          </p>
        </>
      ),
    },
    {
      id: "contas",
      title: "Comptes utilisateur",
      content: (
        <>
          <p>
            Un même compte peut avoir un profil Client et un profil Agriculteur, qui partagent
            l'email et le mot de passe. Vous pouvez vous inscrire avec un email et un mot de passe ou
            avec un compte Google.
          </p>
          <ul>
            <li>Les informations fournies doivent être exactes, complètes et tenues à jour.</li>
            <li>
              Vous êtes responsable de la confidentialité de vos identifiants et de toute l'activité
              de votre compte. Prévenez-nous immédiatement en cas de soupçon d'utilisation abusive.
            </li>
            <li>Le compte est personnel et non transférable.</li>
          </ul>
        </>
      ),
    },
    {
      id: "agricultores",
      title: "Agriculteurs",
      content: (
        <>
          <p>
            Pour vendre, l'Agriculteur doit compléter l'enregistrement de l'exploitation (y compris
            dénomination, NIF, code CAE, numéro d'exploitation et, le cas échéant, certificats).{" "}
            {LEGAL.brand} peut vérifier ces informations et refuser, suspendre ou supprimer les
            profils qui ne les respectent pas.
          </p>
          <p>L'Agriculteur s'engage à :</p>
          <ul>
            <li>
              ne vendre que des produits qu'il peut légalement commercialiser, dans le respect des
              règles applicables de sécurité alimentaire, d'hygiène, d'étiquetage et de traçabilité ;
            </li>
            <li>
              décrire les produits avec exactitude (origine, mode de production, quantité, unité et
              prix TVA comprise) et tenir le stock à jour ;
            </li>
            <li>
              honorer les commandes acceptées, respecter les horaires de retrait et de livraison
              publiés et émettre les documents fiscaux exigés par la loi ;
            </li>
            <li>assurer les garanties légales des produits qu'il vend.</li>
          </ul>
          <p>
            Pour l'intermédiation, {LEGAL.brand} retient une commission de{" "}
            <strong>{LEGAL.commissionPercent} % de la valeur de chaque commande</strong>, le reste
            étant versé à l'Agriculteur une fois la commande terminée.
          </p>
        </>
      ),
    },
    {
      id: "ordenacao",
      title: "Classement et mise en avant",
      content: (
        <>
          <p>
            Pour le tri par défaut (« Pertinence ») du catalogue et de la recherche, et pour le choix
            des agriculteurs mis en avant sur la page d'accueil, nous utilisons deux paramètres
            principaux, additionnés :
          </p>
          <ul>
            <li>
              <strong>Score d'activité (0 à 100)</strong>, calculé chaque jour sur les 30 derniers
              jours : mise à jour du catalogue et du stock (40 %), rapidité d'acceptation des
              commandes et commandes non annulées pour rupture de stock (40 %) et réponses aux
              clients dans le chat en moins de 24 heures (20 %). Une composante sans données (par
              exemple, sans commandes sur la période) n'est pas pénalisante : son poids est réparti
              sur les autres.
            </li>
            <li>
              <strong>Certificats</strong> de l'exploitation validés à l'inscription (10 points par
              certificat, jusqu'à 50).
            </li>
          </ul>
          <p>
            La page d'accueil met en avant les 6 agriculteurs vérifiés ayant le total le plus élevé,
            qui ont des produits disponibles ce jour-là et un score d'activité d'au moins 40. Il
            n'est pas possible de payer pour obtenir une meilleure position. Le Client peut toujours
            choisir un autre tri (prix, distance, mode de production, entre autres).
          </p>
          <p>
            L'Agriculteur peut activer une <strong>pause</strong> (vacances, intersaison) jusqu'à 6
            mois : pendant la pause, les produits sont masqués, aucune commande n'est reçue et le
            score est gelé. Il en va de même automatiquement lorsqu'aucun produit n'est de saison.
            L'Agriculteur voit son score et des suggestions pour l'améliorer sur la page des ventes
            et peut recevoir des rappels sur la plateforme ; l'activité n'entraîne jamais le masquage
            du profil.
          </p>
        </>
      ),
    },
    {
      id: "encomendas",
      title: "Commandes, prix et paiement",
      content: (
        <>
          <p>
            Les prix sont indiqués en euros et incluent la TVA au taux légal en vigueur. Avant de
            confirmer, le Client voit le récapitulatif de la commande, le total à payer et l'horaire
            de retrait ou de livraison choisi.
          </p>
          <p>
            Le paiement est effectué au moment de la commande et conservé par {LEGAL.brand} jusqu'à
            ce que le Client retire ou reçoive les produits. Après le paiement, l'Agriculteur
            confirme la commande. Si l'Agriculteur n'a pas assez de stock, il peut l'annuler et le
            Client est <strong>remboursé intégralement</strong>.
          </p>
        </>
      ),
    },
    {
      id: "levantamento",
      title: "Retrait et livraison",
      content: (
        <>
          <p>
            Chaque commande dispose d'un code de retrait (également au format QR) que le Client
            présente à l'Agriculteur. Le retrait se fait au lieu indiqué par l'Agriculteur, pendant
            les heures d'ouverture et avant la date limite affichée sur la commande.
          </p>
          <p>
            Lorsque l'Agriculteur propose la livraison à domicile, le Client indique l'adresse et
            marque le point exact de livraison. Il doit s'assurer que quelqu'un peut recevoir la
            commande à l'horaire convenu.
          </p>
        </>
      ),
    },
    {
      id: "nao-levantadas",
      title: "Commandes non retirées",
      content: (
        <>
          <p>
            Les produits sont en grande partie périssables et sont réservés pour le Client. Si la
            commande n'est pas retirée avant la date limite, elle expire automatiquement :
            l'Agriculteur n'est plus tenu de la conserver et <strong>seuls 10 % du montant payé sont
            remboursés</strong>. Le Client en est averti sur la plateforme.
          </p>
          <p>
            Si vous ne pouvez pas respecter l'horaire, contactez l'Agriculteur via le chat de la
            commande le plus tôt possible.
          </p>
        </>
      ),
    },
    {
      id: "livre-resolucao",
      title: "Droit de rétractation",
      content: (
        <>
          <p>
            Conformément au décret-loi n° 24/2014, le Client consommateur peut, en règle générale, se
            rétracter d'un achat à distance dans un délai de 14 jours. Ce droit{" "}
            <strong>ne s'applique pas</strong> aux biens susceptibles de se détériorer ou de se
            périmer rapidement (art. 17, n° 1, point d)), comme les fruits, légumes, œufs, produits
            laitiers ou viandes frais.
          </p>
          <p>
            Pour les produits non périssables, le Client peut exercer son droit de rétractation en
            contactant {LEGAL.brand} à <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> et doit
            retourner les produits en bon état. Le remboursement est effectué par le même moyen de
            paiement dans les 14 jours suivant la réception du retour.
          </p>
        </>
      ),
    },
    {
      id: "conformidade",
      title: "Conformité des produits et réclamations",
      content: (
        <p>
          L'Agriculteur, en tant que vendeur, répond du défaut de conformité des produits
          conformément au décret-loi n° 84/2021. Si un produit ne correspond pas à l'annonce ou est
          en mauvais état, signalez le problème sur la page de la commande ou via le chat ;{" "}
          {LEGAL.brand} suit la résolution entre les parties.
        </p>
      ),
    },
    {
      id: "experiencias",
      title: "Expériences à la ferme",
      content: (
        <>
          <p>
            Les Agriculteurs peuvent proposer des expériences sur leur exploitation, réservées et
            payées via la plateforme. La réservation est confirmée au moment du paiement et validée
            avec le QR code à l'arrivée.
          </p>
          <p>
            L'annulation par le Client est gratuite jusqu'à 5 jours avant la séance. Ensuite, 25 % du
            prix de l'expérience sont retenus (20 % pour l'Agriculteur et 5 % pour {LEGAL.brand}) ;
            les cadeaux supplémentaires payés sont remboursés. En cas d'absence, le montant payé
            n'est pas remboursé. Si l'Agriculteur annule, le Client est remboursé intégralement.
          </p>
        </>
      ),
    },
    {
      id: "alojamento",
      title: "Hébergement à la ferme",
      content: (
        <>
          <p>
            Les Agriculteurs peuvent proposer un hébergement sur leur exploitation agricole, à
            condition qu'il soit enregistré comme Hébergement Local ou Tourisme en Espace Rural ; le
            numéro d'enregistrement est indiqué par l'Agriculteur et affiché au Client. La
            réservation est confirmée au moment du paiement et validée avec le QR code à l'arrivée.
          </p>
          <p>
            Les mêmes règles d'annulation que pour les expériences s'appliquent, à compter de la date
            d'arrivée : gratuite jusqu'à 5 jours avant ; ensuite, 25 % du prix de l'hébergement sont
            retenus (20 % pour l'Agriculteur et 5 % pour {LEGAL.brand}), les cadeaux supplémentaires
            étant remboursés. En cas d'absence jusqu'à la date de départ, le montant n'est pas
            remboursé. La taxe de séjour, la déclaration des hôtes aux autorités et la facturation
            relèvent de la responsabilité de l'Agriculteur.
          </p>
        </>
      ),
    },
    {
      id: "avaliacoes",
      title: "Avis et contenus des utilisateurs",
      content: (
        <>
          <p>
            Seules les personnes ayant acheté auprès d'un Agriculteur via la plateforme (preuve
            d'achat) peuvent l'évaluer, avec un avis par commande, après l'avoir reçue, si
            l'Agriculteur l'annule ou si la livraison à domicile n'a toujours pas eu lieu 24 heures
            après la date prévue. Les avis doivent être honnêtes et respectueux. Les contenus faux,
            offensants, discriminatoires ou illégaux, la publicité et les données personnelles de
            tiers sont interdits, dans les avis comme dans le chat des commandes.
          </p>
          <p>
            Un avis publié ne peut pas être modifié. Sa suppression peut être demandée avec une
            justification et est soumise à l'examen de l'équipe {LEGAL.brand}. Toute personne
            signalant un abus de la part d'un Agriculteur doit fournir des preuves concrètes ; à
            défaut, l'Agriculteur peut engager une action en justice pour diffamation.
          </p>
          <p>
            Nous pouvons supprimer les contenus qui enfreignent ces règles. En publiant des contenus
            (textes, photos), vous accordez à {LEGAL.brand} une licence non exclusive et gratuite pour
            les afficher sur la plateforme tant qu'ils sont publiés.
          </p>
        </>
      ),
    },
    {
      id: "utilizacao",
      title: "Utilisation acceptable",
      content: (
        <ul>
          <li>Ne pas utiliser la plateforme à des fins illégales ou frauduleuses.</li>
          <li>
            Ne pas tenter d'accéder aux comptes ou aux données de tiers, ni perturber la sécurité ou
            le fonctionnement du service.
          </li>
          <li>Ne pas collecter de données de la plateforme par des moyens automatisés sans autorisation.</li>
          <li>Ne pas contourner la plateforme pour éviter la commission sur les commandes qui y ont été initiées.</li>
        </ul>
      ),
    },
    {
      id: "propriedade",
      title: "Propriété intellectuelle",
      content: (
        <p>
          La marque {LEGAL.brand}, le design, le logiciel et les contenus de la plateforme
          appartiennent à {LEGAL.brand} ou à ses concédants. Les contenus publiés par les
          Agriculteurs (photos, descriptions) relèvent de leur responsabilité et de leur propriété.
        </p>
      ),
    },
    {
      id: "responsabilidade",
      title: "Responsabilité",
      content: (
        <>
          <p>
            En tant qu'intermédiaire, {LEGAL.brand} n'est pas responsable de la qualité, de la
            sécurité ou de la conformité des produits, qui incombent à l'Agriculteur, ni des
            informations inexactes fournies par les utilisateurs. Nous nous efforçons de maintenir la
            plateforme disponible et sûre, mais ne garantissons pas un fonctionnement ininterrompu.
          </p>
          <p>
            Rien dans les présentes Conditions ne limite les droits reconnus par la loi aux
            consommateurs, ni la responsabilité de {LEGAL.brand} en cas de dol ou de faute lourde.
          </p>
        </>
      ),
    },
    {
      id: "suspensao",
      title: "Suspension et fermeture du compte",
      content: (
        <p>
          Vous pouvez fermer votre compte à tout moment en nous contactant. Nous pouvons suspendre ou
          fermer les comptes qui enfreignent les présentes Conditions ou la loi, avec préavis dans la
          mesure du possible. Les commandes en cours seront finalisées ou remboursées selon leur
          statut.
        </p>
      ),
    },
    {
      id: "alteracoes",
      title: "Modifications des Conditions",
      content: (
        <p>
          Nous pouvons mettre à jour les présentes Conditions pour refléter des évolutions légales ou
          du service. Les modifications importantes sont annoncées sur la plateforme avec un préavis
          raisonnable et ne s'appliquent pas aux commandes déjà passées.
        </p>
      ),
    },
    {
      id: "litigios",
      title: "Droit applicable et règlement des litiges",
      content: (
        <>
          <p>Les présentes Conditions sont régies par le droit portugais.</p>
          <p>
            En cas de litige de consommation, le Client peut recourir à un organisme de règlement
            extrajudiciaire des litiges (loi n° 144/2015), notamment le{" "}
            <a href="https://www.cniacc.pt" target="_blank" rel="noopener noreferrer">
              CNIACC – Centre national d'information et d'arbitrage des litiges de consommation
            </a>
            . Plus d'informations sur le{" "}
            <a href="https://www.consumidor.gov.pt" target="_blank" rel="noopener noreferrer">
              Portail du consommateur
            </a>
            .
          </p>
          <p>
            Nous disposons d'un{" "}
            <a href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener noreferrer">
              Livre de réclamations électronique
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
          Pour toute question sur les présentes Conditions :{" "}
          <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> · {LEGAL.phone}.
        </p>
      ),
    },
  ],
};

export default termsFr;
