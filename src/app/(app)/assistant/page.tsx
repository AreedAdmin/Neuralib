import { redirect } from "next/navigation";
import { createThread } from "@/lib/actions/threads";
import { listThreads } from "@/lib/db/threads";

/**
 * Routes the user into a thread. If they have any threads, jump into the most
 * recent. Otherwise create a fresh one and redirect there. Thread list itself
 * lives in the sidebar.
 */
export default async function AssistantIndexPage() {
  const threads = await listThreads();
  if (threads.length > 0) {
    redirect(`/assistant/${threads[0].id}`);
  }
  const created = await createThread();
  if (!created.ok) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-(--color-ink)">
          Couldn&apos;t start a thread.
        </h1>
        <p className="text-sm text-(--color-ink-muted)">{created.error}</p>
      </main>
    );
  }
  redirect(`/assistant/${created.value.id}`);
}
