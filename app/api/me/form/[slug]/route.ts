// GET /api/me/form/[slug]
//
// Returns the current user's saved answers for the form identified
// by `slug`, or an empty answers object if none. Anonymous
// requests get 401.
//
// The response shape is `{ answers: Record<itemName, string|string[]> }`
// — the same shape the client persists in localStorage.

import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const rows = await prisma.userForm.findMany({
    where: {
      userId,
      form: { slug },
    },
    orderBy: { updatedAt: "desc" },
    take: 1,
  });

  const row = rows[0];
  if (!row) {
    return NextResponse.json({ answers: {} });
  }

  // `answers` is a Json column. We don't validate the shape here —
  // the schema's allowed types are enforced by the form runner on
  // the client at sync time.
  return NextResponse.json({ answers: row.answers });
}
