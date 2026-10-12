// Site-wide footer. Lives in the layout (renders on every page)
// but isolated here so the layout file stays focused on chrome
// (header / main / footer slots) and so the footer can grow
// (a "sponsors" row, a build-stamp, a status pill) without
// touching layout.tsx.

import Link from "next/link";

export function Footer({
  lang,
  license,
  dataNote,
  privacy,
}: {
  lang: string;
  license: string;
  dataNote: string;
  privacy: string;
}) {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-6 py-6 text-xs text-fg-muted sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span>© Umbrella · {license}</span>
          <span aria-hidden="true">·</span>
          <span>{dataNote}</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/${lang}/credits`} className="hover:underline">
            Photo credits
          </Link>
          <Link href={`/${lang}/account`} className="hover:underline">
            Account
          </Link>
          <Link href={`/${lang}/terms`} className="hover:underline">
            {privacy}
          </Link>
          <a
            href="https://github.com/anotsodev/Umbrella_android"
            className="hover:underline"
          >
            Source
          </a>
        </div>
      </div>
    </footer>
  );
}
