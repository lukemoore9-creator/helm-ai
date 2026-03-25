"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const TICKET_OPTIONS = [
  { value: "oow-3000gt-yacht", label: "OOW <3000GT (Yacht)" },
  { value: "oow-unlimited", label: "OOW Unlimited" },
  { value: "master-3000gt", label: "Master <3000GT" },
  { value: "master-unlimited", label: "Master Unlimited" },
];

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasExamDate, setHasExamDate] = useState(false);
  const [ticketType, setTicketType] = useState("");

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
          ticketType,
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

      await user?.reload();
      router.push("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError("Request failed: " + msg);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6">
      <Card className="w-full max-w-[480px] border border-[#E5E7EB] shadow-none">
        <CardContent className="px-8 py-10">
          <div className="mb-10">
            <span className="text-2xl font-bold tracking-tight text-[#111111]">
              Echo
            </span>
          </div>

          <h1 className="text-xl font-bold tracking-tight text-[#111111]">
            Let&apos;s get you set up
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-[#6B7280]">
            Tell us about your exam so we can personalise your prep.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="fullName"
                className="text-sm font-medium text-[#111111]"
              >
                Full name
              </Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                required
                defaultValue={user?.fullName || ""}
                className="h-[44px] rounded-lg border-[#E5E7EB] bg-white px-4 text-[15px] text-[#111111] transition-colors focus-visible:border-[#2563EB] focus-visible:ring-[#2563EB]/20"
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#111111]">
                What exam are you preparing for?
              </Label>
              <Select
                value={ticketType}
                onValueChange={(value) => setTicketType(value ?? "")}
              >
                <SelectTrigger className="h-[44px] w-full rounded-lg border-[#E5E7EB] bg-white px-4 text-[15px] text-[#111111] transition-colors focus-visible:border-[#2563EB] focus-visible:ring-[#2563EB]/20">
                  <SelectValue placeholder="Select your exam" />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                checked={hasExamDate}
                onCheckedChange={(checked) =>
                  setHasExamDate(checked === true)
                }
                className="size-4 rounded border-[#E5E7EB] data-checked:border-[#2563EB] data-checked:bg-[#2563EB]"
              />
              <Label className="text-sm font-medium text-[#111111] cursor-pointer">
                I have an exam date
              </Label>
            </div>

            {hasExamDate && (
              <div className="space-y-2">
                <Label
                  htmlFor="examDate"
                  className="text-sm font-medium text-[#111111]"
                >
                  Exam date
                </Label>
                <Input
                  id="examDate"
                  name="examDate"
                  type="date"
                  className="h-[44px] rounded-lg border-[#E5E7EB] bg-white px-4 text-[15px] text-[#111111] transition-colors focus-visible:border-[#2563EB] focus-visible:ring-[#2563EB]/20"
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-[#EF4444]">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading || !ticketType}
              className="h-[44px] w-full rounded-lg bg-[#2563EB] text-[15px] font-medium text-white hover:bg-[#1D4ED8] disabled:opacity-50"
            >
              {loading ? "Setting up..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
