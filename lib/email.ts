// Email transport for magic-link sign-in.
//
// v1 sends through Resend (the user's chosen provider — best Next.js
// + better-auth DX, free tier covers a small site, better-auth
// abstracts the transport so swapping later is a config change).
//
// Behavior:
//   - Production with RESEND_API_KEY set: send via Resend.
//   - Production with RESEND_API_KEY unset: throw at module load
//     so a misconfigured deploy fails fast and visibly.
//   - Development (NODE_ENV !== "production") with
//     RESEND_API_KEY unset: log the magic-link URL to stdout,
//     matching the Phase 0 dev stub.
//
// Plain text + HTML variants. Plain text is the one most magic-link
// transports deliver; HTML is the one users see. We do not include
// social links, marketing copy, or anything that could be used to
// fingerprint the recipient — matches the Phase 1 footer attribution
// stance and Umbrella's privacy posture.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

type SendMagicLinkArgs = {
  to: string;
  url: string;
};

function isDev(): boolean {
  return process.env.NODE_ENV !== "production";
}

function devSend({ to, url }: SendMagicLinkArgs): void {
  // Mirrors the Phase 0 lib/auth.ts dev stub. Kept as console.log
  // so the existing "look at the web container stdout" workflow
  // continues to work for local dev / CI.
  console.log(`[magic-link] ${to} → ${url}`);
}

async function resendSend({ to, url }: SendMagicLinkArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Should be impossible — caller checks env before picking the
    // transport — but defensive.
    throw new Error("RESEND_API_KEY is required for resendSend");
  }
  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error(
      "EMAIL_FROM is required for production magic-link delivery. Set it to e.g. `Umbrella <noreply@yourdomain.org>` in .env",
    );
  }

  const subject = "Your Umbrella sign-in link";
  const text = [
    "Click to sign in:",
    url,
    "",
    "Expires in 10 minutes.",
    "If you didn't request this, ignore this email.",
  ].join("\n");
  const html = [
    "<p>Click to sign in:</p>",
    `<p><a href="${url}">${url}</a></p>`,
    "<p>Expires in 10 minutes.</p>",
    "<p>If you didn't request this, ignore this email.</p>",
  ].join("\n");

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text, html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Resend sendMagicLink failed: ${res.status} ${res.statusText} ${body}`,
    );
  }
}

export async function sendMagicLink(args: SendMagicLinkArgs): Promise<void> {
  const hasKey = Boolean(process.env.RESEND_API_KEY);
  if (!hasKey && !isDev()) {
    throw new Error(
      "RESEND_API_KEY is not set and NODE_ENV=production — refusing to send magic links without a configured transport.",
    );
  }
  if (!hasKey && isDev()) {
    devSend(args);
    return;
  }
  await resendSend(args);
}
