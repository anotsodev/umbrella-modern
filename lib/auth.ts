// better-auth instance for umbrella-modern.
//
// We use the magic-link plugin for email-based auth (no passwords —
// matches Security First's no-collection stance in the Android
// terms.html). In dev, the email "sender" just logs the magic-link
// URL to stdout so the route is exercisable without real SMTP. A
// real Resend/Postmark/SMTP backend is a Phase 2+ decision.
//
// The `nextCookies` plugin is the last item in `plugins` (better-auth
// requires this ordering) so that server actions / route handlers
// that set cookies work cleanly under Next 16's RSC + Server Actions.

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";

import { prisma } from "../lib/db";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const secret = process.env.BETTER_AUTH_SECRET;

if (!secret) {
  // Fail loud at module load — never let the app boot with an
  // unsigned cookie secret. Generate one with `openssl rand -base64 32`.
  throw new Error(
    "BETTER_AUTH_SECRET is not set. Run `openssl rand -base64 32` and add it to .env",
  );
}

export const auth = betterAuth({
  baseURL,
  secret,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    // Phase 0 ships magic-link only; email-and-password is left
    // disabled until Phase 2 figures out whether we want it at all.
    enabled: false,
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        // Dev sender: print the link. In production, swap this for
        // a real Resend / Postmark / SMTP call.
        console.log(`[magic-link] ${email} → ${url}`);
      },
    }),
    nextCookies(),
  ],
});

export type Auth = typeof auth;
