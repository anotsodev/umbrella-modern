// better-auth client for React + the magic-link plugin.
//
// `baseURL` is left blank so the client falls through to the
// current origin. In dev that's http://localhost:3000 via
// BETTER_AUTH_URL. In production the user sets the real domain
// in BETTER_AUTH_URL.
//
// `magicLinkClient()` exposes `signIn.magicLink({ email, ... })`
// on the returned client object. Phase 1 builds the real form.

import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [magicLinkClient()],
});

export const { signIn, signOut, signUp, useSession } = authClient;
