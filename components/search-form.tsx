"use client";

// Plain GET form that submits to /<lang>/search?q=... The input stays
// controlled so users can keep editing while results load. We use
// router.push so the URL is replaced (no history spam) and refresh so
// the new RSC tree for the search results loads.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
        className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
        aria-label="Search"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "…" : "Go"}
      </button>
    </form>
  );
}
