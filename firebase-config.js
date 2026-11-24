// Configuration de la transmission en ligne (Firebase).
// Tant que « actif » est false, l'application fonctionne exactement comme avant : rien n'est envoyé nulle part.
// Pour l'activer : remplir les 4 valeurs ci-dessous (Console Firebase > Paramètres du projet > Vos applications > Web), puis mettre actif: true.
window.FIREBASE_CONFIG = {
  actif: true,
  apiKey: "AIzaSyB09e-P2LPMEs4uDsBEMCGwhEWX9vE8iE0",
  authDomain: "bulletins-scolaires-4426c.firebaseapp.com",
  projectId: "bulletins-scolaires-4426c",
  appId: "1:615559526625:web:ed2c76b136addb81705fa0",
  domaineCourriel: "comptes-bulletins.com" // ne pas changer après la création des comptes
};