# Doc Audit Plan — Fenua Chords

**Date** : 2026-04-08
**Source** : doc-coherence-audit (85 commits analysés)

---

## Fichiers à modifier

### 1. `README.md` — ÉLEVÉ [APPLIQUÉ] 2026-04-08
- [DELETE] Contenu create-next-app par défaut
- [MERGE] Réécrire avec description réelle du projet
- Réduction : ~100% remplacement

### 2. `CLAUDE.md` § Schema DB (L.25-31) — MOYEN [APPLIQUÉ] 2026-04-08
- [MERGE] Ajouter `playlist_follows` à la liste des tables
- [MERGE] Ajouter enums manquants : `UserRole`, `SongStatus`, `VoteValue`

### 3. `CLAUDE.md` § Architecture (L.14-21) — MOYEN [APPLIQUÉ] 2026-04-08
- [MERGE] Enrichir arbre `src/` avec routes admin, playlists, profil, mes-contributions
- [MERGE] Ajouter mention des composants chord-editor et ui (shadcn)

### 4. `CLAUDE.md` § Règles (L.34-39) — MOYEN [APPLIQUÉ] 2026-04-08
- [MERGE] Ajouter mentions sécurité : Zod validation, Turnstile captcha, rate limiting, admin/ban system

### 5. `docs/superpowers/specs/2026-04-08-playlists-design.md` § Composants (L.66-74) — MOYEN [APPLIQUÉ] 2026-04-08
- [MERGE] `PlaylistPublicView` → `PlaylistPublicClient`
- [MERGE] `PlaylistReader` → `PlaylistReaderClient`
- [DELETE] `PlaylistQuotaBanner` marqué non implémenté

---

## Fichiers à créer

Aucun fichier doc supplémentaire à créer (projet léger, `CLAUDE.md` suffit comme référence unique).

---

## Ordre d'application

1. CLAUDE.md (3 sections, risque MOYEN)
2. playlists-design.md (risque MOYEN)
3. README.md (risque ÉLEVÉ)
