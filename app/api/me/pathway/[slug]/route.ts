// GET /api/me/pathway/[slug]
//
// Returns the current user's saved checkpoint state for the
// pathway (checklist) identified by `slug`, or an empty object
// if the user has no run yet. Anonymous requests get 401.
//
// The response shape is `{ checked: Record<itemId, boolean> }`
// — the same shape the client persists in localStorage, so
// hydration is a straight merge.

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

  const runs = await prisma.userChecklistRun.findMany({
    where: {
      userId,
      checklist: { slug },
    },
    include: {
      progress: { select: { itemId: true, checked: true } },
    },
    orderBy: { startedAt: "desc" },
    take: 1,
  });

  const run = runs[0];
  if (!run) {
    return NextResponse.json({ checked: {} satisfies Record<string, boolean> });
  }

  const checked: Record<string, boolean> = {};
  for (const row of run.progress) {
    checked[String(row.itemId)] = row.checked;
  }
  return NextResponse.json({ checked });
}
