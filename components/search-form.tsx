"use client";

// Plain GET form that submits to /<lang>/search?q=... The input stays
// controlled so users can keep editing while results load. We use
// router.push so the URL is replaced (no history spam) and refresh so
// the new RSC tree for the search results loads.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./button";

type Props = {
  current: string;
  initialQuery: string;
  placeholder: string;
};

export function SearchForm({ current, initialQuery, placeholder }: Props) {
  const [q, setQ] = useState(initialQuery);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next = q.trim();
    const url = next
      ? `/${current}/search?q=${encodeURIComponent(next)}`
      : `/${current}/search`;
    startTransition(() => {
      router.push(url);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="flex-1 rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
        aria-label="Search"
      />
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "…" : "Go"}
      </Button>
    </form>
  );
}
