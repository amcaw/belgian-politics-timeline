# Qui gouverne la Belgique ? — Méthodologie & architecture

Frise interactive des partis politiques à la **Chambre des représentants** belge
(chambre basse du parlement fédéral), **1946 → 2024**, sur les **24 élections**
législatives de la période et les **45 gouvernements** successifs.

- **En ligne :** https://amcaw.github.io/belgian-politics-timeline/
- **Code :** https://github.com/amcaw/belgian-politics-timeline (dossier racine = l'app SvelteKit)
- **Stack :** SvelteKit (Svelte 5 runes) + D3 + TypeScript, build statique (`adapter-static`),
  déployé sur GitHub Pages via GitHub Actions à chaque push sur `main`.

Ce document décrit ce que fait l'app, comment les données ont été construites et
vérifiées, et où regarder dans le code. Il sert de point d'entrée pour un audit.

---

## 1. Ce que l'app montre — les trois vues

Un sélecteur **« Vue »** bascule entre trois représentations des mêmes données.
Un sélecteur **« Mesure »** (Sièges / Voix %) s'applique aux vues à flux.

### Vue 1 — « Résultats » (streamgraph)
- Streamgraph horizontal : chaque flux coloré = une famille/parti, épaisseur =
  part des **sièges** ou des **voix** à chaque élection.
- Lignes **droites** entre élections (`curveLinear`) — choix délibéré : les courbes
  créaient de faux chevauchements visuels.
- Ordre vertical par **famille politique** (extrême gauche → extrême droite) pour
  que les couleurs proches se regroupent et que les scissions se lisent.
- Survol d'un parti : met en valeur sa bande, estompe les autres + tooltip
  (sièges, % à l'année survolée).
- Clic sur un portrait de Premier ministre : surligne sa **coalition** dans le
  flux et ouvre un panneau latéral (composition + lien Wikipédia).

### Vue 2 — « Au pouvoir » (Gantt) — **vue par défaut**
- Une **ligne par parti** ayant gouverné ; des **barres horizontales** marquent
  les périodes où il était dans la coalition fédérale ; épaisseur de barre =
  sièges détenus.
- Lecture **verticale** d'une date = la coalition à cet instant T.
- Répond à la question « qui gouverne quand, et avec qui », et montre que « c'est
  toujours un peu les mêmes ».
- Clic sur une année ou un PM → met à jour l'en-tête de coalition.

### Vue 3 — « Au pouvoir (flux) »
- Le streamgraph « Résultats », mais les périodes **hors pouvoir** d'un parti sont
  **grises** ; seules les **législatures où il gouvernait** sont colorées.
- Chaque **période de gouvernement** est survolable indépendamment (survoler la
  N-VA de 2024 ne surligne pas la N-VA de 2014 — ce sont des périodes distinctes).
- Même en-tête de coalition que la vue Gantt (composant partagé), pas de panneau
  latéral.

### Éléments communs
- **Frise des Premiers ministres** en haut : les 45 gouvernements, chacun à sa
  **vraie date** de prise de fonction, empilés sur **plusieurs étages** quand ils
  sont rapprochés (avec léger décalage latéral), reliés à l'axe par des
  **connecteurs à angle droit** routés dans une gouttière sous les photos (aucun
  connecteur ne traverse une photo). Photos = portraits Wikipédia, anneau coloré
  selon le parti du PM.
- **En-tête de coalition** (`CoalitionHeader.svelte`) : PM, nom du gouvernement,
  date d'entrée en fonction (JJ/MM/AAAA), pastilles de la coalition (parti +
  sièges + **ancienneté au pouvoir** de la lignée), total de sièges, lien Wikipédia.
- **Ancienneté au pouvoir** : pour chaque parti de la coalition, nombre cumulé
  d'années au gouvernement **en suivant les changements de nom** (ex. Les Engagés
  ≈ 66 ans via PSC → cdH → Les Engagés). Calcul sur la lignée complète.
