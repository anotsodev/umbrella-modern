// Subtopic icons for the pathways navigation. lucide-react is
// tree-shaken, so only the icons imported here ship in the bundle.
//
// Keys are matched against the section slug (locale-independent,
// e.g. "communications-phishing-beginner" → "phishing"), so the
// mapping works across all languages. Anything unmatched falls back
// to a neutral compass icon. Icons are decorative (aria-hidden);
// the adjacent heading carries the meaning.

import {
  AlertTriangle,
  Backpack,
  Bug,
  Car,
  Compass,
  Database,
  FileWarning,
  Fingerprint,
  FolderLock,
  Handshake,
  HardDriveDownload,
  HeartPulse,
  KeyRound,
  Mail,
  Map as MapIcon,
  Megaphone,
  MessageSquare,
  Mic,
  Phone,
  Radio,
  Route,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Siren,
  Trash2,
  UserRoundSearch,
  Users,
  Wifi,
} from "lucide-react";

// Ordered: first match wins, so put specific keywords before
// generic ones (e.g. "online-privacy" before "privacy"). Values are
// stable registry keys (see ICONS below) so consumers render icons
// via a static member access, not a component created during render.
const ICON_RULES: [string, keyof typeof ICONS][] = [
  // Communications
  ["phishing", "mail"],
  ["email", "mail"],
  ["making-a-call", "phone"],
  ["mobile-phones", "smartphone"],
  ["online-privacy", "fingerprint"],
  ["online-abuse", "fileWarning"],
  ["radios-and-satellite-phones", "radio"],
  ["sending-a-message", "messageSquare"],
  ["censorship", "shieldAlert"],
  // Incident Response
  ["arrests", "shieldAlert"],
  ["evacuation", "route"],
  ["kidnapping", "userRoundSearch"],
  ["sexual-assault", "heartPulse"],
  ["terrorism", "siren"],
  // Information
  ["backing-up", "hardDriveDownload"],
  ["malware", "bug"],
  ["managing-information", "database"],
  ["passwords", "keyRound"],
  ["protect-your-workspace", "folderLock"],
  ["protecting-files", "folderLock"],
  ["safely-deleting", "trash2"],
  ["workspace-raids", "shieldAlert"],
  // Stress
  ["stress", "heartPulse"],
  // Travel
  ["borders", "mapIcon"],
  ["checkpoints", "shieldCheck"],
  ["preparation", "backpack"],
  ["protective-equipment", "shieldCheck"],
  ["vehicles", "car"],
  // Work
  ["being-followed", "userRoundSearch"],
  ["dangerous-assignments", "alertTriangle"],
  ["meetings", "users"],
  ["protests", "megaphone"],
  ["public-communications", "mic"],
  ["whistleblowers", "handshake"],
  // Assess Your Risk
  ["security-planning", "compass"],
  // Domains (fallbacks for flat/overview sections)
  ["communications", "wifi"],
  ["incident-response", "siren"],
  ["information", "database"],
  ["travel", "mapIcon"],
  ["work", "users"],
  ["assess-your-risk", "compass"],
  ["pathways", "route"],
];

// The icon registry. Keys are stable identifiers; the components are
// module-level constants, so member access on this object is static.
export const ICONS = {
  mail: Mail,
  phone: Phone,
  smartphone: Smartphone,
  fingerprint: Fingerprint,
  fileWarning: FileWarning,
  radio: Radio,
  messageSquare: MessageSquare,
  shieldAlert: ShieldAlert,
  route: Route,
  userRoundSearch: UserRoundSearch,
  heartPulse: HeartPulse,
  siren: Siren,
  hardDriveDownload: HardDriveDownload,
  bug: Bug,
  database: Database,
  keyRound: KeyRound,
  folderLock: FolderLock,
  trash2: Trash2,
  mapIcon: MapIcon,
  shieldCheck: ShieldCheck,
  backpack: Backpack,
  car: Car,
  alertTriangle: AlertTriangle,
  users: Users,
  megaphone: Megaphone,
  mic: Mic,
  handshake: Handshake,
  compass: Compass,
  wifi: Wifi,
} as const;

export type SubtopicIconKey = keyof typeof ICONS;

export function subtopicIconKey(slug: string): SubtopicIconKey {
  for (const [keyword, key] of ICON_RULES) {
    if (slug.includes(keyword)) return key;
  }
  return "compass";
}
