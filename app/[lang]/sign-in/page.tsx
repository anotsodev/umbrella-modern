// Minimal Phase 0 sign-in page. Phase 1 builds the real surface
// (proper copy in every locale, design system, error states).
//
// For now this just calls `signIn.magicLink({ email })`. The dev
// sender in lib/auth.ts logs the magic-link URL to stdout — the
// test loop is: open /en/sign-in, submit your email, look at the
// `web` container logs for the link, click it, land on /en with
// a session cookie set.

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/button";

export default function SignInPage() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "sending" }
    | { kind: "sent" }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ kind: "sending" });
    const { error } = await signIn.magicLink({
      email,
      callbackURL: "/",
    });
    if (error) {
      setStatus({ kind: "error", message: error.message ?? "Unknown error" });
    } else {
      setStatus({ kind: "sent" });
    }
  };

  const trustPoints = [
    t("trustPanel.noTracking"),
    t("trustPanel.noEmailStorage"),
    t("trustPanel.localProgress"),
    t("trustPanel.openSource"),
  ];

  return (
    <main className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-10 px-6 py-12 lg:grid-cols-2">
      <section>
        <p className="text-xs font-medium uppercase tracking-widest text-fg-muted">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          {t("magicLinkExplainer")}
        </p>

        <form onSubmit={onSubmit} className="mt-6">
          <label htmlFor="email" className="block text-sm font-medium text-fg">
            {t("emailLabel")}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
          />
          <Button
            type="submit"
            variant="primary"
            className="mt-3"
            disabled={status.kind === "sending"}
          >
            {status.kind === "sending" ? t("sending") : t("sendLink")}
          </Button>
        </form>
        {status.kind === "sent" && (
          <p className="mt-4 text-sm text-fg-muted">{t("checkYourEmail")}</p>
        )}
        {status.kind === "error" && (
          <p role="alert" className="mt-4 text-sm text-warn-soft-fg">
            {status.message}
          </p>
        )}
      </section>

      <aside className="rounded-lg border border-line bg-surface p-6">
        <h2 className="text-base font-semibold text-fg">
          {t("trustPanel.title")}
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-fg-muted">
          {trustPoints.map((line) => (
            <li key={line} className="flex gap-2">
              <span aria-hidden="true" className="text-success">
                ✓
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </aside>
    </main>
  );
}
