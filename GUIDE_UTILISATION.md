# Guide d'utilisation — ElectroPro

Ce guide explique les opérations courantes. Ouvrez l'application à l'adresse indiquée par la personne qui l'a installée
(sur l'ordinateur du bureau : http://localhost/admin/login).

## Premier démarrage (une seule fois)
1. **Réglages → Mon compte** : choisissez votre mot de passe.
2. **Réglages → Paramètres** : nom de l'entreprise, adresse, téléphone, RC, NIF, NIS, article d'imposition,
   RIB ou CCP, logo. Ces informations s'impriment sur tous vos devis et factures.
3. **Chantiers → Catalogue des pièces** : ajoutez vos pièces habituelles et leur prix (câbles, disjoncteurs, prises…).
   Elles se rempliront toutes seules ensuite.
4. **Pilotage → Clients** : ajoutez vos clients.

## Faire un devis (DQE)
1. **Facturation → Devis → Nouveau devis**, choisissez le client.
2. **Objet** : le titre encadré (ex. « Reste à réaliser des travaux du nouveau siège… »). **Sous-titre** : ex. « 02- BATIMENT ».
3. Ajoutez les lignes avec les boutons :
   - **Titre de lot** : « LOT 03 : ELECTRICITE » (ligne grisée) ;
   - **Article** : désignation, unité (U, ML…), quantité, prix unitaire ;
   - **Article à sous-lignes** : un titre sans quantité (« F/P de Prise de Courant ») suivi de sous-lignes a/, b/, c/.
4. Les montants, le total du lot, le total général et la somme en lettres se calculent seuls.
5. **Imprimer / PDF** pour le remettre au client, ou **Export Excel** si on vous demande le fichier.
6. Quand le client répond : **Accepté** ou **Refusé**. Une fois accepté : **Transformer en facture**.

## Facturer
- **Depuis un devis** : bouton « Transformer en facture » sur le devis.
- **Depuis un chantier** : le matériel acheté du chantier est repris avec votre marge, plus la main-d'œuvre.
- **Facture libre** (dépannage) : **Factures → Nouvelle facture**.

Le brouillon reste modifiable. **Émettre la facture** lui donne son numéro définitif (FA-2026-0001…) : elle ne peut plus être modifiée.
À chaque versement du client : **Enregistrer un paiement** (espèces, chèque, virement, CCP). La facture passe « Payée »
quand tout est réglé ; le tableau de bord indique ce qui reste à encaisser et les factures en retard.

## Chantiers et équipe
- **Chantiers** : créez le chantier, ajoutez l'équipe, le matériel et les tâches. L'équipe met à jour l'avancement depuis son téléphone.
- **Employés** : fiche de chaque personne (contrat, salaire, absences). **Désactiver** un employé l'empêche de se connecter sans effacer son historique.
- **Absences** : cliquez sur une case du planning pour déclarer une absence.
- **Salaires** : chaque mois, « Paiement » pour chaque employé.

## Sauvegardes — important
Double-cliquez sur **`sauvegarder.bat`** au moins une fois par semaine, et copiez le dossier **`sauvegardes`**
sur une clé USB. En cas de problème, une sauvegarde se restaure en la glissant sur `restaurer.bat`.