- Thème **clair/sombre** automatique (`prefers-color-scheme`), tokens CSS, police
  Montserrat. Frise scrollable horizontalement avec un indicateur « faites défiler ».
- Encart dépliable **« Comment les données ont été traitées »** (méthodologie
  côté utilisateur).

---

## 2. Sources de données

| Donnée | Source | Détail |
|---|---|---|
| Sièges par parti, par élection | Wikipédia (articles « Élections législatives belges de AAAA ») | Tabulation nationale consolidée |
| Voix (vote share) | API officielle IBZ (`api.electionresults.belgium.be`) | Nœud « Country » de chaque élection (votes par parti au niveau national) |
| Composition des coalitions (parti → sièges à la formation) | Wikipédia (articles de gouvernement + de législature) | Sièges **au moment de la formation** du gouvernement |
| Photos des Premiers ministres | API Wikipédia `pageimages` | Téléchargées en local dans `static/pm/` |
| Couleurs & filiation des partis | *Timeline of Belgian political parties* (référence) + dates recoupées sur Wikipédia | — |

**Pourquoi deux sources pour sièges vs voix ?** L'API officielle ne fournit
proprement que les **votes** au niveau national ; les sièges y sont fragmentés en
sous-listes par canton/arrondissement (cas de transition illisibles). Les tables
Wikipédia donnent les **sièges nationaux** consolidés, conformes aux ouvrages de
référence. Les deux ont été recoupées (concordance sur les 24 élections).

### Liste exhaustive des sources utilisées dans la version actuelle

**Données officielles**
- Service public fédéral Intérieur (IBZ), API de résultats électoraux :
  `https://api.electionresults.belgium.be` (nœud « Country » par élection — voix,
  et sièges bruts) ; portail public `https://resultatselection.belgium.be`.

**Wikipédia (français, et anglais en recoupement)**
- Articles d'élection : « Élections législatives belges de AAAA » pour chacune des
  24 élections (1946, 1949, 1950, 1954, 1958, 1961, 1965, 1968, 1971, 1974, 1977,
  1978, 1981, 1985, 1987, 1991, 1995, 1999, 2003, 2007, 2010, 2014, 2019, 2024).
- Articles de gouvernement : « Gouvernement X » pour les 45 gouvernements
  (Van Acker II, Spaak I/II, Huysmans, Eyskens I–V, Duvieusart, Pholien,
  Van Houtte, Van Acker IV, Lefèvre, Harmel, Vanden Boeynants I/II, Leburton,
  Tindemans I/II, Martens I–IX, Mark Eyskens, Dehaene I/II, Verhofstadt I/II/III,
  Leterme I/II, Van Rompuy, Di Rupo, Michel I/II, Wilmès I/II, De Croo, De Wever).
- Articles de législature : « NNe législature de la Chambre des représentants de
  Belgique » (encadré « Gouvernement (N) » donnant la composition par parti et les
  sièges à la formation — notamment 52e, 54e, 55e, 56e pour les cas récents).
- API `pageimages` de Wikipédia pour les portraits des Premiers ministres
  (fichiers Wikimedia Commons), téléchargés dans `static/pm/`.

**Référence éditoriale (couleurs & filiation des partis)**
- *Timeline of Belgian political parties* (généalogie de référence des partis
  belges : renommages, scissions, fusions, couleurs conventionnelles), dates
  recoupées sur les articles Wikipédia de chaque parti.

