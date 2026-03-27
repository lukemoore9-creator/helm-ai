"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { isBetaUser } from "@/lib/beta-access";

export function Header() {
  const pathname = usePathname();
  const { user } = useUser();

  // Hide on auth and onboarding pages
  if (
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname === "/onboarding"
  ) {
    return null;
  }

  const email = user?.emailAddresses?.[0]?.emailAddress;
  const showTrainer = isBetaUser(email);

  return (
    <header className="sticky top-0 z-40 border-b border-[#E5E7EB] bg-[#FFFFFF]">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <Link href="/" className="flex items-center">
          <span className="text-xl font-bold text-[#111111]">Echo</span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-[#6B7280] transition-colors hover:text-[#111111]"
          >
            Dashboard
          </Link>
          {showTrainer && (
            <Link
              href="/trainer"
              className="text-sm font-medium text-[#6B7280] transition-colors hover:text-[#111111]"
            >
              Trainer
            </Link>
          )}
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-8 w-8",
              },
            }}
          />
        </nav>
      </div>
    </header>
  );
}
