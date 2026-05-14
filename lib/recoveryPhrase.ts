import crypto from "crypto";

/**
 * Liste de 128 mots simples (sans accents, sans ambiguïté) pour générer
 * une phrase de récupération à 6 mots ≈ 2^42 entropie. Combiné au coût bcrypt
 * de la vérif côté serveur, c'est largement infaisable à brute-forcer.
 */
const WORDS = [
  "ananas", "arbre", "argent", "aigle", "abeille", "amour", "automne", "azur",
  "ballon", "banane", "bleu", "bouteille", "bras", "blanc", "bambou", "boussole",
  "cactus", "chat", "chemin", "ciel", "citron", "coeur", "courage", "cuivre",
  "danse", "dauphin", "diamant", "doux", "douche", "doigt", "drapeau", "droite",
  "ecole", "eclair", "eclat", "epaule", "epee", "etoile", "europe", "ete",
  "feu", "ferme", "fleur", "foret", "fontaine", "fraise", "froid", "fumee",
  "galet", "gazon", "givre", "glace", "grenat", "guepe", "guitare", "graine",
  "harpe", "hibou", "hiver", "honneur", "huile", "humain", "horizon", "humble",
  "iceberg", "ile", "indigo", "ivoire", "jardin", "jaune", "joie", "joker",
  "kayak", "kiwi", "lapin", "lampe", "lavande", "lierre", "lion", "livre",
  "lune", "lumiere", "magie", "main", "marbre", "matin", "mer", "miel",
  "miroir", "montagne", "musique", "nappe", "neige", "nuage", "ocean", "olive",
  "ombre", "or", "orage", "outil", "paix", "papillon", "perle", "pinceau",
  "plage", "pluie", "pomme", "ponton", "porte", "renard", "rivage", "riviere",
  "rocher", "rose", "rouge", "rubis", "ruche", "ruisseau", "sable", "sapin",
  "soleil", "songe", "souris", "tasse", "tempete", "tigre", "tour", "trefle",
];

if (WORDS.length !== 128) {
  // Garde-fou : éviter qu'une édition réduise l'entropie sans s'en rendre compte
  throw new Error(`Wordlist must contain exactly 128 entries, got ${WORDS.length}`);
}

/** Génère une phrase de 6 mots séparés par des espaces. */
export function generateRecoveryPhrase(): string {
  const out: string[] = [];
  for (let i = 0; i < 6; i++) {
    // crypto.randomInt est uniforme sur [0, max[
    out.push(WORDS[crypto.randomInt(0, WORDS.length)]);
  }
  return out.join(" ");
}

/** Normalise (lowercase, trim, collapse spaces) pour permettre les saisies bruyantes. */
export function normalizeRecoveryPhrase(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}
