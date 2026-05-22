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
import { STUDENT_TICKETS } from "@/lib/tickets";

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
      router.push("/home");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError("Request failed: " + msg);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <Card className="w-full max-w-[480px] border border-border shadow-none">
        <CardContent className="px-8 py-10">
          <div className="mb-10">
            <span className="text-2xl font-semibold text-foreground">
              Echo
            </span>
          </div>

          <h1 className="text-xl font-semibold text-foreground">
            Let&apos;s get you set up
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-foreground-muted">
            Tell us about your exam so we can personalise your prep.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="fullName"
                className="text-sm font-medium text-foreground"
              >
                Full name
              </Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                required
                defaultValue={user?.fullName || ""}
                className="h-[44px] rounded-lg border-border bg-background px-4 text-[15px] text-foreground transition-colors focus-visible:border-accent focus-visible:ring-accent/20"
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                What exam are you preparing for?
              </Label>
              <Select
                value={ticketType}
                onValueChange={(value) => setTicketType(value ?? "")}
              >
                <SelectTrigger className="h-[44px] w-full rounded-lg border-border bg-background px-4 text-[15px] text-foreground transition-colors focus-visible:border-accent focus-visible:ring-accent/20">
                  <SelectValue placeholder="Select your exam" />
                </SelectTrigger>
                <SelectContent>
                  {STUDENT_TICKETS.map((t) => (
                    <SelectItem key={t.slug} value={t.slug}>
                      {t.name}
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
                className="size-4 rounded border-border data-checked:border-primary data-checked:bg-primary"
              />
              <Label className="cursor-pointer text-sm font-medium text-foreground">
                I have an exam date
              </Label>
            </div>

            {hasExamDate && (
              <div className="space-y-2">
                <Label
                  htmlFor="examDate"
                  className="text-sm font-medium text-foreground"
                >
                  Exam date
                </Label>
                <Input
                  id="examDate"
                  name="examDate"
                  type="date"
                  className="h-[44px] rounded-lg border-border bg-background px-4 text-[15px] text-foreground transition-colors focus-visible:border-accent focus-visible:ring-accent/20"
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-danger">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading || !ticketType}
              className="h-[44px] w-full"
            >
              {loading ? "Setting up..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
