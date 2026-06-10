# Qui gouverne la Belgique ?

Une frise interactive (streamgraph) des partis politiques à la Chambre des
représentants belge, de 1946 à 2024. Construite avec SvelteKit + D3.

L'épaisseur des flux représente la part (%) des sièges ou des voix de chaque
famille politique ; les flux se scindent quand les grands partis nationaux se
sont divisés en ailes flamande et francophone.

## Données

- Résultats officiels : SPF Intérieur (electionresults.belgium.be), recoupés avec Wikipédia.
- Couleurs et filiation des partis : *Timeline of Belgian political parties* (CRISP).

Voir l'encart « Comment les données ont été traitées » dans l'application pour la
méthodologie complète.

## Développement

```bash
npm install
npm run dev      # serveur de dev
npm run build    # build statique (BASE_PATH pour GitHub Pages)
```

Déployé automatiquement sur GitHub Pages via GitHub Actions.
