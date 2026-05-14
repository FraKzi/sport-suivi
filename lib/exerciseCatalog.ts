// Catalogue d'exercices — source de vérité pour le générateur de programme.
// Utilisé par prisma/seed.ts (upsert dans ExerciseCatalog) et par le
// générateur (lib/programGenerator.ts) pour piocher les exos d'un programme.

import type { ExerciseType, MuscleGroup } from "@prisma/client";

export type CatalogExercise = {
  name: string;
  type: ExerciseType;
  primaryMuscle: MuscleGroup;
  // CSV de muscles travaillés en secondaire — utilisé par le générateur pour
  // compter le volume "spillover" (ex: un développé couché compte aussi un peu
  // pour les triceps).
  secondaryMuscles?: MuscleGroup[];
  isCompound: boolean;
  description?: string;
};

export const EXERCISE_CATALOG: CatalogExercise[] = [
  // ========== CHEST ==========
  {
    name: "Développé couché barre",
    type: "POLY",
    primaryMuscle: "CHEST",
    secondaryMuscles: ["TRICEPS", "SHOULDERS"],
    isCompound: true,
    description: "Bench press medium grip. Base pectorale, charge maximale.",
  },
  {
    name: "Développé incliné haltères",
    type: "POLY",
    primaryMuscle: "CHEST",
    secondaryMuscles: ["TRICEPS", "SHOULDERS"],
    isCompound: true,
    description: "Banc incliné 30°. Met l'accent sur le haut des pectoraux.",
  },
  {
    name: "Développé décliné barre",
    type: "POLY",
    primaryMuscle: "CHEST",
    secondaryMuscles: ["TRICEPS"],
    isCompound: true,
    description: "Banc décliné 15-30°. Cible la partie basse des pectoraux.",
  },
  {
    name: "Dips lestés",
    type: "POLY",
    primaryMuscle: "CHEST",
    secondaryMuscles: ["TRICEPS", "SHOULDERS"],
    isCompound: true,
    description: "Buste penché en avant pour cibler les pectoraux.",
  },
  {
    name: "Écarté à la poulie",
    type: "ISO",
    primaryMuscle: "CHEST",
    isCompound: false,
    description: "Cable fly. Étirement pectoral en tension constante.",
  },
  {
    name: "Écarté incliné haltères",
    type: "ISO",
    primaryMuscle: "CHEST",
    isCompound: false,
    description: "Fly incliné 30°. Étirement maximal des fibres supérieures.",
  },
  {
    name: "Pompes lestées",
    type: "POLY",
    primaryMuscle: "CHEST",
    secondaryMuscles: ["TRICEPS", "SHOULDERS"],
    isCompound: true,
    description: "Pompes avec gilet ou disque sur le dos.",
  },

  // ========== BACK ==========
  {
    name: "Tractions lestées",
    type: "POLY",
    primaryMuscle: "BACK",
    secondaryMuscles: ["BICEPS"],
    isCompound: true,
    description: "Pull-ups avec ceinture lestée. Roi du dos largeur.",
  },
  {
    name: "Tirage vertical poulie",
    type: "POLY",
    primaryMuscle: "BACK",
    secondaryMuscles: ["BICEPS"],
    isCompound: true,
    description: "Lat pulldown prise large. Construit la largeur du dos.",
  },
  {
    name: "Rowing barre",
    type: "POLY",
    primaryMuscle: "BACK",
    secondaryMuscles: ["BICEPS", "SHOULDERS"],
    isCompound: true,
    description: "Barbell row buste à 45°. Épaisseur du dos.",
  },
  {
    name: "Rowing Pendlay",
    type: "POLY",
    primaryMuscle: "BACK",
    secondaryMuscles: ["BICEPS", "SHOULDERS"],
    isCompound: true,
    description: "Barre au sol entre chaque rep. Renforce les lats avec gros stimulus neural.",
  },
  {
    name: "Tirage horizontal buste appuyé",
    type: "POLY",
    primaryMuscle: "BACK",
    secondaryMuscles: ["BICEPS"],
    isCompound: true,
    description: "Rowing avec appui pectoral. Isole le dos sans triche lombaire.",
  },
  {
    name: "Tirage croisé unilatéral",
    type: "ISO",
    primaryMuscle: "BACK",
    isCompound: false,
    description: "Cross body lat pull-around. Étirement maximal du grand dorsal.",
  },
  {
    name: "Soulevé de terre",
    type: "POLY",
    primaryMuscle: "BACK",
    secondaryMuscles: ["HAMSTRINGS", "GLUTES"],
    isCompound: true,
    description: "Deadlift conventionnel. Chaîne postérieure complète, charge maximale.",
  },

  // ========== SHOULDERS ==========
  {
    name: "Développé militaire barre",
    type: "POLY",
    primaryMuscle: "SHOULDERS",
    secondaryMuscles: ["TRICEPS"],
    isCompound: true,
    description: "Overhead press debout. Roi des épaules.",
  },
  {
    name: "Développé haltères épaules",
    type: "POLY",
    primaryMuscle: "SHOULDERS",
    secondaryMuscles: ["TRICEPS"],
    isCompound: true,
    description: "Shoulder press assis avec haltères. Plus d'amplitude qu'à la barre.",
  },
  {
    name: "Élévation latérale",
    type: "ISO",
    primaryMuscle: "SHOULDERS",
    isCompound: false,
    description: "Cible directement le deltoïde latéral. Reste léger, focus sur la qualité.",
  },
  {
    name: "Écarté inversé poulie",
    type: "ISO",
    primaryMuscle: "SHOULDERS",
    isCompound: false,
    description: "Cible les deltoïdes postérieurs, santé scapulaire.",
  },
  {
    name: "Face pull poulie",
    type: "ISO",
    primaryMuscle: "SHOULDERS",
    isCompound: false,
    description: "Tire vers le front. Santé d'épaule + rear delts.",
  },
  {
    name: "Élévation frontale haltères",
    type: "ISO",
    primaryMuscle: "SHOULDERS",
    isCompound: false,
    description: "Front raise. Cible le deltoïde antérieur (souvent déjà bien stimulé par le bench).",
  },

  // ========== BICEPS ==========
  {
    name: "Curl biceps barre",
    type: "ISO",
    primaryMuscle: "BICEPS",
    isCompound: false,
    description: "Barbell curl. Charge maximale pour le biceps.",
  },
  {
    name: "Curl biceps haltères",
    type: "ISO",
    primaryMuscle: "BICEPS",
    isCompound: false,
    description: "Curl alterné ou simultané. Permet la supination.",
  },
  {
    name: "Curl biceps poulie",
    type: "ISO",
    primaryMuscle: "BICEPS",
    isCompound: false,
    description: "Tension constante grâce au câble.",
  },
  {
    name: "Curl marteau",
    type: "ISO",
    primaryMuscle: "BICEPS",
    isCompound: false,
    description: "Hammer curl. Travaille brachial + brachioradial.",
  },
  {
    name: "Curl incliné haltères",
    type: "ISO",
    primaryMuscle: "BICEPS",
    isCompound: false,
    description: "Incline curl 45°. Étirement maximal du biceps long.",
  },
  {
    name: "Curl prédicateur",
    type: "ISO",
    primaryMuscle: "BICEPS",
    isCompound: false,
    description: "Preacher curl. Isolation pure, pic de tension en bas.",
  },

  // ========== TRICEPS ==========
  {
    name: "Extension triceps poulie",
    type: "ISO",
    primaryMuscle: "TRICEPS",
    isCompound: false,
    description: "Pushdown câble corde ou barre. Coudes fixes près du corps.",
  },
  {
    name: "Extension triceps couché barre",
    type: "ISO",
    primaryMuscle: "TRICEPS",
    isCompound: false,
    description: "Skull crusher. Étirement long du triceps.",
  },
  {
    name: "Extension verticale haltère",
    type: "ISO",
    primaryMuscle: "TRICEPS",
    isCompound: false,
    description: "Overhead extension. Étirement maximal du chef long.",
  },
  {
    name: "Dips triceps",
    type: "POLY",
    primaryMuscle: "TRICEPS",
    secondaryMuscles: ["CHEST", "SHOULDERS"],
    isCompound: true,
    description: "Buste droit (vs. dips pec). Cible le triceps en compound.",
  },
  {
    name: "Pompes serrées",
    type: "POLY",
    primaryMuscle: "TRICEPS",
    secondaryMuscles: ["CHEST"],
    isCompound: true,
    description: "Mains rapprochées. Triceps en compound.",
  },

  // ========== QUADS ==========
  {
    name: "Squat barre",
    type: "POLY",
    primaryMuscle: "QUADS",
    secondaryMuscles: ["GLUTES", "HAMSTRINGS"],
    isCompound: true,
    description: "Back squat profond. Roi des quadriceps.",
  },
  {
    name: "Squat avant",
    type: "POLY",
    primaryMuscle: "QUADS",
    secondaryMuscles: ["GLUTES"],
    isCompound: true,
    description: "Front squat. Plus de quadriceps, moins de stress lombaire.",
  },
  {
    name: "Presse à cuisses",
    type: "POLY",
    primaryMuscle: "QUADS",
    secondaryMuscles: ["GLUTES", "HAMSTRINGS"],
    isCompound: true,
    description: "Leg press. Charge importante sans stress sur le dos.",
  },
  {
    name: "Fentes haltères",
    type: "POLY",
    primaryMuscle: "QUADS",
    secondaryMuscles: ["GLUTES"],
    isCompound: true,
    description: "Walking lunges. Unilateral, équilibre + force.",
  },
  {
    name: "Hack squat",
    type: "POLY",
    primaryMuscle: "QUADS",
    secondaryMuscles: ["GLUTES"],
    isCompound: true,
    description: "Hack squat machine. Quadriceps avec posture stabilisée.",
  },
  {
    name: "Bulgarian split squat",
    type: "POLY",
    primaryMuscle: "QUADS",
    secondaryMuscles: ["GLUTES"],
    isCompound: true,
    description: "Pied arrière surélevé. Travail unilateral intense.",
  },
  {
    name: "Leg extension",
    type: "ISO",
    primaryMuscle: "QUADS",
    isCompound: false,
    description: "Quad extension machine. Isolation pure.",
  },

  // ========== HAMSTRINGS ==========
  {
    name: "Soulevé de terre roumain",
    type: "POLY",
    primaryMuscle: "HAMSTRINGS",
    secondaryMuscles: ["GLUTES", "BACK"],
    isCompound: true,
    description: "RDL. Focus ischios étirés, charnière de hanche.",
  },
  {
    name: "Soulevé de terre jambes tendues",
    type: "POLY",
    primaryMuscle: "HAMSTRINGS",
    secondaryMuscles: ["GLUTES"],
    isCompound: true,
    description: "Stiff-leg deadlift. Étirement maximal des ischios.",
  },
  {
    name: "Leg curl",
    type: "ISO",
    primaryMuscle: "HAMSTRINGS",
    isCompound: false,
    description: "Couché ou assis selon machine. Pic de tension en flexion complète.",
  },
  {
    name: "Good morning",
    type: "POLY",
    primaryMuscle: "HAMSTRINGS",
    secondaryMuscles: ["GLUTES", "BACK"],
    isCompound: true,
    description: "Barre sur les épaules, charnière de hanche.",
  },
  {
    name: "Nordic curl",
    type: "ISO",
    primaryMuscle: "HAMSTRINGS",
    isCompound: false,
    description: "Genoux fixés, descente excentrique contrôlée. Brutal.",
  },

  // ========== GLUTES ==========
  {
    name: "Hip thrust",
    type: "POLY",
    primaryMuscle: "GLUTES",
    secondaryMuscles: ["HAMSTRINGS"],
    isCompound: true,
    description: "Barbell hip thrust. Roi des fessiers.",
  },
  {
    name: "Pont fessier au sol",
    type: "ISO",
    primaryMuscle: "GLUTES",
    isCompound: false,
    description: "Glute bridge. Version sans matériel, ou avec disque.",
  },
  {
    name: "Kickback poulie",
    type: "ISO",
    primaryMuscle: "GLUTES",
    isCompound: false,
    description: "Cable kickback. Isolation unilateral du fessier.",
  },
  {
    name: "Cable pull-through",
    type: "POLY",
    primaryMuscle: "GLUTES",
    secondaryMuscles: ["HAMSTRINGS"],
    isCompound: true,
    description: "Pull-through câble entre les jambes. Charnière de hanche en sécurité.",
  },

  // ========== CALVES ==========
  {
    name: "Mollet debout machine",
    type: "ISO",
    primaryMuscle: "CALVES",
    isCompound: false,
    description: "Standing calf raise. Cible le gastrocnémien.",
  },
  {
    name: "Mollet assis machine",
    type: "ISO",
    primaryMuscle: "CALVES",
    isCompound: false,
    description: "Seated calf raise. Cible le soléaire (genou fléchi).",
  },
  {
    name: "Mollet à la presse",
    type: "ISO",
    primaryMuscle: "CALVES",
    isCompound: false,
    description: "Pousser sur la pointe des pieds à la presse. Bonne charge.",
  },

  // ========== ABS ==========
  {
    name: "Crunch poulie",
    type: "ISO",
    primaryMuscle: "ABS",
    isCompound: false,
    description: "Cable crunch à genoux. Charge progressive sur les abdos.",
  },
  {
    name: "Roll-out abdos",
    type: "ISO",
    primaryMuscle: "ABS",
    isCompound: false,
    description: "Ab wheel rollout. Gainage dynamique.",
  },
  {
    name: "Hanging leg raise",
    type: "ISO",
    primaryMuscle: "ABS",
    isCompound: false,
    description: "Relevés de jambes suspendu. Cible le bas des abdos.",
  },
  {
    name: "Plank lesté",
    type: "ISO",
    primaryMuscle: "ABS",
    isCompound: false,
    description: "Gainage statique. Tenir en secondes (60-120s).",
  },
];
