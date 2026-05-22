"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { STUDENT_TICKETS, getTicketName } from "@/lib/tickets";
import { Button } from "@/components/ui/button";

interface StudentData {
  ticket_type: string;
  full_name: string;
  exam_date: string | null;
  has_exam_date: boolean;
}

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [examDate, setExamDate] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchStudent = useCallback(() => {
    fetch("/api/student")
      .then((res) => res.json())
      .then((data) => {
        if (data.student) {
          setStudent(data.student);
          setExamDate(data.student.exam_date || "");
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (open) fetchStudent();
  }, [open, fetchStudent]);

  const handleTicketChange = async (slug: string) => {
    setSaving(true);
    try {
      await fetch("/api/student", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketType: slug }),
      });
      setStudent((prev) => prev ? { ...prev, ticket_type: slug } : prev);
      router.refresh();
    } catch (err) {
      console.error("Failed to update ticket:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleExamDateChange = async (date: string) => {
    setExamDate(date);
    try {
      await fetch("/api/student", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examDate: date || null }),
      });
      router.refresh();
    } catch (err) {
      console.error("Failed to update exam date:", err);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-foreground/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="fixed inset-y-0 right-0 z-50 w-full max-w-[420px] bg-background"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex h-14 items-center justify-between border-b border-border px-6">
                <span className="text-lg font-semibold text-foreground">
                  Settings
                </span>
                <button
                  onClick={onClose}
                  className="text-foreground-muted transition-colors hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                {/* Name */}
                <div className="pb-4">
                  <label className="text-sm font-medium text-foreground-muted">
                    Name
                  </label>
                  <p className="mt-1 text-[15px] text-foreground">
                    {student?.full_name || user?.fullName || "Loading..."}
                  </p>
                </div>

                <div className="border-t border-border" />

                {/* Ticket */}
                <div className="py-4">
                  <label className="text-sm font-medium text-foreground-muted">
                    Ticket
                  </label>
                  <select
                    value={student?.ticket_type || ""}
                    onChange={(e) => handleTicketChange(e.target.value)}
                    disabled={saving}
                    className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
                  >
                    {STUDENT_TICKETS.map((ticket) => (
                      <option key={ticket.slug} value={ticket.slug}>
                        {ticket.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="border-t border-border" />

                {/* Exam date */}
                <div className="py-4">
                  <label className="text-sm font-medium text-foreground-muted">
                    Exam date
                  </label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => handleExamDateChange(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
                  />
                </div>

                <div className="border-t border-border" />

                {/* Sign out */}
                <div className="pt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleSignOut}
                  >
                    Sign out
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
