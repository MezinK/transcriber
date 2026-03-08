import type { TranscriptionStatus, WorkerStatus } from "../types";

export const STATUS_DOT: Record<TranscriptionStatus, string> = {
  pending: "bg-gray-400",
  processing: "bg-amber-400",
  completed: "bg-green-500",
  failed: "bg-red-500",
};

export const STATUS_PILL: Record<TranscriptionStatus, string> = {
  pending: "bg-gray-100 text-gray-700",
  processing: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

export const STATUS_LABEL: Record<TranscriptionStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

export const WORKER_STATUS_LABEL: Record<WorkerStatus, string> = {
  idle: "Idle",
  processing: "Processing",
  stale: "Stale",
};

export const WORKER_STATUS_DOT: Record<WorkerStatus, string> = {
  idle: "bg-green-500",
  processing: "bg-amber-400",
  stale: "bg-red-500",
};
