export type TranscriptionStatus = "pending" | "processing" | "completed" | "failed";

export type MediaType = "audio" | "video";

export type WorkerStatus = "idle" | "processing" | "stale";

export interface Segment {
  start: number;
  end: number;
  text: string;
  words: { word: string; start: number; end: number; probability: number }[];
  avg_logprob: number;
  no_speech_prob: number;
}

export interface SegmentsData {
  segments: Segment[];
}

export interface Transcription {
  id: string;
  source_filename: string;
  media_type: MediaType;
  status: TranscriptionStatus;
  attempt_count: number;
  error: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  transcript_text: string | null;
  segments_json: SegmentsData | null;
}

export interface TranscriptionListResponse {
  items: Transcription[];
  total: number;
}

export interface Worker {
  id: string;
  label: string | null;
  status: WorkerStatus;
  started_at: string;
  last_heartbeat: string;
  current_transcription_id: string | null;
  last_error: string | null;
}

export interface WorkerListResponse {
  items: Worker[];
  total: number;
}
