import createMiddleware from "next-intl/middleware";
import { routing } from "./routing";

export default createMiddleware(routing);

export const config = {
  // Match all paths except: api, _next, _vercel, files with a dot (favicon, etc.).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
