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
import {
  Clock,
  Calendar,
  BookOpen,
  Target,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BlurFade } from "@/components/ui/blur-fade";
import { ticketDisplayName } from "@/lib/utils";

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
  if (score >= 70) return "#2563EB";
  if (score >= 40) return "#93C5FD";
  return "#DBEAFE";
}

const STAT_CARDS = [
  { key: "sessions", label: "Sessions", icon: BookOpen },
  { key: "prep", label: "Prep time", icon: Clock },
  { key: "days", label: "Days to exam", icon: Calendar },
  { key: "readiness", label: "Readiness", icon: Target },
] as const;

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

  const statValues: Record<string, string> = {
    sessions: String(student.total_sessions),
    prep: `${totalHours > 0 ? `${totalHours}h ` : ""}${remainingMins}m`,
    days: daysToExam !== null ? String(daysToExam) : "No date set",
    readiness: `${student.overall_readiness}%`,
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-[1000px] px-6 py-10">
        <BlurFade delay={0}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#111111]">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-[#6B7280]">
                {student.full_name} &mdash; {ticketDisplayName(student.ticket_type)}
              </p>
            </div>
            <Link href="/">
              <Button className="h-[40px] rounded-lg bg-[#2563EB] px-6 text-sm font-medium text-white hover:bg-[#1D4ED8]">
                Practice
              </Button>
            </Link>
          </div>
        </BlurFade>

        {/* Overview cards */}
        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STAT_CARDS.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <BlurFade key={stat.key} delay={0.05 * (i + 1)}>
                <Card className="border border-[#E5E7EB] shadow-none">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                      <Icon className="h-4 w-4" />
                      {stat.label}
                    </div>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-[#111111]">
                      {statValues[stat.key]}
                    </p>
                  </CardContent>
                </Card>
              </BlurFade>
            );
          })}
        </div>

        {/* Topic scores chart */}
        {chartData.length > 0 && (
          <BlurFade delay={0.25}>
            <Card className="mt-10 border border-[#E5E7EB] shadow-none">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold tracking-tight text-[#111111]">
                  Topic Performance
                </h2>
                <div
                  className="mt-6"
                  style={{ height: Math.max(300, chartData.length * 44) }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ left: 20, right: 20, top: 0, bottom: 0 }}
                    >
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        stroke="#E5E7EB"
                        tick={{ fontSize: 12, fill: "#9CA3AF" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="topic"
                        stroke="#E5E7EB"
                        width={120}
                        tick={{ fontSize: 13, fill: "#6B7280" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value) => [`${value}%`, "Score"]}
                        contentStyle={{
                          border: "1px solid #E5E7EB",
                          borderRadius: "8px",
                          boxShadow: "none",
                          fontSize: "13px",
                        }}
                      />
                      <Bar
                        dataKey="score"
                        radius={[0, 4, 4, 0]}
                        barSize={24}
                      >
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
              </CardContent>
            </Card>
          </BlurFade>
        )}

        {/* Focus areas */}
        <BlurFade delay={0.3}>
          <Card className={`mt-6 border border-[#E5E7EB] shadow-none${weakAreas.length > 0 ? " border-l-4 border-l-[#F59E0B]" : ""}`}>
            <CardContent className="p-6">
              <h2 className="text-lg font-bold tracking-tight text-[#111111]">
                Focus Areas
              </h2>
              {weakAreas.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {weakAreas.map((topic) => (
                    <li
                      key={topic}
                      className="flex items-center gap-3 text-[15px] text-[#6B7280]"
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[#EF4444]" />
                      {topic} &mdash;{" "}
                      <span className="font-medium text-[#111111]">
                        {Math.round(topicScores[topic])}%
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-[15px] text-[#6B7280]">
                  {sessions.length > 0
                    ? "Looking strong across all topics."
                    : "Complete a session to see your focus areas."}
                </p>
              )}
            </CardContent>
          </Card>
        </BlurFade>

        {/* Session history */}
        {sessions.length > 0 && (
          <BlurFade delay={0.35}>
            <div className="mt-10">
              <h2 className="text-lg font-bold tracking-tight text-[#111111]">
                Session History
              </h2>
              <div className="mt-5 space-y-3">
                {sessions.map((session) => {
                  const isExpanded = expandedSession === session.id;
                  const date = new Date(
                    session.started_at
                  ).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });
                  const duration = Math.floor(session.duration_seconds / 60);

                  return (
                    <Card
                      key={session.id}
                      className="border border-[#E5E7EB] shadow-none"
                    >
                      <button
                        onClick={() =>
                          setExpandedSession(isExpanded ? null : session.id)
                        }
                        className="flex w-full items-center justify-between px-5 py-4 text-left"
                      >
                        <div className="flex items-center gap-5">
                          <span className="text-sm font-medium text-[#111111]">
                            {date}
                          </span>
                          <span className="text-sm text-[#9CA3AF]">
                            {duration} min
                          </span>
                          <span className="text-sm font-semibold text-[#2563EB]">
                            {session.overall_score}/100
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {(session.topics_covered || [])
                            .slice(0, 3)
                            .map((t) => (
                              <span
                                key={t}
                                className="hidden rounded-full border border-[#E5E7EB] px-2.5 py-0.5 text-xs font-medium text-[#6B7280] sm:inline-flex"
                              >
                                {t}
                              </span>
                            ))}
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-[#9CA3AF]" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-[#9CA3AF]" />
                          )}
                        </div>
                      </button>
                      {isExpanded && session.ai_summary && (
                        <div className="border-t border-[#E5E7EB] px-5 py-4">
                          <p className="text-[15px] leading-relaxed text-[#6B7280]">
                            {session.ai_summary}
                          </p>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          </BlurFade>
        )}

        {/* Empty state */}
        {sessions.length === 0 && (
          <BlurFade delay={0.3}>
            <div className="mt-16 text-center">
              <p className="text-[15px] text-[#6B7280]">
                No sessions yet. Start practising to see your progress here.
              </p>
              <Link href="/">
                <Button className="mt-5 h-[40px] rounded-lg bg-[#2563EB] px-6 text-sm font-medium text-white hover:bg-[#1D4ED8]">
                  Start your first session
                </Button>
              </Link>
            </div>
          </BlurFade>
        )}
      </div>
    </div>
  );
}
