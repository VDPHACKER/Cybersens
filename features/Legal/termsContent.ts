// Conditions d'utilisation et politique de confidentialité de CyberSens.
// Toute modification du fond du texte doit s'accompagner d'un nouveau TERMS_VERSION dans server/api.mjs
// (la date d'acceptation et la version acceptées sont enregistrées pour chaque compte).

export interface TermsSection {
  title: string;
  paragraphs: string[];
}

export interface TermsDocument {
  title: string;
  updated: string;
  sections: TermsSection[];
}

/** `contact` : adresse e-mail de l'éditeur (variable CONTACT_EMAIL du serveur), ou null. */
export const getTerms = (lang: string, contact: string | null): TermsDocument =>
  lang === 'fr' ? termsFr(contact) : termsEn(contact);

const termsFr = (contact: string | null): TermsDocument => {
  const how = contact
    ? `par e-mail à ${contact}`
    : 'auprès de l’administrateur du site (via la section Communauté de la plateforme)';
  return {
    title: 'Conditions d’utilisation et politique de confidentialité',
    updated: 'Dernière mise à jour : 30 septembre 2026',
    sections: [
      {
        title: '1. Objet et éditeur',
        paragraphs: [
          'CyberSens est une plateforme gratuite de sensibilisation à la cybersécurité : cours, quiz, mini-jeux, arène CTF, outils d’analyse, assistant IA, actualités, classements et communauté.',
          'Le site est édité à titre non commercial par VDPHACKER (formateur en cybersécurité et IA). Toute demande relative au site ou à vos données s’adresse ' +
            how +
            '.',
          'En créant un compte, vous déclarez avoir lu et accepté les présentes conditions. Si vous les refusez, n’utilisez pas le service.',
        ],
      },
      {
        title: '2. Accès et compte',
        paragraphs: [
          'Le service est destiné aux personnes âgées d’au moins 15 ans. En dessous de cet âge, l’accord d’un parent ou représentant légal est requis.',
          'Vous fournissez des informations exactes et gardez votre mot de passe confidentiel. Vous êtes responsable de l’activité de votre compte. Prévenez-nous en cas d’usage suspect.',
          'Un compte par personne. Nous pouvons suspendre ou supprimer un compte qui enfreint ces conditions.',
        ],
      },
      {
        title: '3. Usage acceptable',
        paragraphs: [
          'Le contenu de CyberSens est éducatif. Les techniques présentées (laboratoires, CTF, outils) ne doivent être utilisées que sur vos propres systèmes ou sur des systèmes pour lesquels vous avez une autorisation écrite explicite. Toute attaque contre un système tiers est illégale et sous votre seule responsabilité.',
          'Il est interdit de : tenter d’accéder à des comptes ou données d’autrui, perturber ou surcharger le service, contourner les protections (limites de débit, anti-triche du classement), extraire massivement les contenus, ou publier des contenus illicites, haineux, diffamatoires, publicitaires ou contenant des données personnelles d’autrui.',
          'Pour signaler une faille de sécurité, contactez-nous de façon responsable avant toute divulgation publique.',
        ],
      },
      {
        title: '4. Contenus publiés (Communauté)',
        paragraphs: [
          'Vous restez propriétaire de ce que vous publiez et nous accordez une licence non exclusive, gratuite, pour l’afficher dans le service. Vous garantissez avoir le droit de le publier.',
          'Les messages peuvent être signalés par les membres et supprimés par les administrateurs sans préavis s’ils enfreignent ces conditions. Les messages publiés sont visibles des autres membres.',
        ],
      },
      {
        title: '5. Assistant IA et exactitude du contenu',
        paragraphs: [
          'L’assistant IA est fourni par un modèle tiers (Google Gemini) via notre serveur. Le texte que vous lui envoyez est transmis à Google pour générer la réponse : n’y saisissez ni mot de passe, ni donnée confidentielle, ni donnée personnelle sensible.',
          'Les réponses de l’IA peuvent être inexactes. Les contenus de formation sont fournis à titre informatif, sans garantie d’exhaustivité ni de résultat. Les certificats CyberSens attestent d’un parcours sur la plateforme et ne constituent pas un diplôme officiel.',
        ],
      },
      {
        title: '6. Données personnelles collectées',
        paragraphs: [
          'Responsable du traitement : VDPHACKER (voir article 1).',
          'Données que vous fournissez : nom, adresse e-mail, profil déclaré (étudiant, particulier, professionnel, entreprise), photo de profil facultative, mot de passe (conservé uniquement sous forme hachée, jamais en clair), messages et commentaires publiés.',
          'Données générées par l’usage : progression dans les cours, points et niveau, résultats de quiz, certificats obtenus, préférences, date d’acceptation de ces conditions.',
          'Données techniques de sécurité : journal des connexions (événement, date, adresse IP) et cookie de session.',
          'Si vous utilisez « Se connecter avec Google », nous recevons de Google votre nom et votre adresse e-mail vérifiée.',
        ],
      },
      {
        title: '7. Finalités et bases légales',
        paragraphs: [
          'Fournir le service (création de compte, suivi de progression, certificats, classements, communauté) : exécution du contrat que constituent ces conditions.',
          'Sécuriser le service (journal de connexions, limitation des tentatives, prévention des abus) : intérêt légitime.',
          'Envoyer un e-mail de réinitialisation de mot de passe lorsque vous le demandez : exécution du contrat. Nous n’envoyons aucune publicité ni newsletter et ne vendons pas vos données.',
        ],
      },
      {
        title: '8. Visibilité, destinataires et sous-traitants',
        paragraphs: [
          'Votre nom, votre niveau et vos points apparaissent dans les classements et la communauté ; l’option « Me masquer » du profil vous retire des classements.',
          'Votre adresse e-mail n’est visible que de vous et des administrateurs du site. Les administrateurs peuvent consulter la liste des membres (nom, e-mail, profil, progression, dates d’inscription et de dernière connexion) uniquement pour administrer le service et modérer.',
          'Prestataires techniques : l’hébergeur du site, Google (assistant IA et, si vous l’utilisez, connexion Google) et, pour les e-mails de réinitialisation lorsqu’ils sont activés, Resend. Ces prestataires peuvent traiter des données hors de l’Union européenne avec les garanties prévues par le RGPD (clauses contractuelles types ou équivalent).',
        ],
      },
      {
        title: '9. Cookies et stockage local',
        paragraphs: [
          'CyberSens utilise un seul cookie, strictement nécessaire : le cookie de session (HttpOnly) qui vous maintient connecté. Il ne sert ni au suivi publicitaire ni à la mesure d’audience et ne requiert donc pas de bandeau de consentement.',
          'Le stockage local de votre navigateur conserve un cache de vos données pour le mode hors ligne (application installable). Se déconnecter ou vider les données du site l’efface.',
        ],
      },
      {
        title: '10. Durée de conservation',
        paragraphs: [
          'Les données de votre compte sont conservées tant que le compte existe et supprimées à sa suppression. Les données du journal de sécurité sont conservées le temps nécessaire à la sécurité du service.',
          'Les sauvegardes techniques de la base peuvent contenir vos données pendant une durée limitée après suppression.',
        ],
      },
      {
        title: '11. Vos droits',
        paragraphs: [
          'Conformément au RGPD, vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité de vos données. Vous pouvez modifier votre profil et votre mot de passe depuis votre compte, et masquer votre présence dans les classements.',
          'Pour les autres droits (suppression du compte et des données, copie de vos données), écrivez ' +
            how +
            ' depuis l’adresse e-mail du compte ; nous répondons dans un délai d’un mois.',
          'Vous pouvez introduire une réclamation auprès de l’autorité de protection des données de votre pays (en France : la CNIL, cnil.fr).',
        ],
      },
      {
        title: '12. Sécurité',
        paragraphs: [
          'Nous appliquons des mesures raisonnables : mots de passe hachés, connexion chiffrée (HTTPS), limitation des tentatives, cookies protégés, accès d’administration restreint. Aucun système n’est infaillible : en cas de violation de données susceptible de vous affecter, nous vous en informerons conformément à la loi.',
        ],
      },
      {
        title: '13. Responsabilité et disponibilité',
        paragraphs: [
          'Le service est fourni « en l’état », gratuitement, sans garantie de disponibilité continue. Nous pouvons le modifier, l’interrompre ou le supprimer. Dans les limites permises par la loi, notre responsabilité ne saurait être engagée pour les dommages indirects ou pour l’usage que vous faites des connaissances acquises.',
        ],
      },
      {
        title: '14. Modifications et droit applicable',
        paragraphs: [
          'Nous pouvons modifier ces conditions ; en cas de changement important, une nouvelle acceptation pourra vous être demandée. La poursuite de l’utilisation après information vaut acceptation.',
          'Ces conditions sont régies par le droit français, sans préjudice des droits impératifs dont vous bénéficiez en tant que consommateur dans votre pays de résidence.',
        ],
      },
    ],
  };
};

