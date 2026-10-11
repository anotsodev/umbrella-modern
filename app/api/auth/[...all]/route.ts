// better-auth route handler for Next 16 App Router.
//
// better-auth's toNextJsHandler wires every endpoint (sign-in,
// sign-out, get-session, magic-link send/verify, etc.) into a
// single [...all] catch-all. The middleware in middleware.ts
// already excludes /api/* from next-intl's locale routing, so
// this handler receives the raw /api/auth/* paths untouched.

import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
