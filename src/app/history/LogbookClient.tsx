"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getTicketName } from "@/lib/tickets";
import { Button } from "@/components/ui/button";

interface Session {
  id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  topics_covered: string[];
  overall_score: number;
  ai_summary: string;
  exchanges_count: number;
  session_type: string;
}

interface Props {
  student: {
    full_name: string;
    ticket_type: string;
    total_sessions: number;
    total_minutes: number;
    overall_readiness: number;
  };
  sessions: Session[];
  topicScores: Record<string, number>;
  daysToExam: number | null;
}

function getBarColor(score: number): string {
  if (score >= 70) return "var(--color-success)";
  if (score >= 40) return "var(--color-warning)";
  return "var(--color-danger)";
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

type FilterType = "all" | "examination" | "bridge" | "drill";

export function LogbookClient({
  student,
  sessions,
  topicScores,
  daysToExam,
}: Props) {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  const ticketName = getTicketName(student.ticket_type);

  const chartData = Object.entries(topicScores).map(([topic, score]) => ({
    topic,
    score: Math.round(score),
  }));

  const weakAreas = Object.entries(topicScores)
    .filter(([, score]) => score < 60)
    .sort((a, b) => a[1] - b[1]);

  const stats = [
    { label: "SESSIONS", value: String(student.total_sessions) },
    { label: "TOTAL TIME", value: formatDuration(student.total_minutes) },
    { label: "DAYS TO EXAM", value: daysToExam !== null ? String(daysToExam) : "—" },
    { label: "READINESS", value: `${student.overall_readiness}%` },
  ];

  const filteredSessions = sessions.filter((s) => {
    if (filter === "all") return true;
    if (filter === "bridge") return s.session_type === "bridge" || s.session_type === "wardroom";
    return s.session_type === filter;
  });

  const filterOptions: { label: string; value: FilterType }[] = [
    { label: "All", value: "all" },
    { label: "Exam", value: "examination" },
    { label: "Tutor", value: "bridge" },
    { label: "Drill", value: "drill" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1024px] px-6 py-12">
        {/* Headline */}
        <h1 className="text-[30px] font-semibold text-foreground">History</h1>
        <p className="mt-2 text-sm text-foreground-muted">
          {ticketName} · {student.total_sessions} total sessions
        </p>

        {/* Stats row */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-background p-4"
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                {stat.label}
              </p>
              <p className="mt-2 text-[28px] font-semibold tabular-nums text-foreground">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Performance chart */}
        {chartData.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-semibold text-foreground">
              Topic performance
            </h2>
            <div className="mt-4 rounded-xl border border-border bg-background p-6">
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ left: 20, right: 20, top: 0, bottom: 0 }}
                  >
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fontSize: 12, fill: "var(--color-foreground-muted)" }}
                      axisLine={{ stroke: "var(--color-border)" }}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="topic"
                      width={120}
                      tick={{ fontSize: 13, fill: "var(--color-foreground-muted)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => [`${value}%`, "Score"]}
                      contentStyle={{
                        border: "1px solid var(--color-border)",
                        borderRadius: "8px",
                        boxShadow: "none",
                        fontSize: "13px",
                      }}
                    />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={24}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Weak areas */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-foreground">Weak areas</h2>
          <div className="mt-4">
            {weakAreas.length > 0 ? (
              <div className="rounded-xl border border-border bg-background">
                {weakAreas.map(([topic], i) => (
                  <div
                    key={topic}
                    className={`flex items-center justify-between px-6 py-3 ${
                      i < weakAreas.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <span className="text-[15px] text-foreground">{topic}</span>
                    <span className="rounded-full bg-warning/10 px-3 py-0.5 text-xs font-medium text-warning">
                      Practice
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground-muted">
                Strong across all topics.
              </p>
            )}
          </div>
        </div>

        {/* All sessions */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold text-foreground">All sessions</h2>
          <div className="mt-4 flex gap-2">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  filter === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-foreground-muted hover:bg-surface"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {filteredSessions.length > 0 ? (
              filteredSessions.map((session) => {
                const isExpanded = expandedSession === session.id;
                const date = new Date(session.started_at).toLocaleDateString(
                  "en-GB",
                  { day: "numeric", month: "short", year: "numeric" }
                );
                const duration = Math.floor(session.duration_seconds / 60);
                const topics = (session.topics_covered || []).slice(0, 3);
                const isTutor = session.session_type === "bridge" || session.session_type === "wardroom";
                const isDrill = session.session_type === "drill";
                const modeLabel = isTutor ? "Tutor" : isDrill ? "Drill" : "Exam";

                return (
                  <div key={session.id} className="border-b border-border">
                    <button
                      onClick={() =>
                        setExpandedSession(isExpanded ? null : session.id)
                      }
                      className="flex w-full items-center gap-4 py-4 text-left transition-colors hover:bg-surface"
                    >
                      <div className="shrink-0">
                        <span className="text-[15px] text-foreground">{date}</span>
                        <span
                          className={`ml-3 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium uppercase ${
                            modeLabel === "Exam"
                              ? "bg-foreground text-background"
                              : "bg-surface-2 text-foreground-muted"
                          }`}
                        >
                          {modeLabel}
                        </span>
                      </div>
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground-soft">
                        {topics.join(" · ")}
                      </span>
                      <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                        {isTutor || isDrill ? `${duration}m` : session.overall_score}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-foreground-muted" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-foreground-muted" />
                      )}
                    </button>
                    {isExpanded && session.ai_summary && (
                      <div className="pb-4 pl-4">
                        <p className="max-w-[640px] text-[15px] leading-relaxed text-foreground-soft">
                          {session.ai_summary}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm text-foreground-muted">
                  No sessions yet. Start one from home.
                </p>
                <div className="mt-4">
                  <Link href="/home">
                    <Button variant="outline">Back to home</Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="h-24" />
      </div>
    </div>
  );
}
