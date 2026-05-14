"use client";

import { useEffect } from "react";
import { useFocusMode } from "@/stores/focus-mode";

export function AppShellGrid({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const focus = useFocusMode((s) => s.on);
  const toggle = useFocusMode((s) => s.toggle);

  // Cmd-. / Ctrl-. → toggle focus mode (global).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return (
    <div
      className={`grid min-h-screen bg-(--color-cream-1) ${
        focus ? "grid-cols-[0_1fr]" : "grid-cols-[280px_1fr]"
      }`}
    >
      <div className={focus ? "overflow-hidden" : ""} aria-hidden={focus}>
        {focus ? null : sidebar}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
