import { Mail } from "lucide-react";
import { NeurolibLogo } from "@/components/shell/NeurolibLogo";
import { sendMagicLink } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-(--color-coral)">
          <NeurolibLogo className="size-6" /> Neurolib
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-(--color-ink)">
          Sign in to your library.
        </h1>
        <p className="text-(--color-ink-muted)">
          A magic link will arrive in your inbox. No passwords.
        </p>
      </header>

      {sent ? (
        <div
          role="status"
          className="rounded-(--radius-md) border border-(--color-edge) bg-(--color-mint-soft) p-5 text-(--color-ink)"
        >
          <p className="font-medium">Check your inbox.</p>
          <p className="text-sm text-(--color-ink-muted)">
            We just sent a sign-in link to <span className="font-medium">{sent}</span>.
          </p>
        </div>
      ) : (
        <form
          action={sendMagicLink}
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
                className="w-full rounded-(--radius-sm) border border-(--color-edge) bg-(--color-cream-1) py-2 pl-9 pr-3 text-(--color-ink) outline-none focus:border-(--color-coral) focus:ring-2 focus:ring-(--color-coral-soft)"
              />
            </span>
          </label>

          <button
            type="submit"
            className="rounded-(--radius-sm) bg-(--color-coral) px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[color-mix(in_oklab,var(--color-coral),black_8%)]"
          >
            Send magic link
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
      )}
    </main>
  );
}
