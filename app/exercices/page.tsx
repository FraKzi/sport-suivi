import { redirect } from "next/navigation";

// Page legacy : l'éditeur d'exercices vit maintenant dans /profil/programme.
export default function ExercicesPage() {
  redirect("/profil/programme");
}