**Cadre / contexte**
- CRISP (Centre de recherche et d'information socio-politiques) :
  `https://www.crisp.be` — référence de contexte sur le système de partis belge.

**Outils**
- Portraits : Wikimedia Commons (licences des fichiers individuels sur Commons).
- Polices : Montserrat (Google Fonts).
- Bibliothèque de visualisation : D3 ; framework : SvelteKit.

> Toutes les données chiffrées (sièges, voix, compositions de coalition) ont été
> soit lues directement depuis ces sources en ligne, soit recoupées entre elles ;
> aucune valeur n'a été inventée. Les seules estimations sont les ventilations de
> cartels (cf. §3).

---

## 3. Construction & règles de traitement

### Pipeline
1. `scripts/fetch-api-data.mjs` → récupère votes (+ sièges bruts) de l'API IBZ →
   `src/lib/data/api-elections.json`.
2. `scripts/build-dataset.mjs` → fusionne sièges (Wikipédia) + voix (API),
   normalise vers ~35 partis canoniques, applique les règles ci-dessous →
   `src/lib/data/elections.json`.
3. `scripts/build-layout.mjs` → calcule les couloirs/lignées pour la mise en page.
4. Les compositions de gouvernement et les portraits sont collectés séparément →
   `src/lib/data/governments.json`.

### Règles éditoriales (à connaître pour l'audit)
- **Épaisseur = part (%)**, jamais le nombre absolu : la Chambre comptait
  **202 sièges en 1946, 212 de 1949 à 1991, puis 150 depuis 1995**.
- **Convention de scission (lissage d'affichage, ≠ chronologie politique exacte) :**
  les familles unitaires sont montrées d'un bloc jusqu'à une année-charnière puis
  séparées par aile linguistique :
  - chrétiens : unitaires jusqu'en **1971**, CVP/PSC dès **1974** ;
  - socialistes : unitaires jusqu'en **1978**, SP/PS dès **1981** ;
  - libéraux : unitaires jusqu'en **1971**, PVV dès **1974**.
  *(La scission réelle des chrétiens est 1968, des socialistes 1978 — l'affichage
  suit la convention des tables nationales.)* La même règle de transition est
  appliquée **aux sièges ET aux voix** pour qu'ils restent alignés.
- **Cartels répartis par estimation** (sièges et voix de la même façon) :
  CD&V/N-VA 2007 (80/20 → 24/6), PRL-FDF (80/20), FDF-RW (50/50), FDF-PLDP, etc.
  Ces sièges par aile sont des **approximations**, pas des résultats officiels par
  parti distinct.
- **% de voix** calculé sur les suffrages des partis retenus (hors blancs/nuls et
  hors petites listes regroupées en « autres »).
- **Partis < 1 %** regroupés en « autres ».
- **Filiation explicite** : renommages (PSC→cdH→Les Engagés ; SP→sp.a→Vooruit ;
  PVV→VLD→Open Vld), scissions (parti chrétien unitaire → CVP + PSC), fusions
  (FDF → MR). Permet d'afficher la généalogie et de cumuler l'ancienneté par lignée.
- **Sièges de coalition = à la formation du gouvernement**, pas le résultat
  électoral brut : ils diffèrent à cause des transfuges et des changements de nom
  entre l'élection et l'investiture (ex. coalition De Wever = N-VA 23 / MR 18 / LE 15
  / Vooruit 13 / CD&V 11 = 80, alors que l'élection 2024 donnait N-VA 24 / MR 20).
- **Gouvernements minoritaires** correctement traités (ex. Michel II après le
  départ de la N-VA = MR 20 / CD&V 18 / Open Vld 14 = 52 ; Wilmès I/II).
- **Tous les gouvernements** sont représentés (pas un par élection) : les
  remaniements en cours de législature figurent dans la frise et la vue Au pouvoir.

---

## 4. Vérification (ce qui a été audité, et comment)

- **Sièges** des 24 élections : recoupés indépendamment Wikipédia (FR/EN) — accord
  sur les 24, écarts résiduels uniquement dus aux conventions de cartels.
- **Compositions des 45 gouvernements** : collectées et **revérifiées par un second
  passage adversarial** (lecture en direct des pages Wikipédia de gouvernement et
  de législature) ; chiffres « à la formation » confirmés.
- **Cohérence sièges/voix** : audit programmatique → **0 parti** avec sièges > 0
  mais 0 % de voix (il y en avait 7 avant correction du mapping et des cartels).

### Points à challenger lors d'un audit
1. Les **parts de cartels** (80/20, 50/50) sont des estimations — vérifier au cas
   par cas si une ventilation officielle existe.
2. Les **années-charnières de scission** sont un choix d'affichage — vérifier
   qu'elles ne sont jamais présentées comme la date politique réelle.
3. Le **dénominateur des voix** (sous-ensemble des partis retenus) — vérifier
   l'écart avec les suffrages valides officiels (blancs/nuls exclus).
4. L'**ancienneté au pouvoir** dépend du graphe de filiation — vérifier que les
   liens (rename/split/merge) sont corrects et qu'aucune double-comptabilisation
   n'a lieu (les périodes chevauchantes d'une même lignée sont fusionnées).
5. La **frise des PM** s'arrête à De Wever (formé 2025-02-03), positionné dans la
   « queue » post-2024 de l'axe — vérifier l'inclusion du dernier gouvernement.

---

## 5. Carte du code

```
my-app/
  src/
    routes/
      +page.svelte           Page : sélecteurs de vue/mesure, assemble les composants
      +layout.svelte/.ts     app.css, polices, prerender statique
    lib/
      Timeline.svelte        Streamgraph (vues « Résultats » et « Au pouvoir (flux) »)
      GovernanceGantt.svelte Vue « Au pouvoir » (Gantt)
      CoalitionHeader.svelte En-tête de coalition partagé (PM, pastilles, ancienneté, lien)
      Legend.svelte          Légende des partis par famille
      Methodology.svelte     Encart dépliable « Comment les données ont été traitées »
      data/
        index.ts             API du modèle : ELECTIONS, GOVERNMENTS, COALITIONS,
                             share(), coalitionOf/Seats(), governingSpells(),
                             yearsInPower(), filiation, etc.
        elections.json       24 élections : par parti, sièges + voix + parts
        governments.json     45 gouvernements : PM, dates, coalition[{id,seats}], wikiUrl, photo
        coalitions.json      coalition (ids de partis) par date d'élection
        parties.ts           ~35 partis canoniques : libellé, couleur, famille, aile + normalisation des libellés bruts
        filiation.json       arêtes de filiation (from, to, year, type)
        pms.json             (hérité) PM par élection
  scripts/
    fetch-api-data.mjs       récupération API IBZ
    build-dataset.mjs        normalisation + fusion sièges/voix + règles de transition + cartels
    build-layout.mjs         couloirs/lignées de mise en page
  static/pm/                 portraits des Premiers ministres (JPG)
  .github/workflows/deploy.yml  build statique + déploiement GitHub Pages
```

### Concepts clés du modèle (`src/lib/data/index.ts`)
- `share(party, metric)` : part de sièges ou de voix [0..1].
- `coalitionOf(gov)` / `coalitionSeats(gov, id)` / `totalCoalitionSeats(gov)` :
  composition vérifiée d'un gouvernement (sièges à la formation).
- `governingSpells()` : périodes continues au pouvoir par parti (fusion des
  gouvernements successifs).
- `yearsInPower(id)` : années cumulées au pouvoir de la **lignée** complète d'un
  parti (suit la filiation, fusionne les chevauchements).
- `govYear(gov)` : année fractionnaire (positionnement temporel des portraits).

---

## 6. Limites assumées
- Sièges et voix proviennent de **deux sources** (Wikipédia / API) avec des
  conventions de cartels et de regroupement légèrement différentes.
- Les sièges par aile issus de cartels sont **estimés**.
- Les dates de scission affichées sont une **convention**, pas la chronologie
  politique exacte.
- Le % de voix est calculé sur un **sous-ensemble** (partis retenus, hors
  blancs/nuls et « autres »).
- Couleurs et filiation suivent une **référence éditoriale** (Timeline of Belgian
  political parties), recoupée mais non « officielle ».
