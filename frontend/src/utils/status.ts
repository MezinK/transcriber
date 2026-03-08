import type { TranscriptionStatus } from "../types";

export const STATUS_COLORS: Record<TranscriptionStatus, string> = {
  pending: "text-gray-500",
  processing: "text-amber-500",
  completed: "text-green-600",
  failed: "text-red-500",
};

export const STATUS_BG: Record<TranscriptionStatus, string> = {
  pending: "bg-gray-100 text-gray-700",
  processing: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export const STATUS_LABELS: Record<TranscriptionStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};
