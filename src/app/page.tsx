"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/home");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || isSignedIn) {
    return <div className="fixed inset-0 bg-background" />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold text-foreground">Echo</span>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm text-foreground-muted transition-colors hover:text-foreground">
            Sign in
          </Link>
          <Link href="/sign-up">
            <Button>Get started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-[720px] px-6 py-32 text-center">
        <h1 className="text-[48px] font-semibold leading-tight text-foreground">
          Oral exam prep for maritime officers.
        </h1>
        <p className="mx-auto mt-4 max-w-[560px] text-lg text-foreground-soft">
          Practice your OOW or Master oral with Echo, your AI examiner. Get real-time
          feedback, identify weak areas, and walk into your exam confident.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/sign-up">
            <Button size="lg">Get started</Button>
          </Link>
          <Link href="/sign-in">
            <Button variant="ghost" size="lg">I have an account</Button>
          </Link>
        </div>
        <p className="mt-4 text-[13px] text-foreground-muted">
          Private beta. Free during launch.
        </p>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-[1024px] px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="text-lg font-semibold text-foreground">Exam mode</h3>
            <p className="mt-2 text-sm text-foreground-soft">
              Structured 25-minute oral exam with verdict and detailed feedback.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="text-lg font-semibold text-foreground">Tutor mode</h3>
            <p className="mt-2 text-sm text-foreground-soft">
              Conversational practice. Pick a topic, talk through it with Echo.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="text-lg font-semibold text-foreground">Drill mode</h3>
            <p className="mt-2 text-sm text-foreground-soft">
              10-minute rapid drill on one topic. Perfect for between watches.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-[13px] text-foreground-muted">
        Echo · Private beta · 2026
      </footer>
    </div>
  );
}