const termsEn = (contact: string | null): TermsDocument => {
  const how = contact
    ? `by email at ${contact}`
    : 'through the site administrator (via the Community section of the platform)';
  return {
    title: 'Terms of Use and Privacy Policy',
    updated: 'Last updated: 30 September 2026',
    sections: [
      {
        title: '1. Purpose and publisher',
        paragraphs: [
          'CyberSens is a free cybersecurity awareness platform: courses, quizzes, mini-games, a CTF arena, analysis tools, an AI assistant, news, leaderboards and a community.',
          'The site is published on a non-commercial basis by VDPHACKER (cybersecurity and AI trainer). Any request about the site or your data should be sent ' +
            how +
            '.',
          'By creating an account you confirm that you have read and accepted these terms. If you do not accept them, do not use the service.',
        ],
      },
      {
        title: '2. Access and account',
        paragraphs: [
          'The service is intended for people aged 15 or over. Below that age, the consent of a parent or legal guardian is required.',
          'You provide accurate information and keep your password confidential. You are responsible for activity on your account. Tell us if you notice suspicious use.',
          'One account per person. We may suspend or delete an account that breaches these terms.',
        ],
      },
      {
        title: '3. Acceptable use',
        paragraphs: [
          'CyberSens content is educational. The techniques shown (labs, CTF, tools) may only be used on your own systems or on systems you have explicit written permission to test. Attacking third-party systems is illegal and entirely your responsibility.',
          'You must not: try to access other people’s accounts or data, disrupt or overload the service, bypass protections (rate limits, leaderboard anti-cheat), mass-extract content, or post unlawful, hateful, defamatory or promotional content, or content containing other people’s personal data.',
          'To report a security flaw, contact us responsibly before any public disclosure.',
        ],
      },
      {
        title: '4. Published content (Community)',
        paragraphs: [
          'You keep ownership of what you post and grant us a non-exclusive, free licence to display it in the service. You warrant that you have the right to post it.',
          'Messages can be reported by members and removed by administrators without notice if they breach these terms. Posted messages are visible to other members.',
        ],
      },
      {
        title: '5. AI assistant and accuracy of content',
        paragraphs: [
          'The AI assistant is provided by a third-party model (Google Gemini) through our server. The text you send to it is transmitted to Google to generate the answer: do not enter passwords, confidential data or sensitive personal data.',
          'AI answers may be inaccurate. Training content is provided for information only, with no guarantee of completeness or outcome. CyberSens certificates attest to a learning path on the platform and are not an official diploma.',
        ],
      },
      {
        title: '6. Personal data we collect',
        paragraphs: [
          'Data controller: VDPHACKER (see section 1).',
          'Data you provide: name, email address, declared profile (student, individual, professional, company), optional profile picture, password (stored only as a hash, never in clear text), posts and comments.',
          'Data generated by use: course progress, points and level, quiz results, certificates earned, preferences, date on which you accepted these terms.',
          'Security data: sign-in log (event, date, IP address) and session cookie.',
          'If you use “Sign in with Google”, we receive your name and verified email address from Google.',
        ],
      },
      {
        title: '7. Purposes and legal bases',
        paragraphs: [
          'Providing the service (account, progress tracking, certificates, leaderboards, community): performance of the contract formed by these terms.',
          'Securing the service (sign-in log, attempt limiting, abuse prevention): legitimate interest.',
          'Sending a password-reset email when you request it: performance of the contract. We send no advertising or newsletters and do not sell your data.',
        ],
      },
      {
        title: '8. Visibility, recipients and processors',
        paragraphs: [
          'Your name, level and points appear in leaderboards and the community; the “Hide me” profile option removes you from leaderboards.',
          'Your email address is visible only to you and the site administrators. Administrators can view the member list (name, email, profile, progress, sign-up and last sign-in dates) solely to run and moderate the service.',
          'Technical providers: the site host, Google (AI assistant and, if you use it, Google sign-in) and, for reset emails when enabled, Resend. These providers may process data outside the European Union with the safeguards required by the GDPR (standard contractual clauses or equivalent).',
        ],
      },
      {
        title: '9. Cookies and local storage',
        paragraphs: [
          'CyberSens uses a single, strictly necessary cookie: the (HttpOnly) session cookie that keeps you signed in. It is not used for advertising or audience measurement, so no consent banner is required.',
          'Your browser’s local storage keeps a cache of your data for offline mode (installable app). Signing out or clearing site data erases it.',
        ],
      },
      {
        title: '10. Retention',
        paragraphs: [
          'Your account data is kept while the account exists and deleted when it is deleted. Security log data is kept for as long as needed for the security of the service.',
          'Technical database backups may contain your data for a limited time after deletion.',
        ],
      },
      {
        title: '11. Your rights',
        paragraphs: [
          'Under the GDPR you have the right of access, rectification, erasure, restriction, objection and portability. You can edit your profile and password from your account and hide yourself from leaderboards.',
          'For other rights (deleting your account and data, getting a copy of your data), write ' +
            how +
            ' from the email address of the account; we reply within one month.',
          'You may lodge a complaint with the data protection authority of your country (in France: the CNIL, cnil.fr).',
        ],
      },
      {
        title: '12. Security',
        paragraphs: [
          'We apply reasonable measures: hashed passwords, encrypted connection (HTTPS), attempt limiting, protected cookies, restricted administrator access. No system is infallible: if a data breach likely to affect you occurs, we will inform you as required by law.',
        ],
      },
      {
        title: '13. Liability and availability',
        paragraphs: [
          'The service is provided “as is”, free of charge, with no guarantee of continuous availability. We may change, interrupt or remove it. To the extent permitted by law, we are not liable for indirect damages or for how you use the knowledge gained.',
        ],
      },
      {
        title: '14. Changes and governing law',
        paragraphs: [
          'We may amend these terms; for a material change, you may be asked to accept them again. Continued use after notice constitutes acceptance.',
          'These terms are governed by French law, without prejudice to the mandatory consumer rights you enjoy in your country of residence.',
        ],
      },
    ],
  };
};
