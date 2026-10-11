// POST /api/me/form/[slug]/sync
//
// Body: { answers: Record<itemName, string|string[]>, lang: string, title?: string }
//
// Persists the supplied answers to the user's `user_forms` row for
// the (slug, lang) form. Creates the row if none exists. Replaces
// the answers object on each sync — sends are a snapshot, so the
// client can debounce freely.
//
// 401 anonymous. 400 malformed body. 404 if the (slug, lang) form
// doesn't exist.

import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isLocale } from "@/i18n";

type SyncBody = {
  answers: Record<string, string | string[]>;
  lang: string;
  title?: string;
};

function isValidAnswerValue(value: unknown): value is string | string[] {
  if (typeof value === "string") return true;
  if (Array.isArray(value)) {
    return value.every((v) => typeof v === "string");
  }
  return false;
}

function isValidBody(value: unknown): value is SyncBody {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.lang !== "string" || !isLocale(v.lang)) return false;
  if (typeof v.answers !== "object" || v.answers === null) return false;
  for (const [, ans] of Object.entries(v.answers)) {
    if (!isValidAnswerValue(ans)) return false;
  }
  if (v.title !== undefined && typeof v.title !== "string") return false;
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
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { answers, lang, title } = body;

  // Resolve the form for (slug, lang).
  const form = await prisma.form.findUnique({
    where: {
      languageId_slug: { languageId: lang, slug },
    },
    select: { id: true, title: true },
  });
  if (!form) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // We always replace the answers with the latest snapshot.
  // The schema doesn't have a compound unique on (userId, formId)
  // — only an index — so we look up the row by index, then create
  // or update.
  const existing = await prisma.userForm.findFirst({
    where: { userId, formId: form.id },
    select: { id: true },
  });
  if (existing) {
    await prisma.userForm.update({
      where: { id: existing.id },
      data: { answers, title: title ?? form.title },
    });
  } else {
    await prisma.userForm.create({
      data: {
        userId,
        formId: form.id,
        title: title ?? form.title,
        answers,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
