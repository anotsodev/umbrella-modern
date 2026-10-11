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

  return (
    <main style={{ maxWidth: 420, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>{t("title")}</h1>
      <p>{t("magicLinkExplainer")}</p>
      <form onSubmit={onSubmit}>
        <label htmlFor="email">{t("emailLabel")}</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ display: "block", width: "100%", margin: "0.5rem 0 1rem" }}
        />
        <button type="submit" disabled={status.kind === "sending"}>
          {status.kind === "sending" ? t("sending") : t("sendLink")}
        </button>
      </form>
      {status.kind === "sent" && <p>{t("checkYourEmail")}</p>}
      {status.kind === "error" && (
        <p role="alert" style={{ color: "crimson" }}>
          {status.message}
        </p>
      )}
    </main>
  );
}
