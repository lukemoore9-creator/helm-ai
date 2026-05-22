"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { isBetaUser } from "@/lib/beta-access";
import { getTicketName } from "@/lib/tickets";
import { isTrainer } from "@/lib/access";
import { Button } from "@/components/ui/button";

interface StudentData {
  id: string;
  full_name: string;
  email: string | null;
  ticket_type: string;
  total_sessions: number;
  total_minutes: number;
  onboarding_complete: boolean;
}

const MODE_CARDS = [
  {
    label: "MODE 01",
    title: "Exam",
    description:
      "A structured oral exam. 18 questions across COLREGs, emergencies, navigation, and cargo. Graded at the end.",
    cta: "Start exam",
    href: "/examination",
    hint: "~25 minutes",
  },
  {
    label: "MODE 02",
    title: "Tutor",
    description:
      "Conversational practice with Echo. Pick a topic, talk through it. No grading.",
    cta: "Start tutor session",
    href: "/tutor",
    hint: "As long as you like",
  },
  {
    label: "MODE 03",
    title: "Drill",
    description:
      "Ten-minute rapid drill on one topic. Quick practice between sessions.",
    cta: "Start drill",
    href: "/drill",
    hint: "10 minutes",
  },
];

function getFirstName(fullName: string | undefined): string {
  if (!fullName) return "";
  return fullName.trim().split(" ")[0];
}

export default function HomePage() {
  const router = useRouter();
  const { user } = useUser();

  const [student, setStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student")
      .then((res) => res.json())
      .then((data) => {
        if (data.error === "Student not found" || !data.student) {
          router.replace("/onboarding");
          return;
        }
        if (!data.student.onboarding_complete) {
          router.replace("/onboarding");
          return;
        }
        setStudent(data.student);
      })
      .catch(() => router.replace("/onboarding"))
      .finally(() => setLoading(false));
  }, [router]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "1") router.push("/examination");
      if (e.key === "2") router.push("/tutor");
      if (e.key === "3") router.push("/drill");
      if (e.key === "4") router.push("/history");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  if (loading) {
    return <div className="fixed inset-0 bg-background" />;
  }

  // Beta gate
  if (student && !isBetaUser(student.email)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <h1 className="text-2xl font-semibold text-foreground">Echo</h1>
        <p className="mt-4 text-lg font-semibold text-foreground">Private Beta</p>
        <p className="mt-3 max-w-md text-center text-[15px] text-foreground-muted">
          Echo is currently in private beta. We&apos;ll be opening up soon.
        </p>
      </div>
    );
  }

  const ticketName = student ? getTicketName(student.ticket_type) : "";
  const firstName = getFirstName(student?.full_name);
  const totalSessions = student?.total_sessions || 0;
  const totalMinutes = student?.total_minutes || 0;
  const email = user?.emailAddresses?.[0]?.emailAddress;
  const showTrainer = isTrainer(email);

  const statsLine =
    totalSessions > 0
      ? `${ticketName} · ${totalSessions} session${totalSessions !== 1 ? "s" : ""} · ${totalMinutes} minute${totalMinutes !== 1 ? "s" : ""} practiced`
      : `${ticketName} · New candidate`;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1024px] px-6 py-12">
        {/* Heading */}
        <h1 className="text-[30px] font-semibold text-foreground">
          Welcome back, {firstName || "there"}.
        </h1>
        <p className="mt-2 text-sm text-foreground-muted">{statsLine}</p>

        {/* Mode cards */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {MODE_CARDS.map((card) => (
            <div
              key={card.title}
              className="flex flex-col rounded-xl border border-border bg-background p-6"
            >
              <span className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
                {card.label}
              </span>
              <h3 className="mt-3 text-lg font-semibold text-foreground">
                {card.title}
              </h3>
              <p className="mt-2 flex-1 text-sm text-foreground-soft">
                {card.description}
              </p>
              <div className="mt-6">
                <Link href={card.href} className="block">
                  <Button className="w-full">{card.cta}</Button>
                </Link>
                <p className="mt-2 text-center text-xs text-foreground-muted">
                  {card.hint}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent sessions placeholder */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-foreground">Recent sessions</h2>
          <div className="mt-4">
            <p className="text-sm text-foreground-muted">
              No sessions yet. Start one above.
            </p>
            <div className="mt-3">
              <Link href="/history" className="text-sm text-accent hover:underline">
                View all sessions →
              </Link>
            </div>
          </div>
        </div>

        {/* Trainer tools */}
        {showTrainer && (
          <div className="mt-12">
            <h2 className="text-2xl font-semibold text-foreground">
              Trainer Tools
            </h2>
            <div className="mt-4 rounded-xl border border-border bg-background p-6">
              <span className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
                TRAINER
              </span>
              <h3 className="mt-3 text-lg font-semibold text-foreground">
                Trainer Mode
              </h3>
              <p className="mt-2 text-sm text-foreground-soft">
                Run training sessions, review and flag Echo&apos;s responses, and
                curate the knowledge base.
              </p>
              <div className="mt-6">
                <Link href="/trainer">
                  <Button variant="outline">Open trainer mode</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
