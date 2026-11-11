# Carte carburants

Carte de France des prix des carburants (métropole, Corse comprise), mobile-first, 100 % statique : aucun serveur, aucune base, aucun secret.

Site : https://maximecouvry-droid.github.io/carte-carburants/

## Fonctionnement

- `refresh.yml` (GitHub Actions, toutes les 15 min + à chaque push) : `npm run build:data` télécharge le flux officiel, l'analyse, joint les enseignes et écrit `public/data/{stations,meta,villes}.json`, puis `npm run build` construit le front et le site est publié sur GitHub Pages. Si le téléchargement échoue ou si le flux contient moins de 5 000 stations, le job échoue avant la publication : l'ancienne version reste en ligne.
- `brands.yml` (chaque lundi) : met à jour `data/brands.json` depuis OpenStreetMap (Overpass) et le commite.
- Le navigateur charge `stations.json` une fois et filtre tout lui-même (carburant, fourchette, zone, tri, recherche de ville).
- Mini-app installable (PWA) : manifeste, icônes, service worker.

## Commandes

```bash
npm ci
npm run build:data   # télécharge le flux officiel et génère public/data/*
npm run dev          # http://localhost:5173/carte-carburants/
npm test             # parseur, enseignes, utilitaires
npm run e2e          # parcours de bout en bout (Playwright, nécessite build:data)
```

## Sources et licences

- Prix : [prix-carburants.gouv.fr](https://www.prix-carburants.gouv.fr/rubrique/opendata/), Licence Ouverte 2.0.
- Enseignes : © contributeurs OpenStreetMap, licence ODbL (voir `data/README.md`).
- Fond de carte : [OpenFreeMap](https://openfreemap.org) © OpenMapTiles, données OpenStreetMap.
