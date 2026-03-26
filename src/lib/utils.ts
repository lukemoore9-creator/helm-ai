import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const TICKET_DISPLAY_NAMES: Record<string, string> = {
  "oow-3000gt-yacht": "OOW <3000GT (Yacht)",
  "oow-unlimited": "OOW Unlimited",
  "master-3000gt": "Master <3000GT",
  "master-unlimited": "Master Unlimited",
};

export function ticketDisplayName(slug: string): string {
  return TICKET_DISPLAY_NAMES[slug] || slug;
}
