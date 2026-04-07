# Spec : Editeur d'accords

> Feature centrale de Fenua Chords — la qualite de cet editeur determine l'adoption de la plateforme.

---

## Probleme

Contribuer des accords de chansons polynesiens est aujourd'hui penible. Les musiciens tapent dans des Google Docs ou des notes, galerent a aligner les accords au-dessus des paroles, et le resultat est difficilement partageable. Sur mobile (le device principal en soiree), taper des crochets `[Am]` ou gerer des espaces pour l'alignement est quasi impossible. Il n'existe aucun outil adapte aux chants polynesiens (bringues, himene) — Ultimate Guitar couvre principalement le repertoire anglo-saxon.

**Impact si non resolu** : sans editeur simple, personne ne contribue, et la plateforme reste vide.

---

## Goals

1. Un utilisateur peut soumettre une fiche accords complete en moins de 5 minutes depuis son telephone
2. Zero syntaxe a apprendre pour le mode par defaut (tap-to-chord)
3. Les power users ont un mode texte rapide (ChordPro)
4. Le format de stockage est unique (ChordPro) quel que soit le mode de saisie
5. La transposition fonctionne sur toutes les fiches sans modification du contenu stocke

## Non-Goals

1. **Editeur WYSIWYG riche** (contentEditable avance, drag & drop de blocs) — trop complexe pour un solo dev, source de bugs mobile
2. **Detection automatique des accords depuis audio/YouTube** — feature separee, necessite ML, hors scope MVP
3. **Mode collaboratif temps reel** (edition a plusieurs) — pas de besoin identifie, sur-ingenierie
4. **Support tablatures** (TAB guitare chiffree) — format different, a considerer en V2 si demande
5. **Import depuis d'autres formats** (PDF, images) — V2, necessite OCR

---

## Users cibles

**Contributeur occasionnel** : musicien polynesien qui connait les accords d'une chanson et veut les partager. Utilise son telephone. Ne connait pas le format ChordPro. Veut que ca prenne 5 minutes max.

**Contributeur regulier** : musicien qui contribue souvent, a l'aise avec la saisie texte, prefere la vitesse. Peut etre sur desktop.

---

## User Stories

### Contributeur occasionnel

- En tant que musicien, je veux coller ou taper les paroles d'une chanson sans me soucier des accords d'abord, pour ne pas melanger les deux taches
- En tant que musicien sur mobile, je veux taper sur un mot pour y placer un accord depuis une grille de boutons, pour ne pas avoir a taper de syntaxe
- En tant que musicien, je veux voir une preview en temps reel de ma fiche (accords au-dessus des paroles), pour verifier que c'est correct avant de soumettre
- En tant que musicien, je veux que les accords que j'utilise le plus souvent apparaissent en premier dans le picker, pour aller plus vite
- En tant que musicien, je veux pouvoir supprimer ou changer un accord deja place en retapant sur le mot, pour corriger mes erreurs facilement
- En tant que musicien, je veux selectionner l'instrument (guitare, ukulele, basse), le capo et le tuning, pour que ma fiche soit precise

### Contributeur regulier

