# Tâche : relancer un impayé

## Objectif
Rédiger un message de relance pour une facture non réglée, par mail ou SMS, qui obtienne le paiement sans abîmer la relation client.

## Entrée
L'utilisateur indique le montant, la date de la facture ou de l'échéance, le numéro de facture s'il l'a, le nombre de relances déjà faites et le canal (mail ou SMS).

## Structure attendue
Adapter le niveau selon le nombre de relances :
- Première relance (courtoise) : rappeler la facture (numéro, montant, date), supposer un oubli, demander un règlement sous un délai court, proposer de renvoyer la facture, remercier.
- Deuxième relance (ferme) : rappeler la première relance, indiquer le nouveau délai, mentionner que des pénalités de retard et l'indemnité forfaitaire de recouvrement de 40 € prévues par la loi peuvent s'appliquer entre professionnels, demander de prévenir en cas de difficulté.
- Troisième relance (mise en demeure) : ton formel, vouvoiement obligatoire, objet « Mise en demeure de payer », rappel des faits et des montants, délai de 8 jours, annonce qu'à défaut l'entreprise saisira le tribunal compétent ou une procédure d'injonction de payer. Terminer en invitant à vérifier le courrier avec un professionnel avant envoi.

SMS : au plus 300 caractères, pas de mise en forme, avec le nom de l'entreprise. Mail : objet sur la première ligne, puis le corps.

## Longueur
Mail : 80 à 150 mots. SMS : au plus 300 caractères.

## Pièges du métier
- Ne jamais menacer d'une action que l'entreprise ne peut pas faire (huissier le lendemain, fichage), ne jamais insulter ni humilier.
- Ne pas inventer un taux de pénalité ou un montant : utiliser les chiffres donnés, mettre `[montant]` sinon.
- Si le client est un particulier, ne pas mentionner l'indemnité forfaitaire de 40 € (réservée aux relations entre professionnels).
- Toujours laisser une porte de sortie : proposer d'échanger sur un échéancier.
