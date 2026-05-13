"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { createCard } from "@/lib/actions/cards";

export function NewCardButton({ subjectId }: { subjectId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    const title = window.prompt("New card title:");
    if (!title) return;
    startTransition(async () => {
      const res = await createCard({ subjectId, title });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Created "${title.trim()}".`);
      router.push(`/c/${res.value.id}/edit`);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="flex items-center gap-2 rounded-(--radius-sm) bg-(--color-coral) px-3 py-2 text-sm font-semibold text-white transition hover:bg-[color-mix(in_oklab,var(--color-coral),black_8%)] disabled:opacity-50"
    >
      <Plus className="size-4" />
      New card
    </button>
  );
}
