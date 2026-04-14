import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";

import { routing } from "./i18n/routing";
import { INCOMING_PATHNAME_HEADER } from "./lib/incoming-pathname";

const intlMiddleware = createMiddleware(routing);

export default function proxy(req: NextRequest) {
  const response = intlMiddleware(req);
  // Forward the raw pathname so that not-found.tsx (which receives no route
  // params) can still derive the active locale.
  response.headers.set(INCOMING_PATHNAME_HEADER, req.nextUrl.pathname);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
