# MyFitnessBuddy

App Next.js 14 + Postgres pour suivre programme muscu, plan alimentaire et progression.

## Stack
- Next.js 14 (App Router) + TypeScript + Tailwind
- PostgreSQL 18 via Prisma ORM
- Recharts (graphes)

## Démarrage

```bash
npm run dev          # serveur dev → http://localhost:3000
npm run db:push      # synchronise le schéma Prisma avec Postgres
npm run db:seed      # seed catalogue exos + foods + plan de base
npm run db:studio    # GUI Prisma pour explorer la base
```

## Configuration

- **Base** : `sport_suivi` sur `localhost:5433` (user `postgres`)
- **Connexion** : éditable dans `.env` → `DATABASE_URL`

## Pages

| Route | Rôle |
|---|---|
| `/` | Dashboard : poids actuel, TDEE, macros cibles, dernières séances, courbe poids |
| `/seances` | Liste des 3 jours de programme + démarrage de séance |
| `/seances/[1-3]` | Logger une séance (charge / reps / RPE par série, pré-rempli avec la séance précédente) |
| `/historique` | Toutes les séances + graphe progression par exercice |
| `/historique/[id]` | Détail d'une séance |
| `/nutrition` | Plan alimentaire recalculé selon poids + objectif, suivi du poids |
| `/profil` | Édition du profil (âge, taille, poids, TDEE, objectif) avec aperçu macros |

## Standards de calcul macro (Helms / Schoenfeld / Aragon)

| Objectif | Calories | Protéines | Lipides | Glucides |
|---|---|---|---|---|
| Sèche | TDEE − 20% | 2.4 g/kg | 0.8 g/kg | reste |
| Recomp | TDEE | 2.2 g/kg | 0.9 g/kg | reste |
| Prise de masse | TDEE + 10% | 2.0 g/kg | 1.0 g/kg | reste |
| Maintien | TDEE | 2.0 g/kg | 1.0 g/kg | reste |

Les grammages du plan alimentaire sont **automatiquement recalculés** au prorata des cibles macro vs le plan de base, avec arrondis sensibles (5g pour les solides, 10ml pour les liquides, demi-pièce pour les unités).
