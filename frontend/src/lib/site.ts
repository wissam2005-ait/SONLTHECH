import type { IconName } from '../components/icons'

/**
 * CONTENU DU SITE VITRINE — tout le texte modifiable est ici.
 *
 * Le nom, le téléphone, l'e-mail et l'adresse ne sont PAS ici : ils viennent de
 * « Réglages → Paramètres » dans l'application (le dirigeant les modifie lui-même).
 * Les valeurs ci-dessous ne servent que si les Paramètres sont vides.
 */
export const site = {
  /** Nom affiché si les Paramètres ne sont pas encore remplis */
  defaultName: 'Sonlthech',
  /** Zone d'intervention, reprise dans les titres et le référencement */
  area: 'Béjaïa, Alger et leurs environs',
  city: 'Béjaïa et Alger',
  /** Téléphone affiché si les Paramètres ne sont pas encore remplis */
  phone: '0770 33 79 63',
  /** Numéro WhatsApp au format international, sans + ni espaces (213 = Algérie). null = pas de bouton WhatsApp */
  whatsapp: '213770337963' as string | null,
  whatsappMessage: 'Bonjour, je vous contacte depuis votre site internet.',
  /** Horaires affichés sur la page Contact (laisser null pour ne rien afficher) */
  hours: null as string | null,

  hero: {
    kicker: 'Électricité générale · Bâtiment & tertiaire',
    title: 'Votre électricité, installée et dépannée par des professionnels',
    text: 'Installation neuve, rénovation, mise aux normes et dépannage : une équipe qualifiée, des chantiers propres et des devis clairs, du simple dépannage à la rénovation complète.',
  },

  /** Engagements affichés sous le bandeau d'accueil */
  promises: [
    { icon: 'doc', title: 'Devis gratuit et détaillé', text: 'Chaque poste chiffré, sans surprise.' },
    { icon: 'clock', title: 'Intervention rapide', text: 'Dépannage dans les meilleurs délais.' },
    { icon: 'shield', title: 'Installations sécurisées', text: 'Protections, terre et différentiels.' },
    { icon: 'team', title: 'Équipe qualifiée', text: 'Des électriciens du métier.' },
  ] satisfies { icon: IconName; title: string; text: string }[],

  services: [
    {
      slug: 'installation', icon: 'home', title: 'Installation électrique neuve',
      short: 'Logements neufs, extensions et locaux professionnels.',
      text: 'Étude des besoins, plan d’implantation, passage des gaines et câbles, pose de l’appareillage et du tableau, puis mise en service.',
      points: ['Plan et implantation des prises et points lumineux', 'Tableau, protections et circuits dédiés', 'Mise en service et contrôle'],
    },
    {
      slug: 'renovation', icon: 'wrench', title: 'Rénovation électrique',
      short: 'Remise à neuf complète de votre installation.',
      text: 'Remplacement d’une installation ancienne ou dangereuse : câbles, appareillage, tableau. Travaux organisés pour limiter la gêne si vous habitez les lieux.',
      points: ['Diagnostic de l’existant', 'Remplacement des câbles et de l’appareillage', 'Chantier propre, gravats évacués'],
    },
    {
      slug: 'conformite', icon: 'shield', title: 'Mise en conformité',
      short: 'Sécurité des personnes et des équipements.',
      text: 'Mise à la terre, protections différentielles, remplacement des éléments vétustes : nous remettons votre installation en sécurité.',
      points: ['Mise à la terre', 'Protections différentielles', 'Remplacement des éléments dangereux'],
    },
    {
      slug: 'tableau', icon: 'gauge', title: 'Tableau électrique',
      short: 'Remplacement, extension, ajout de protections.',
      text: 'Un tableau bien dimensionné protège vos circuits et facilite les dépannages. Nous le remplaçons ou le complétons selon vos besoins.',
      points: ['Disjoncteurs et différentiels', 'Repérage clair des circuits', 'Ajout de circuits (cuisine, climatisation…)'],
    },
    {
      slug: 'raccordement', icon: 'plug', title: 'Raccordement et compteur',
      short: 'Préparation au branchement Sonelgaz.',
      text: 'Coffret, colonne montante et liaison au tableau : nous préparons votre installation pour le branchement du compteur.',
      points: ['Coffret et colonne montante', 'Liaison compteur – tableau', 'Préparation du dossier technique'],
    },
    {
      slug: 'depannage', icon: 'bolt', title: 'Dépannage',
      short: 'Panne de courant, disjoncteur qui saute, prise défectueuse.',
      text: 'Recherche de la panne, réparation ou remplacement de l’appareillage et rétablissement du courant en toute sécurité.',
      points: ['Recherche de panne', 'Remplacement d’appareillage', 'Rétablissement du courant'],
    },
    {
      slug: 'climatisation', icon: 'snow', title: 'Climatisation',
      short: 'Ligne dédiée, protection et raccordement.',
      text: 'Chaque climatiseur a besoin d’une ligne adaptée et protégée. Nous créons l’alimentation et réalisons le raccordement électrique.',
      points: ['Ligne dédiée et protection', 'Raccordement des unités', 'Vérification de la puissance disponible'],
    },
    {
      slug: 'secours', icon: 'battery', title: 'Groupe électrogène et onduleur',
      short: 'Alimentation de secours contre les coupures.',
      text: 'Inverseur de source, onduleur, circuits prioritaires : gardez l’essentiel alimenté pendant les coupures.',
      points: ['Inverseur de source', 'Onduleurs et circuits prioritaires', 'Raccordement du groupe'],
    },
    {
      slug: 'eclairage', icon: 'bulb', title: 'Éclairage',
      short: 'Intérieur, extérieur, LED et variateurs.',
      text: 'Éclairage fonctionnel ou d’ambiance, intérieur et extérieur, avec des solutions LED économes.',
      points: ['Éclairage LED', 'Extérieur et façades', 'Variateurs et détecteurs'],
    },
    {
      slug: 'domotique', icon: 'chip', title: 'Domotique',
      short: 'Volets, chauffage et éclairage pilotés.',
      text: 'Commandez éclairage, volets et chauffage depuis un interrupteur central, une télécommande ou votre téléphone.',
      points: ['Volets roulants motorisés', 'Scénarios d’éclairage', 'Pilotage à distance'],
    },
  ] satisfies { slug: string; icon: IconName; title: string; short: string; text: string; points: string[] }[],

  /** Clientèle */
  audiences: [
    { icon: 'home', title: 'Particuliers', text: 'Appartements, villas, rénovations et dépannages.' },
    { icon: 'building', title: 'Commerces et bureaux', text: 'Locaux professionnels, éclairage, tableaux, mise aux normes.' },
    { icon: 'site', title: 'Promoteurs et entreprises', text: 'Lots électricité, devis quantitatif et estimatif (DQE).' },
  ] satisfies { icon: IconName; title: string; text: string }[],

  /** Déroulement d'un chantier */
  steps: [
    { title: 'Votre demande', text: 'Par téléphone ou via le formulaire de devis, en quelques minutes.' },
    { title: 'Visite et diagnostic', text: 'Nous étudions votre installation et vos besoins sur place.' },
    { title: 'Devis détaillé', text: 'Un devis clair, poste par poste, que vous validez avant tout travail.' },
    { title: 'Travaux et mise en service', text: 'Chantier propre, contrôle final et explications à la livraison.' },
  ],

  faq: [
    { q: 'Où intervenez-vous ?', a: 'Nous intervenons à Béjaïa, à Alger et dans leurs environs, pour les particuliers comme pour les professionnels.' },
    { q: 'Le devis est-il gratuit ?', a: 'Oui. Décrivez votre projet via le formulaire ou par téléphone : nous vous remettons un devis détaillé, sans engagement.' },
    { q: 'Intervenez-vous pour les professionnels ?', a: 'Oui : commerces, bureaux, locaux professionnels, ainsi que les lots électricité pour les promoteurs et entreprises, avec devis quantitatif et estimatif.' },
    { q: 'Mon disjoncteur saute souvent, que faire ?', a: 'Débranchez les appareils du circuit concerné puis réarmez. Si le problème persiste, contactez-nous : une surcharge ou un défaut d’isolement peut être dangereux.' },
    { q: 'Préparez-vous le branchement du compteur ?', a: 'Oui, nous réalisons le coffret, la colonne montante et la liaison au tableau pour préparer votre installation au branchement Sonelgaz.' },
    { q: 'Comment se passe le règlement ?', a: 'Les modalités (acompte, échéances) sont indiquées sur le devis. Le règlement peut se faire en espèces, par chèque, virement ou CCP.' },
  ],
}

export type Service = (typeof site.services)[number]
