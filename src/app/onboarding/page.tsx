"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const TICKET_OPTIONS = [
  { value: "oow-3000gt-yacht", label: "OOW <3000GT (Yacht)" },
  { value: "oow-unlimited", label: "OOW Unlimited" },
  { value: "master-3000gt", label: "Master <3000GT" },
  { value: "master-unlimited", label: "Master Unlimited" },
  { value: "ym-offshore", label: "Yacht Master Offshore" },
  { value: "ym-ocean", label: "Yacht Master Ocean" },
];

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasExamDate, setHasExamDate] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch("/api/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.get("fullName"),
          ticketType: formData.get("ticketType"),
          hasExamDate,
          examDate: hasExamDate ? formData.get("examDate") : null,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      // Reload Clerk user to pick up new publicMetadata
      await user?.reload();
      router.push("/");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-[#111111]">
          Let&apos;s get you set up
        </h1>
        <p className="mt-2 text-[15px] text-[#6B7280]">
          Tell us about your exam so we can personalise your prep.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-[#111111]"
            >
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              defaultValue={user?.fullName || ""}
              className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-[15px] text-[#111111] outline-none transition-colors focus:border-[#2563EB]"
            />
          </div>

          <div>
            <label
              htmlFor="ticketType"
              className="block text-sm font-medium text-[#111111]"
            >
              What exam are you preparing for?
            </label>
            <select
              id="ticketType"
              name="ticketType"
              required
              className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-[15px] text-[#111111] outline-none transition-colors focus:border-[#2563EB]"
            >
              <option value="">Select your exam</option>
              {TICKET_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={hasExamDate}
                onChange={(e) => setHasExamDate(e.target.checked)}
                className="h-4 w-4 rounded border-[#E5E7EB] text-[#2563EB]"
              />
              <span className="text-sm font-medium text-[#111111]">
                I have an exam date
              </span>
            </label>
          </div>

          {hasExamDate && (
            <div>
              <label
                htmlFor="examDate"
                className="block text-sm font-medium text-[#111111]"
              >
                Exam date
              </label>
              <input
                id="examDate"
                name="examDate"
                type="date"
                className="mt-1 w-full rounded-lg border border-[#E5E7EB] px-4 py-2.5 text-[15px] text-[#111111] outline-none transition-colors focus:border-[#2563EB]"
              />
            </div>
          )}

          {error && <p className="text-sm text-[#EF4444]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#2563EB] px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#1D4ED8] disabled:opacity-50"
          >
            {loading ? "Setting up..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
