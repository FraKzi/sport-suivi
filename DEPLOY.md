# Déploiement sur Vercel

## Prérequis
- Compte GitHub (privé OK)
- Compte Vercel (login avec GitHub)
- Base Neon déjà configurée et seedée ✅

## Étapes

### 1. Pousser le code sur GitHub

```powershell
cd C:\Users\lucas\Desktop\sport-suivi
git init
git add .
git commit -m "Initial: sport-suivi app"
# Crée un repo PRIVÉ sur https://github.com/new (nom: sport-suivi)
git remote add origin https://github.com/<ton-username>/sport-suivi.git
git branch -M main
git push -u origin main
```

⚠️ Le `.env` est dans `.gitignore` → ta DATABASE_URL ne fuite pas sur GitHub.

### 2. Importer sur Vercel

1. Va sur https://vercel.com/new
2. Sélectionne ton repo `sport-suivi`
3. Framework auto-détecté : **Next.js** ✓
4. Avant de cliquer Deploy, ajoute la variable d'environnement :
   - `DATABASE_URL` = `postgresql://neondb_owner:npg_wadEzQXxMm96@ep-frosty-poetry-alrohnem.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require`
5. Clique **Deploy**

Vercel build + déploie en ~1 min. Tu obtiens une URL du genre `https://sport-suivi-xxx.vercel.app`.

### 3. Installer sur ton téléphone

**iPhone (Safari)** :
1. Ouvre l'URL Vercel dans Safari
2. Bouton "Partager" → "Sur l'écran d'accueil"
3. L'icône MyFitnessBuddy apparaît, l'app s'ouvre en plein écran

**Android (Chrome)** :
1. Ouvre l'URL dans Chrome
2. Menu ⋮ → "Installer l'application" (ou prompt automatique)

### 4. Mettre à jour ensuite

À chaque `git push` sur `main`, Vercel redéploie automatiquement.

```powershell
git add .
git commit -m "ajout fonctionnalité X"
git push
```

## Notes Neon + Vercel

- Neon **met en pause** les bases inactives gratuites au bout de 5 min → la 1ʳᵉ requête après pause prend ~1s. Activité normale ensuite.
- Si tu vois des warnings de connexions Prisma sur Vercel, ajoute `?sslmode=require&pgbouncer=true&connection_limit=1` à la fin de `DATABASE_URL` côté Vercel (laisse l'URL locale telle quelle).

## Mode dev local

Le `.env` continue de pointer sur Neon → `npm run dev` lit/écrit la même base que la prod. Tu peux travailler depuis ton PC ou ton téléphone, c'est synchronisé.
