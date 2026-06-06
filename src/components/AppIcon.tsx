import type { ReactElement } from "react";

type AppIconName =
  | "arrow-right"
  | "chart"
  | "check"
  | "clipboard"
  | "lock"
  | "map-pin"
  | "settings"
  | "shield"
  | "sign-out"
  | "sparkles"
  | "user";

type AppIconProps = {
  name: AppIconName;
  size?: number;
};

const iconPaths: Record<AppIconName, ReactElement> = {
  "arrow-right": (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19h16" />
      <path d="M7 16v-5" />
      <path d="M12 16V5" />
      <path d="M17 16V8" />
    </>
  ),
  check: (
    <>
      <path d="m5 12 4 4L19 6" />
    </>
  ),
  clipboard: (
    <>
      <rect width="14" height="16" x="5" y="4" rx="2" />
      <path d="M9 4V2h6v2" />
      <path d="M9 9h6" />
      <path d="M9 13h4" />
    </>
  ),
  lock: (
    <>
      <rect width="16" height="11" x="4" y="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  "map-pin": (
    <>
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a2 2 0 0 0 .4 2.2l.1.1-2.6 2.6-.1-.1a2 2 0 0 0-2.2-.4 2 2 0 0 0-1.2 1.8v.2h-3.6v-.2A2 2 0 0 0 9 19.4a2 2 0 0 0-2.2.4l-.1.1-2.6-2.6.1-.1A2 2 0 0 0 4.6 15a2 2 0 0 0-1.8-1.2h-.2v-3.6h.2A2 2 0 0 0 4.6 9a2 2 0 0 0-.4-2.2l-.1-.1 2.6-2.6.1.1A2 2 0 0 0 9 4.6a2 2 0 0 0 1.2-1.8v-.2h3.6v.2A2 2 0 0 0 15 4.6a2 2 0 0 0 2.2-.4l.1-.1 2.6 2.6-.1.1a2 2 0 0 0-.4 2.2 2 2 0 0 0 1.8 1.2h.2v3.6h-.2A2 2 0 0 0 19.4 15Z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  "sign-out": (
    <>
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M21 19V5a2 2 0 0 0-2-2h-6" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3-1.6 4.4L6 9l4.4 1.6L12 15l1.6-4.4L18 9l-4.4-1.6Z" />
      <path d="m19 16-.7 1.8-1.8.7 1.8.7L19 22l.7-1.8 1.8-.7-1.8-.7Z" />
      <path d="m4 15-.6 1.4L2 17l1.4.6L4 19l.6-1.4L6 17l-1.4-.6Z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  )
};

export function AppIcon({ name, size = 20 }: AppIconProps) {
  return (
    <svg
      aria-hidden="true"
      className="app-icon"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={size}
    >
      {iconPaths[name]}
    </svg>
  );
}
