// Read / Plan / Capture welcome row. Three cards under the hero
// that map the homepage's three primary actions to the privacy
// promise: catalogue (read), checklists (plan), and offline forms
// (capture). All three reinforce the local-first, no-tracking
// message that the privacy statement makes load-bearing.
//
// This is a thin presentational component: the parent supplies
// localised copy via props. The icons are unicode glyphs (not
// stock images) so the row is self-contained and travel-light.

import { LinkCard } from "@/components/card";

export type WelcomeRowCard = {
  href: string;
  eyebrow: string;
  title: string;
  body: string;
  glyph: string;
};

type WelcomeRowProps = {
  cards: [WelcomeRowCard, WelcomeRowCard, WelcomeRowCard];
};

export function WelcomeRow({ cards }: WelcomeRowProps) {
  return (
    <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <li key={card.href}>
          <LinkCard
            href={card.href}
            title={card.title}
            subtitle={card.body}
            meta={card.eyebrow}
          />
          <p aria-hidden="true" className="sr-only">
            {card.glyph}
          </p>
        </li>
      ))}
    </ul>
  );
}
