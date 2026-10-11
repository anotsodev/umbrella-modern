// better-auth instance for umbrella-modern.
//
// We use the magic-link plugin for email-based auth (no passwords —
// matches Security First's no-collection stance in the Android
// terms.html). The actual email transport lives in lib/email.ts
// (Resend in production, dev-stub fallback when RESEND_API_KEY is
// unset and NODE_ENV !== "production").
//
// The `nextCookies` plugin is the last item in `plugins` (better-auth
// requires this ordering) so that server actions / route handlers
// that set cookies work cleanly under Next 16's RSC + Server Actions.

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";

import { prisma } from "../lib/db";
import { sendMagicLink } from "./email";

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
        // Delegates to lib/email.ts. Production requires
        // RESEND_API_KEY + EMAIL_FROM (it'll throw at send time if
        // either is missing); development falls back to a stdout
        // log when RESEND_API_KEY is unset.
        await sendMagicLink({ to: email, url });
      },
    }),
    nextCookies(),
  ],
});

export type Auth = typeof auth;
