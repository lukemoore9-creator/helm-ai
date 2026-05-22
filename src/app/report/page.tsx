'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { getTicketName } from '@/lib/tickets';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SectionQuestion {
  q: string;
  performance: 'strong' | 'ok' | 'weak';
}

interface SectionBreakdown {
  section: string;
  score: number;
  questions: SectionQuestion[];
}

interface KeyMoment {
  question: string;
  studentResponse: string;
  verdict: string;
  verdictTone: 'good' | 'ok' | 'bad';
  modelAnswer: string;
}

interface DrillCard {
  topicSlug: string;
  topicName: string;
  reason: string;
}

interface Report {
  overallScore: number;
  verdict: 'pass' | 'marginal' | 'refer';
  examinerJudgement: string;
  confidence: 'high' | 'medium' | 'low';
  sectionBreakdown: SectionBreakdown[];
  keyMoments: KeyMoment[];
  topThreeDrills: DrillCard[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VERDICT_BG: Record<string, string> = {
  pass: 'var(--color-success)',
  marginal: 'var(--color-warning)',
  refer: 'var(--color-danger)',
};

const PERFORMANCE_COLOURS: Record<string, string> = {
  strong: 'var(--color-success)',
  ok: 'var(--color-warning)',
  weak: 'var(--color-danger)',
  good: 'var(--color-success)',
  bad: 'var(--color-danger)',
};

function barFillColour(score: number): string {
  if (score >= 70) return 'var(--color-success)';
  if (score >= 40) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

function computeVerdict(score: number): 'pass' | 'marginal' | 'refer' {
  if (score >= 75) return 'pass';
  if (score >= 60) return 'marginal';
  return 'refer';
}

// ---------------------------------------------------------------------------
// Inner component
// ---------------------------------------------------------------------------

function ReportInner() {
  const searchParams = useSearchParams();
  const ticketSlug = searchParams.get('ticket') || 'oow-unlimited';
  const ticketName = getTicketName(ticketSlug);

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    const generateReport = async () => {
      try {
        const stored = sessionStorage.getItem('echo-transcript');
        if (!stored) {
          setError('no-transcript');
          setLoading(false);
          return;
        }

        const transcript = JSON.parse(stored);

        if (!transcript.length) {
          setError('no-transcript');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript, ticketType: ticketName }),
        });

        if (!res.ok) {
          throw new Error(`Report generation failed (${res.status})`);
        }

        const data = await res.json();
        setReport(data);
      } catch (err) {
        console.error('Report error:', err);
        setError('Failed to generate report. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    generateReport();
  }, [ticketName]);

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <Loader2 className="h-6 w-6 animate-spin text-foreground-muted" />
        <p className="mt-4 text-sm text-foreground-muted">Generating report…</p>
      </div>
    );
  }

  // No transcript
  if (error === 'no-transcript') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <AlertTriangle className="h-8 w-8 text-foreground-muted" />
        <p className="mt-4 max-w-md text-center text-[15px] text-foreground-muted">
          This report needs a completed exam session. Start one first.
        </p>
        <div className="mt-8">
          <Link href="/examination">
            <Button>Start exam</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <AlertTriangle className="h-8 w-8 text-warning" />
        <p className="mt-4 text-[15px] text-foreground">
          {error || 'Something went wrong'}
        </p>
        <div className="mt-8">
          <Link href="/examination">
            <Button>Try again</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Derive verdict
  const verdict = computeVerdict(report.overallScore);
  const verdictBg = VERDICT_BG[verdict];

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-[880px] px-6 py-12">
        {/* Verdict Banner */}
        <div className="rounded-xl border border-border-strong bg-background p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span
              className="inline-flex w-fit rounded-full px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-white"
              style={{ backgroundColor: verdictBg }}
            >
              {verdict}
            </span>
            <p className="flex-1 text-[17px] font-medium text-foreground sm:text-center">
              {report.examinerJudgement}
            </p>
            <div className="shrink-0 sm:text-right">
              <span className="text-[32px] font-bold tabular-nums text-foreground">
                {report.overallScore}{' '}
                <span className="text-[20px] font-normal text-foreground-muted">/ 100</span>
              </span>
              <p className="mt-1 text-xs text-foreground-muted">
                Confidence: {report.confidence}
              </p>
            </div>
          </div>
        </div>

        {/* Section Breakdown */}
        {report.sectionBreakdown.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold text-foreground">Section breakdown</h2>
            <div className="mt-4 rounded-xl border border-border bg-background">
              {report.sectionBreakdown.map((section) => {
                const isExpanded = expandedSection === section.section;
                return (
                  <div key={section.section} className="border-b border-border last:border-b-0">
                    <button
                      onClick={() => setExpandedSection(isExpanded ? null : section.section)}
                      className="flex w-full items-center gap-4 px-6 py-4"
                    >
                      <span className="w-48 shrink-0 text-left text-[15px] text-foreground">
                        {section.section}
                      </span>
                      <div className="flex-1">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(section.score, 2)}%`,
                              backgroundColor: barFillColour(section.score),
                            }}
                          />
                        </div>
                      </div>
                      <span className="w-12 shrink-0 text-right text-sm font-medium tabular-nums text-foreground-muted">
                        {section.score}%
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-foreground-muted" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-foreground-muted" />
                      )}
                    </button>
                    {isExpanded && section.questions.length > 0 && (
                      <div className="mb-4 ml-6 border-l border-border pl-6 pb-2">
                        {section.questions.map((q, qi) => (
                          <div key={qi} className="flex items-start gap-3 py-1.5">
                            <span
                              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                              style={{
                                backgroundColor:
                                  PERFORMANCE_COLOURS[q.performance] || 'var(--color-warning)',
                              }}
                            />
                            <span className="text-sm text-foreground-soft">{q.q}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Key Moments */}
        {report.keyMoments.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold text-foreground">Key moments</h2>
            <div className="mt-4 space-y-4">
              {report.keyMoments.map((moment, i) => (
                <div key={i} className="rounded-xl border border-border bg-background p-5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                    Question
                  </p>
                  <p className="mt-1 text-[15px] text-foreground">{moment.question}</p>

                  <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                    Your response
                  </p>
                  <p className="mt-1 text-sm italic text-foreground-soft">
                    &ldquo;{moment.studentResponse}&rdquo;
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          PERFORMANCE_COLOURS[moment.verdictTone] || 'var(--color-warning)',
                      }}
                    />
                    <span className="text-sm text-foreground">{moment.verdict}</span>
                  </div>

                  {moment.modelAnswer && (
                    <>
                      <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                        Model answer
                      </p>
                      <p className="mt-1 text-sm text-foreground-soft">{moment.modelAnswer}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Practice These */}
        {report.topThreeDrills.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold text-foreground">Practice these</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {report.topThreeDrills.map((drill) => (
                <div key={drill.topicSlug} className="rounded-xl border border-border bg-background p-5">
                  <h4 className="text-base font-semibold text-foreground">{drill.topicName}</h4>
                  <p className="mt-2 text-sm text-foreground-soft">{drill.reason}</p>
                  <div className="mt-4">
                    <Link href={`/drill?topic=${drill.topicSlug}`}>
                      <Button variant="outline" size="sm">Start 10-min drill</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-12 flex gap-3">
          <Link href="/examination">
            <Button>Start another exam</Button>
          </Link>
          <Link href="/home">
            <Button variant="outline">Back to home</Button>
          </Link>
          <Button variant="ghost" onClick={() => window.print()}>
            Save as PDF
          </Button>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page wrapper
// ---------------------------------------------------------------------------

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-foreground-muted" />
          <p className="ml-3 text-sm text-foreground-muted">Generating report…</p>
        </div>
      }
    >
      <ReportInner />
    </Suspense>
  );
}
