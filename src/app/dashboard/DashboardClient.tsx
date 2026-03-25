"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Clock,
  Calendar,
  BookOpen,
  Target,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Session {
  id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  topics_covered: string[];
  overall_score: number;
  ai_summary: string;
  exchanges_count: number;
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
  if (score >= 70) return "#16A34A";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}

export function DashboardClient({
  student,
  sessions,
  topicScores,
  daysToExam,
}: Props) {
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const chartData = Object.entries(topicScores).map(([topic, score]) => ({
    topic,
    score: Math.round(score),
  }));

  const weakAreas = Object.entries(topicScores)
    .filter(([, score]) => score < 50)
    .map(([topic]) => topic);

  const totalHours = Math.floor(student.total_minutes / 60);
  const remainingMins = student.total_minutes % 60;

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1000px] px-6 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#111111]">Dashboard</h1>
            <p className="mt-1 text-sm text-[#6B7280]">
              {student.full_name} &mdash; {student.ticket_type}
            </p>
          </div>
          <Link
            href="/"
            className="rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8]"
          >
            Practice
          </Link>
        </div>

        {/* Overview cards */}
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-lg border border-[#E5E7EB] p-4">
            <div className="flex items-center gap-2 text-sm text-[#6B7280]">
              <BookOpen className="h-4 w-4" />
              Sessions
            </div>
            <p className="mt-2 text-2xl font-bold text-[#111111]">
              {student.total_sessions}
            </p>
          </div>

          <div className="rounded-lg border border-[#E5E7EB] p-4">
            <div className="flex items-center gap-2 text-sm text-[#6B7280]">
              <Clock className="h-4 w-4" />
              Prep time
            </div>
            <p className="mt-2 text-2xl font-bold text-[#111111]">
              {totalHours > 0 ? `${totalHours}h ` : ""}
              {remainingMins}m
            </p>
          </div>

          <div className="rounded-lg border border-[#E5E7EB] p-4">
            <div className="flex items-center gap-2 text-sm text-[#6B7280]">
              <Calendar className="h-4 w-4" />
              Days to exam
            </div>
            <p className="mt-2 text-2xl font-bold text-[#111111]">
              {daysToExam !== null ? daysToExam : "No date set"}
            </p>
          </div>

          <div className="rounded-lg border border-[#E5E7EB] p-4">
            <div className="flex items-center gap-2 text-sm text-[#6B7280]">
              <Target className="h-4 w-4" />
              Readiness
            </div>
            <p className="mt-2 text-2xl font-bold text-[#111111]">
              {student.overall_readiness}%
            </p>
          </div>
        </div>

        {/* Topic scores chart */}
        {chartData.length > 0 && (
          <div className="mt-8 rounded-lg border border-[#E5E7EB] p-6">
            <h2 className="text-lg font-bold text-[#111111]">
              Topic Performance
            </h2>
            <div className="mt-4" style={{ height: Math.max(300, chartData.length * 40) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ left: 20, right: 20, top: 5, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E5E7EB"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis
                    type="category"
                    dataKey="topic"
                    stroke="#9CA3AF"
                    width={110}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "Score"]}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getBarColor(entry.score)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Focus areas */}
        <div className="mt-6 rounded-lg border border-[#E5E7EB] p-6">
          <h2 className="text-lg font-bold text-[#111111]">Focus Areas</h2>
          {weakAreas.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {weakAreas.map((topic) => (
                <li
                  key={topic}
                  className="flex items-center gap-2 text-[15px] text-[#6B7280]"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#EF4444]" />
                  {topic} &mdash; {Math.round(topicScores[topic])}%
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[15px] text-[#6B7280]">
              {sessions.length > 0
                ? "Looking strong across all topics."
                : "Complete a session to see your focus areas."}
            </p>
          )}
        </div>

        {/* Session history */}
        {sessions.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-[#111111]">
              Session History
            </h2>
            <div className="mt-4 space-y-3">
              {sessions.map((session) => {
                const isExpanded = expandedSession === session.id;
                const date = new Date(session.started_at).toLocaleDateString(
                  "en-GB",
                  { day: "numeric", month: "short", year: "numeric" }
                );
                const duration = Math.floor(session.duration_seconds / 60);

                return (
                  <div
                    key={session.id}
                    className="rounded-lg border border-[#E5E7EB]"
                  >
                    <button
                      onClick={() =>
                        setExpandedSession(isExpanded ? null : session.id)
                      }
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-[#111111]">
                          {date}
                        </span>
                        <span className="text-sm text-[#6B7280]">
                          {duration} min
                        </span>
                        <span className="text-sm font-medium text-[#2563EB]">
                          {session.overall_score}/100
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {(session.topics_covered || []).slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="hidden rounded-full bg-[#F7F8FA] px-2 py-0.5 text-xs text-[#6B7280] sm:inline-flex"
                          >
                            {t}
                          </span>
                        ))}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-[#6B7280]" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-[#6B7280]" />
                        )}
                      </div>
                    </button>
                    {isExpanded && session.ai_summary && (
                      <div className="border-t border-[#E5E7EB] px-4 py-3">
                        <p className="text-[15px] leading-relaxed text-[#6B7280]">
                          {session.ai_summary}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {sessions.length === 0 && (
          <div className="mt-12 text-center">
            <p className="text-[15px] text-[#6B7280]">
              No sessions yet. Start practising to see your progress here.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-lg bg-[#2563EB] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8]"
            >
              Start your first session
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
