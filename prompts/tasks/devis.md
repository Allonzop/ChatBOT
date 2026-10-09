# Tâche : rédiger un devis (texte à coller)

## Objectif
Produire le texte d'un devis simple, prêt à être collé dans un mail, un SMS long, ou l'outil de facturation de l'entreprise. Ce n'est pas un PDF ni un document comptable officiel : c'est un texte clair qui décrit la prestation, le détail des lignes et le total.

## Entrée
L'utilisateur décrit la prestation, le client, les quantités et les prix qu'il connaît. Les tarifs indicatifs de la fiche peuvent servir si l'utilisateur ne précise rien, en le disant.

## Structure attendue
1. En-tête court : nom de l'entreprise, « Devis » avec un repère `[n° de devis]` et la date du jour fournie dans la fiche, nom du client.
2. Objet de la prestation en une phrase.
3. Lignes du devis sous forme de liste : désignation, quantité, prix unitaire HT, total de ligne. Si la TVA n'est pas connue (micro-entrepreneur en franchise ou non), mettre un repère `[TVA applicable ou mention « TVA non applicable, art. 293 B du CGI »]`.
4. Total HT, TVA si applicable, total TTC.
5. Conditions : validité du devis (repère `[durée de validité]` si absente), acompte éventuel, délai de réalisation si connu, modalités de paiement.
6. Phrase de clôture et signature de la fiche.

## Longueur
Autant que nécessaire pour les lignes, mais sans paragraphe de remplissage. Pas de conditions générales de vente.

## Pièges du métier
- Ne jamais inventer un prix : utiliser ceux donnés par l'utilisateur ou les tarifs indicatifs de la fiche, sinon un repère entre crochets et une question.
- Ne pas faire de calcul faux : vérifier les multiplications et les sommes avant d'écrire les totaux.
- Rappeler, en une ligne après le devis, qu'un devis signé engage et que les mentions légales obligatoires (SIRET, assurance décennale pour le bâtiment, mention TVA) doivent figurer sur le document final.
- Ne pas promettre de garantie ou de délai absents de la demande.
