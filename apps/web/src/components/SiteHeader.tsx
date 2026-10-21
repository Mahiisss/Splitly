"use client";

import { Moon, Sun } from "lucide-react";
import Link from "next/link";
import { demoCurrentUser } from "@splitly/core";
import { avatarColors, initials } from "@splitly/theme";
import { useTheme } from "@/lib/theme";
import { Logo } from "./Logo";

export function SiteHeader() {
  const [theme, toggleTheme] = useTheme();
  const you = avatarColors(0);

  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
      <Link href="/" aria-label="Splitly, all groups" className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink">
        <Logo />
      </Link>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
          className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
        >
          {/* Before the browser reports the theme, show the moon (the light-mode default). */}
          {theme === "dark" ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
        </button>
        <span className="flex items-center gap-2 text-sm text-muted">
          <span className="hidden sm:inline">{demoCurrentUser.name}</span>
          <span
            aria-hidden
            className="inline-flex size-7 items-center justify-center rounded-full text-[11px] font-semibold"
            style={{ backgroundColor: you.background, color: you.text }}
          >
            {initials(demoCurrentUser.name)}
          </span>
        </span>
      </div>
    </header>
  );
}
