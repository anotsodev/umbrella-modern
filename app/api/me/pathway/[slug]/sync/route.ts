// POST /api/me/pathway/[slug]/sync
//
// Body: { checked: Record<itemId, boolean>, lang: string }
//
// Persists the supplied checkpoint state to the user's most-recent
// run for the (slug, lang) checklist, creating the run + progress
// rows if none exist. Replaces all progress for the run — sends are
// a snapshot, not a delta, so the client can debounce freely.
//
// 401 for anonymous. 400 for malformed body. 404 if the (slug, lang)
// checklist doesn't exist in the content DB.

import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isLocale } from "@/i18n";

type SyncBody = {
  checked: Record<string, boolean>;
  lang: string;
};

function isValidBody(value: unknown): value is SyncBody {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.lang !== "string" || !isLocale(v.lang)) return false;
  if (typeof v.checked !== "object" || v.checked === null) return false;
  for (const [, checkState] of Object.entries(v.checked)) {
    if (typeof checkState !== "boolean") return false;
  }
  return true;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!isValidBody(body)) {
    return NextResponse.json(
      { error: "invalid_body" },
      { status: 400 },
    );
  }
  const { checked, lang } = body;

  // Resolve the checklist for (slug, lang). The slug is shared
  // across translations; the language picks the right one.
  const checklist = await prisma.checklist.findUnique({
    where: {
      languageId_slug: { languageId: lang, slug },
    },
    select: { id: true },
  });
  if (!checklist) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Find or create the user's run for this checklist.
  let run = await prisma.userChecklistRun.findFirst({
    where: { userId, checklistId: checklist.id },
    orderBy: { startedAt: "desc" },
  });
  if (!run) {
    run = await prisma.userChecklistRun.create({
      data: { userId, checklistId: checklist.id },
    });
  }

  // Replace progress with the snapshot. We do a delete + insert
  // rather than upsert-by-pair because the client may also have
  // unchecked items the first time they sync; upserting would
  // leave stale "checked=true" rows behind.
  await prisma.$transaction([
    prisma.userChecklistProgress.deleteMany({ where: { runId: run.id } }),
    prisma.userChecklistProgress.createMany({
      data: Object.entries(checked).map(([itemId, isChecked]) => ({
        runId: run!.id,
        itemId: BigInt(itemId),
        checked: isChecked,
      })),
    }),
  ]);

  return NextResponse.json({ ok: true });
}
