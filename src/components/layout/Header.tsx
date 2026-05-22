"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { isTrainer } from "@/lib/access";

const HIDE_ON = ["/", "/sign-in", "/sign-up", "/onboarding"];

export function Header() {
  const pathname = usePathname();
  const { user } = useUser();

  const shouldHide = HIDE_ON.some(
    (route) => pathname === route || (route !== "/" && pathname.startsWith(route + "/"))
  );

  if (shouldHide) return null;

  const email = user?.emailAddresses?.[0]?.emailAddress;
  const showTrainer = isTrainer(email);

  const linkClass = (href: string) =>
    `text-sm transition-colors hover:text-foreground ${
      pathname.startsWith(href) ? "text-foreground font-medium" : "text-foreground-muted"
    }`;

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border bg-background">
      <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-6">
        <Link href="/home" className="text-lg font-semibold text-foreground">
          Echo
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/home" className={linkClass("/home")}>
            Home
          </Link>
          <Link href="/history" className={linkClass("/history")}>
            History
          </Link>
          {showTrainer && (
            <Link href="/trainer" className={linkClass("/trainer")}>
              Trainer
            </Link>
          )}
          <UserButton />
        </div>
      </div>
    </header>
  );
}
