"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function DeleteSessionButton({ id }: { id: number }) {
  const router = useRouter();
  async function onDelete() {
    if (!confirm("Supprimer cette séance ?")) return;
    const res = await fetch(`/api/workouts/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/historique");
  }
  return (
    <Button variant="danger" onClick={onDelete}>
      Supprimer
    </Button>
  );
}
