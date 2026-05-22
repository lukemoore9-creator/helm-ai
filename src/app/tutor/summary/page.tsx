"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TutorSummary {
  topicsCovered: { slug: string; count: number }[];
  thingsToRevisit: string[];
  encouragement: string;
}

function SummaryInner() {
  const searchParams = useSearchParams();
  const [summary, setSummary] = useState<TutorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const generateSummary = async () => {
      try {
        const stored = sessionStorage.getItem("echo-bridge-transcript");
        if (!stored) {
          setError(true);
          setLoading(false);
          return;
        }

        const transcript = JSON.parse(stored);
        if (!transcript.length) {
          setError(true);
          setLoading(false);
          return;
        }

        const res = await fetch("/api/tutor-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript }),
        });

        if (!res.ok) throw new Error("Summary generation failed");
        const data = await res.json();
        setSummary(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    generateSummary();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-foreground-muted" />
        <p className="mt-4 text-sm text-foreground-muted">Generating summary...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <h1 className="text-[30px] font-semibold text-foreground">Session complete</h1>
        <p className="mt-2 text-sm text-foreground-muted">Could not generate a detailed summary.</p>
        <div className="mt-8 flex gap-3">
          <Link href="/home">
            <Button>Back to home</Button>
          </Link>
          <Link href="/tutor">
            <Button variant="outline">Start another session</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[720px] px-6 py-12">
        <h1 className="text-[30px] font-semibold text-foreground">Session complete</h1>
        <p className="mt-2 text-sm text-foreground-muted">
          Tutor session{summary.topicsCovered.length > 0 ? ` · ${summary.topicsCovered.length} topic${summary.topicsCovered.length !== 1 ? "s" : ""} covered` : ""}
        </p>

        <div className="mt-8 space-y-8">
          {/* Topics covered */}
          {summary.topicsCovered.length > 0 && (
            <div className="rounded-xl border border-border bg-background p-6">
              <h3 className="text-lg font-semibold text-foreground">Topics covered</h3>
              <div className="mt-4 space-y-2">
                {summary.topicsCovered.map((t) => (
                  <div key={t.slug} className="flex items-center justify-between py-1">
                    <span className="text-[15px] text-foreground">{t.slug}</span>
                    <span className="text-sm text-foreground-muted">
                      {t.count} question{t.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested practice */}
          {summary.thingsToRevisit.length > 0 && (
            <div className="rounded-xl border border-border bg-background p-6">
              <h3 className="text-lg font-semibold text-foreground">Suggested practice</h3>
              <div className="mt-4 space-y-3">
                {summary.thingsToRevisit.map((item, i) => (
                  <p key={i} className="text-sm text-foreground-soft">{item}</p>
                ))}
              </div>
              {summary.encouragement && (
                <p className="mt-4 text-sm text-foreground-soft">{summary.encouragement}</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          <Link href="/home">
            <Button>Back to home</Button>
          </Link>
          <Link href="/tutor">
            <Button variant="outline">Start another session</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function TutorSummaryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-foreground-muted" />
        </div>
      }
    >
      <SummaryInner />
    </Suspense>
  );
}
