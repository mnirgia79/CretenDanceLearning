import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date to dd/MM/yyyy
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Format time to HH:MM
export function formatTime(time: string): string {
  return time;
}

// Get initials from full name
export function getInitials(name: string): string {
  if (!name) return "";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// Convert day of the week to Greek
export function dayToGreek(day: string): string {
  const days: Record<string, string> = {
    monday: "Δευτέρα",
    tuesday: "Τρίτη",
    wednesday: "Τετάρτη",
    thursday: "Πέμπτη",
    friday: "Παρασκευή",
    saturday: "Σάββατο",
    sunday: "Κυριακή",
  };

  return days[day.toLowerCase()] || day;
}

// Convert course type to Greek
export function courseTypeToGreek(type: string): string {
  const types: Record<string, string> = {
    dance: "Χορός",
    music: "Μουσική",
    culture: "Πολιτισμός",
  };

  return types[type] || type;
}

// Convert level to Greek
export function levelToGreek(level: string): string {
  const levels: Record<string, string> = {
    beginner: "Αρχάριο",
    intermediate: "Μέσο",
    advanced: "Προχωρημένο",
  };

  return levels[level] || level;
}

// Format amount to currency (EUR)
export function formatCurrency(amount: number): string {
  return `${amount}€`;
}

// Format phone number
export function formatPhone(phone: string): string {
  if (!phone) return "";
  return phone;
}

// Get month name in Greek
export function getMonthName(month: number): string {
  const months = [
    "Ιανουάριος",
    "Φεβρουάριος",
    "Μάρτιος",
    "Απρίλιος",
    "Μάιος",
    "Ιούνιος",
    "Ιούλιος",
    "Αύγουστος",
    "Σεπτέμβριος",
    "Οκτώβριος",
    "Νοέμβριος",
    "Δεκέμβριος",
  ];
  return months[month - 1];
}
