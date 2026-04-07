# Fenua Chords — Fonctionnalites (version finale)

> Plateforme communautaire pour partager les accords de chants polynesiens.
> Inspirations : Ultimate Guitar (contribution) + Chordify (experience ecoute).

---

## 1. Authentification

Connexion par magic link (email via Supabase Auth). Pas de mot de passe. Profil utilisateur avec username, avatar et bio. Deconnexion simple.

## 2. Catalogue chansons

Fiche chanson avec titre, artiste, style (bringue, himene, variete, traditionnel, autre), tonalite originale, BPM optionnel, et lien YouTube embed. Pages SSR/ISR pour le SEO. URL propres avec slugs (`/artiste/titre`).

## 3. Fiches accords (Chord Sheets)

Affichage plain-text style Ultimate Guitar avec accords au-dessus des paroles. Support multi-instruments : guitare, ukulele, basse, ukulele-bass. Indication du tuning et du capo. Plusieurs versions par chanson, classees par votes.

## 4. Transposition automatique

Changement de tonalite en un clic. Tous les accords de la fiche se transposent en temps reel. Selection de la tonalite cible via un selecteur simple.

## 5. Contribution utilisateur

Tout utilisateur connecte peut soumettre une nouvelle fiche accords pour une chanson existante ou creer une nouvelle chanson. Formulaire de saisie plain-text avec preview en temps reel. Statut draft/published pour les chansons.

## 6. Systeme de votes

Vote up/down sur chaque fiche accords. Un vote par utilisateur par fiche. La meilleure version remonte en premier. Affichage du score net.

## 7. Recherche

Recherche par titre de chanson ou nom d'artiste. Filtres par style et instrument. Resultats instantanes.

## 8. Favoris

Ajout/retrait de chansons en favoris. Page "Mes favoris" pour retrouver ses chansons rapidement.

## 9. Playlists (soirees)

Creation de playlists personnelles pour organiser ses soirees. Drag & drop pour reordonner les chansons. Trois niveaux de visibilite : privee, partagee par lien, publique. Lien de partage unique pour envoyer a ses potes.

## 10. Pages artistes

Fiche artiste avec nom, origine, bio. Liste de toutes les chansons associees. URL propres avec slugs.

## 11. Mobile-first

Interface optimisee pour l'usage sur telephone en soiree. Navigation simple, texte lisible, scroll vertical sur les fiches accords. Mode sombre envisageable pour le confort nocturne.

---

## Stack technique

Next.js 16 App Router, TypeScript strict, Supabase (Postgres + Auth + RLS + Storage), Tailwind CSS v4, deploye sur Vercel.

## Securite

Row Level Security (RLS) au niveau Supabase pour toutes les tables. Pas de logique d'autorisation cote client uniquement.
