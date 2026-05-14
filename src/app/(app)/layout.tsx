import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { CommandPalette } from "@/components/search/CommandPalette";
import { AppShellGrid } from "@/components/shell/AppShellGrid";
import { Sidebar } from "@/components/shell/Sidebar";
import { listCompositions } from "@/lib/db/compositions";
import { listSubjects, buildSubjectTree } from "@/lib/db/subjects";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [subjects, compositions] = await Promise.all([
    listSubjects(),
    listCompositions(),
  ]);
  const tree = buildSubjectTree(subjects);

  return (
    <>
      <AppShellGrid
        sidebar={
          <Sidebar
            email={user.email ?? ""}
            tree={tree}
            compositions={compositions.map((c) => ({
              id: c.id,
              title: c.title,
              kind: c.kind,
            }))}
          />
        }
      >
        {children}
      </AppShellGrid>
      <CommandPalette />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--color-cream-2)",
            color: "var(--color-ink)",
            border: "1px solid var(--color-edge)",
          },
        }}
      />
    </>
  );
}
