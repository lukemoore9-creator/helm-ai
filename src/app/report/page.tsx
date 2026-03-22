'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Target,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  MessageSquareQuote,
  ArrowLeft,
  RotateCcw,
  Loader2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Report {
  overallScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  topicsToStudy: string[];
  examReadiness: string;
  keyMoments: Array<{ quote: string; feedback: string }>;
}

// ---------------------------------------------------------------------------
// Score ring component
// ---------------------------------------------------------------------------

function ScoreRing({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 10) * circumference;
  const color =
    score >= 7 ? '#16A34A' : score >= 5 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 96 96">
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="6"
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span
        className="absolute text-2xl font-bold"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Readiness badge
// ---------------------------------------------------------------------------

function ReadinessBadge({ readiness }: { readiness: string }) {
  const config: Record<string, { bg: string; text: string; border: string }> = {
    'Not Ready': { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
    'Needs More Practice': { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
    'Nearly There': { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
    'Exam Ready': { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
  };

  const style = config[readiness] || config['Needs More Practice'];

  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
      style={{
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
      }}
    >
      {readiness}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Ticket name lookup
// ---------------------------------------------------------------------------

const TICKET_NAMES: Record<string, string> = {
  'oow-unlimited': 'OOW Unlimited',
  'oow-nearcoastal': 'OOW Near Coastal',
  'master-200gt': 'Master <200GT',
  'master-500gt': 'Master <500GT',
  'master-3000gt': 'Master <3000GT',
  'master-unlimited': 'Master Unlimited',
  'ym-offshore': 'Yacht Master Offshore',
  'ym-ocean': 'Yacht Master Ocean',
  'mate-200gt-yacht': 'Mate <200GT Yacht',
  'master-200gt-yacht': 'Master <200GT Yacht',
  'master-500gt-yacht': 'Master <500GT Yacht',
  'master-3000gt-yacht': 'Master <3000GT Yacht',
  'engineer-oow': 'Engineer OOW',
  'eto': 'ETO',
};

// ---------------------------------------------------------------------------
// Inner component (needs Suspense for useSearchParams)
// ---------------------------------------------------------------------------

function ReportInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ticketSlug = searchParams.get('ticket') || 'oow-unlimited';
  const ticketName = TICKET_NAMES[ticketSlug] || ticketSlug;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateReport = async () => {
      try {
        const stored = sessionStorage.getItem('helm-transcript');
        if (!stored) {
          setError('No session data found. Please complete an exam session first.');
          setLoading(false);
          return;
        }

        const transcript = JSON.parse(stored);

        if (!transcript.length) {
          setError('The session transcript is empty. Please try a longer session.');
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

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
        <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
        <p className="mt-4 text-[15px] font-medium text-[#6B7280]">
          Analysing your performance...
        </p>
        <p className="mt-1 text-sm text-[#9CA3AF]">
          This usually takes a few seconds
        </p>
      </div>
    );
  }

  // ── Error state ──
  if (error || !report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
        <AlertTriangle className="h-8 w-8 text-[#F59E0B]" />
        <p className="mt-4 text-[15px] font-medium text-[#111111]">
          {error || 'Something went wrong'}
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href={`/session?ticket=${ticketSlug}`}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1D4ED8] transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Link>
          <Link
            href="/select"
            className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-5 py-2.5 text-sm font-medium text-[#111111] hover:border-[#D1D5DB] transition-colors"
          >
            Choose Exam
          </Link>
        </div>
      </div>
    );
  }

  // ── Report view ──
  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Header */}
      <header className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <Link
            href="/select"
            className="flex items-center gap-2 text-sm text-[#6B7280] hover:text-[#111111] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="font-bold text-[#111111]">Session Report</span>
          <div className="w-14" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        {/* ── Score + Summary card ── */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
          <div className="flex items-start gap-6">
            <ScoreRing score={report.overallScore} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-[#111111]">{ticketName}</h1>
                <ReadinessBadge readiness={report.examReadiness} />
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-[#6B7280]">
                {report.summary}
              </p>
            </div>
          </div>
        </div>

        {/* ── Strengths ── */}
        {report.strengths.length > 0 && (
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#16A34A]">
              <TrendingUp className="h-4 w-4" />
              Strengths
            </h2>
            <ul className="mt-4 space-y-2">
              {report.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-3 text-[15px] text-[#111111]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#16A34A]" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Weaknesses ── */}
        {report.weaknesses.length > 0 && (
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#EF4444]">
              <AlertTriangle className="h-4 w-4" />
              Areas for Improvement
            </h2>
            <ul className="mt-4 space-y-2">
              {report.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-3 text-[15px] text-[#111111]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#EF4444]" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Topics to Study ── */}
        {report.topicsToStudy.length > 0 && (
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#2563EB]">
              <BookOpen className="h-4 w-4" />
              Recommended Study Topics
            </h2>
            <ul className="mt-4 space-y-2">
              {report.topicsToStudy.map((t, i) => (
                <li key={i} className="flex items-start gap-3 text-[15px] text-[#111111]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2563EB]" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Key Moments ── */}
        {report.keyMoments.length > 0 && (
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[#6B7280]">
              <MessageSquareQuote className="h-4 w-4" />
              Key Moments
            </h2>
            <div className="mt-4 space-y-4">
              {report.keyMoments.map((m, i) => (
                <div key={i} className="rounded-lg bg-[#F7F8FA] p-4">
                  <p className="text-sm italic text-[#6B7280]">
                    &ldquo;{m.quote}&rdquo;
                  </p>
                  <p className="mt-2 text-[15px] text-[#111111]">{m.feedback}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="flex items-center justify-center gap-4 pb-8">
          <Link
            href={`/session?ticket=${ticketSlug}`}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-6 py-3 text-[15px] font-medium text-white hover:bg-[#1D4ED8] transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Practice Again
          </Link>
          <Link
            href="/select"
            className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-6 py-3 text-[15px] font-medium text-[#111111] hover:border-[#D1D5DB] transition-colors"
          >
            Choose Different Exam
          </Link>
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
        <div className="flex min-h-screen items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
        </div>
      }
    >
      <ReportInner />
    </Suspense>
  );
}
