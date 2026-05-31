"use client";

import { useState } from "react";
import { Lock, Mail } from "lucide-react";
import { NeurolibLogo } from "@/components/shell/NeurolibLogo";
import { signIn, signUp } from "./actions";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const result =
      mode === "signin"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password);

    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }

    // Full reload so middleware picks up the freshly set session cookie.
    window.location.assign("/");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-(--color-coral)">
          <NeurolibLogo className="size-6" /> Neurolib
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-(--color-ink)">
          {mode === "signin" ? "Sign in to your library." : "Create your library."}
        </h1>
        <p className="text-(--color-ink-muted)">
          {mode === "signin"
            ? "Use your email and password."
            : "Pick an email and password to get started."}
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-(--radius-md) border border-(--color-edge) bg-(--color-cream-2) p-6 shadow-(--shadow-soft)"
      >
        <label htmlFor="email" className="flex flex-col gap-2">
          <span className="text-sm font-medium text-(--color-ink)">Email</span>
          <span className="relative">
            <Mail
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-(--color-ink-muted)"
              aria-hidden
            />
            <input
              id="email"
              name="email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-(--radius-sm) border border-(--color-edge) bg-(--color-cream-1) py-2 pl-9 pr-3 text-(--color-ink) outline-none focus:border-(--color-coral) focus:ring-2 focus:ring-(--color-coral-soft)"
            />
          </span>
        </label>

        <label htmlFor="password" className="flex flex-col gap-2">
          <span className="text-sm font-medium text-(--color-ink)">Password</span>
          <span className="relative">
            <Lock
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-(--color-ink-muted)"
              aria-hidden
            />
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-(--radius-sm) border border-(--color-edge) bg-(--color-cream-1) py-2 pl-9 pr-3 text-(--color-ink) outline-none focus:border-(--color-coral) focus:ring-2 focus:ring-(--color-coral-soft)"
            />
          </span>
        </label>

        <button
          type="submit"
          disabled={pending}
          className="rounded-(--radius-sm) bg-(--color-coral) px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[color-mix(in_oklab,var(--color-coral),black_8%)] disabled:opacity-50"
        >
          {pending
            ? mode === "signin"
              ? "Signing in…"
              : "Creating account…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>

        {error ? (
          <p
            role="alert"
            className="rounded-(--radius-sm) bg-[color-mix(in_oklab,var(--color-warning),white_70%)] px-3 py-2 text-sm text-(--color-ink)"
          >
            {error}
          </p>
        ) : null}
      </form>

      <p className="text-center text-sm text-(--color-ink-muted)">
        {mode === "signin" ? "Need an account?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="font-medium text-(--color-coral) hover:underline"
        >
          {mode === "signin" ? "Create one" : "Sign in"}
        </button>
      </p>
    </main>
  );
}
