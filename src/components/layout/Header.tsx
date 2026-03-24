"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Anchor } from "lucide-react";

export function Header() {
  const pathname = usePathname();

  // Hide header on the session page (full-screen voice experience)
  if (pathname === "/session") return null;

  return (
    <header className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-[#FFFFFF]">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <Anchor className="h-5 w-5 text-[#2563EB]" />
          <span className="font-bold text-xl text-[#111111]">Helm AI</span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            href="/select"
            className="text-sm font-medium text-[#6B7280] transition-colors hover:text-[#111111]"
          >
            Practice
          </Link>
          <Link
            href="/select"
            className="inline-flex items-center justify-center rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8]"
          >
            Start Practicing
          </Link>
        </nav>
      </div>
    </header>
  );
}