- En tant que contributeur regulier, je veux un mode texte ou je tape directement en ChordPro (`[Am]paroles`), pour aller plus vite qu'avec le picker
- En tant que contributeur regulier, je veux pouvoir switcher entre le mode visuel et le mode texte sans perdre mon travail, pour utiliser le mode le plus adapte a chaque moment
- En tant que contributeur regulier, je veux coller une fiche ChordPro existante (copiee d'ailleurs) et qu'elle soit reconnue, pour ne pas tout retaper

### Tous les users

- En tant qu'utilisateur, je veux que la fiche soumise soit visible sur la page de la chanson avec mon nom, pour que ma contribution soit reconnue
- En tant qu'utilisateur, je veux pouvoir editer une fiche que j'ai soumise, pour corriger des erreurs apres coup

---

## Fonctionnement detaille

### Format de stockage : ChordPro

Toutes les fiches sont stockees en ChordPro dans la colonne `chord_sheets.content` :

```
[Am]Ia ora na [G]te here [C]nei
[F]Tatou e [G]haere [Am]mai
```

Ce format est la source de verite. Les deux modes d'edition sont des interfaces differentes qui lisent et ecrivent ce meme format.

### Mode 1 : Tap-to-chord (mode par defaut, mobile-first)

**Etape 1 — Saisie des paroles**

L'utilisateur voit un `<textarea>` plein largeur avec le placeholder "Colle ou tape les paroles ici...". Il entre les paroles brutes, sans accords. Un bouton "Etape suivante" passe au placement.

```
Ia ora na te here nei
Tatou e haere mai
```

**Etape 2 — Placement des accords**

Les paroles s'affichent en mode lecture. Chaque mot est un `<span>` tappable. Quand l'utilisateur tape sur un mot :

1. Un popover/bottom-sheet apparait avec le **picker d'accords**
2. L'utilisateur tape sur l'accord voulu
3. L'accord s'affiche au-dessus du mot
4. Le popover se ferme

Si un accord est deja place sur un mot et que l'utilisateur tape dessus :
- Tap sur l'accord → ouvre le picker pour changer
- Bouton "X" ou swipe → supprime l'accord

**Le picker d'accords**

Organisation du picker :

```
┌─────────────────────────────────────┐
│  Recents: Am  G  C  F              │
│─────────────────────────────────────│
│  Am  A   Bm  B   Cm  C   Dm  D    │
│  Em  E   Fm  F   Gm  G            │
│─────────────────────────────────────│
│  [ Accord custom: _______ ]  [OK]  │
└─────────────────────────────────────┘
```

- **Ligne 1 — Recents** : les 4-6 derniers accords utilises dans cette fiche (persiste pendant la session d'edition)
- **Grille principale** : accords majeurs et mineurs, les plus courants dans la musique polynesienne
- **Champ custom** : pour les accords exotiques (Bbm7, F#dim, etc.)

V2 possible : suggestion intelligente basee sur la tonalite detectee.

**Etape 3 — Preview et soumission**

Un toggle "Preview" affiche le rendu final (accords au-dessus des paroles). L'utilisateur verifie, remplit les metadonnees (instrument, capo, tuning), et soumet.

### Mode 2 : Texte ChordPro (mode avance)

Un `<textarea>` unique ou l'utilisateur tape directement en ChordPro. Un panneau preview en dessous se met a jour en temps reel.

```
┌──────────────────────────────┐
│ [Am]Ia ora na [G]te here [C] │
│ nei                          │
│ [F]Tatou e [G]haere [Am]mai  │
├──────────────────────────────┤
│  Am        G       C        │
│  Ia ora na te here nei      │
│  F      G     Am            │
│  Tatou e haere mai          │
└──────────────────────────────┘
```

Un helper permanent au-dessus du textarea : "Place tes accords entre crochets : `[Am]paroles`"

### Switch entre modes

Un toggle "Mode simple / Mode texte" en haut de l'editeur. Le switch est non-destructif :

- Simple → Texte : on serialise le mapping `{ wordIndex: chord }` en ChordPro
- Texte → Simple : on parse le ChordPro en mapping mot/accord

**Cas limite** : si le ChordPro contient des accords places entre deux mots (pas au debut d'un mot), le switch vers le mode simple attache l'accord au mot suivant. Une notification informe l'utilisateur si des ajustements ont ete faits.

---

## Rendu des accords (lecture)

Le rendu sur la fiche chanson publique :

Chaque segment `[Chord]texte` est rendu comme :

```html
<span class="chord-segment">
  <span class="chord-label">Am</span>
  <span class="chord-text">Ia ora na </span>
</span>
```

CSS :

```css
.chord-segment {
  display: inline-block;
  position: relative;
  padding-top: 1.4em;
}
.chord-label {
  position: absolute;
  top: 0;
  left: 0;
  font-weight: bold;
  color: var(--color-chord);
  font-size: 0.85em;
  white-space: nowrap;
}
```

Cela donne un affichage propre avec les accords au-dessus, quel que soit la largeur de l'ecran. Le texte wrap naturellement.

---

## Transposition

La transposition opere sur le ChordPro stocke, cote client uniquement (pas de modification en DB).

Algorithme :
1. Parser tous les `[...]` du contenu
2. Pour chaque accord, identifier la note racine et le suffixe (ex: `Bbm7` → racine `Bb`, suffixe `m7`)
3. Transposer la racine selon l'intervalle demande
4. Reconstruire le ChordPro avec les nouvelles racines

La tonalite cible est selectionnee via un selecteur simple : `< C# | D | D# >` (fleches gauche/droite ou dropdown).

La transposition ne modifie pas `chord_sheets.content` — elle est appliquee a la volee au rendu.

---

## Requirements

### Must-Have (P0)

| # | Requirement | Criteres d'acceptation |
|---|-------------|----------------------|
| 1 | Mode tap-to-chord avec picker | L'utilisateur peut placer un accord sur n'importe quel mot en 2 taps (tap mot + tap accord) |
| 2 | Mode texte ChordPro | Un textarea avec preview live. Le ChordPro colle est correctement parse et rendu |
| 3 | Switch entre modes sans perte | Le contenu est preserve lors du switch. Un aller-retour simple → texte → simple ne perd aucun accord |
| 4 | Rendu accords au-dessus des paroles | Sur la fiche publique, les accords s'affichent au-dessus des mots correspondants, responsive mobile |
| 5 | Metadonnees de la fiche | Selection instrument (guitare/ukulele/basse/ukulele-bass), capo (0-12), tuning libre |
| 6 | Sauvegarde en ChordPro | Le contenu est stocke en ChordPro dans `chord_sheets.content`, quel que soit le mode utilise |
| 7 | Transposition cote client | L'utilisateur peut transposer tous les accords d'une fiche en un clic, sans modifier la DB |
| 8 | Edition post-soumission | L'auteur peut editer sa propre fiche apres soumission |

### Nice-to-Have (P1)

| # | Requirement | Criteres d'acceptation |
|---|-------------|----------------------|
| 9 | Accords recents dans le picker | Les 4-6 derniers accords utilises apparaissent en haut du picker |
| 10 | Validation avant soumission | Warning si la fiche ne contient aucun accord, ou si des lignes n'ont pas d'accords |
| 11 | Auto-save draft | Le brouillon est sauvegarde en local (state React) pour eviter la perte en cas de navigation accidentelle |
| 12 | Raccourcis clavier (desktop) | Sur desktop, raccourcis pour inserer rapidement des crochets et naviguer |

### Future (P2)

| # | Requirement | Notes |
|---|-------------|-------|
| 13 | Suggestion d'accords par tonalite | Le picker propose en priorite les accords de la tonalite detectee |
| 14 | Import copier-coller depuis UG | Detection et conversion automatique du format "accords sur ligne separee" |
| 15 | Mode collaboratif | Suggestion d'edit sur la fiche d'un autre user (type PR) |

---

## Modele de donnees

```sql
chord_sheets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id     uuid REFERENCES songs(id) NOT NULL,
  instrument  text NOT NULL CHECK (instrument IN ('guitare','ukulele','basse','ukulele-bass')),
  tuning      text,                          -- ex: "Standard", "Open G", "Low G"
  capo        smallint DEFAULT 0,            -- 0-12
  content     text NOT NULL,                 -- ChordPro format
  contributed_by uuid REFERENCES profiles(id) NOT NULL,
  votes_up    int DEFAULT 0,
  votes_down  int DEFAULT 0,
  is_official boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
)
```

Le champ `content` est la seule source de verite. Exemple de valeur :

```
[Am]Ia ora na [G]te here [C]nei\n[F]Tatou e [G]haere [Am]mai
```

---

## Structure composants (suggestion)

```
src/components/chord-editor/
  ChordEditor.tsx          # Container, gere le mode (simple/texte) et le state
  TapToChord.tsx           # Mode visuel : paroles + tap pour placer accords
  ChordProTextarea.tsx     # Mode texte : textarea + preview
  ChordPicker.tsx          # Popover/bottom-sheet avec la grille d'accords
  ChordPreview.tsx         # Rendu lecture (accords au-dessus des paroles)
  useChordPro.ts           # Hook : parse/serialize ChordPro ↔ mapping mot/accord
  useTranspose.ts          # Hook : transposition d'accords
```

---

## Metriques de succes

| Metrique | Cible | Mesure |
|----------|-------|--------|
| Temps moyen de contribution | < 5 min | Timestamp creation → soumission |
| Taux de completion | > 70% des editeurs ouverts aboutissent a une soumission | Ratio open/submit |
| Mode utilise | > 80% utilisent tap-to-chord | Log du mode a la soumission |
| Fiches avec erreurs signalees | < 10% recoivent un vote down dans les 24h | Ratio votes down / fiches nouvelles |

---

## Questions ouvertes

| Question | Qui | Bloquant |
|----------|-----|----------|
| Faut-il moderer les fiches avant publication ou publier directement + signalement ? | Product (Maitoa) | Non — publier direct en V1, ajouter moderation si abus |
| Le picker doit-il etre un popover (desktop) ou un bottom-sheet (mobile) ? | Design | Non — bottom-sheet partout en V1 (mobile-first) |
| Gestion des paroles avec des caracteres speciaux tahitiens (macrons, glottal stops) ? | Engineering | Oui — verifier que le parsing ChordPro gere correctement l'UTF-8 et les diacritiques |
