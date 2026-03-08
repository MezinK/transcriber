import { Link, useParams } from "react-router-dom";
import { useTranscription } from "../../hooks/useTranscription";
import { STATUS_LABELS } from "../../utils/status";
import { formatDate } from "../../utils/time";
import type { TranscriptionStatus } from "../../types";

interface Segment {
  start: number;
  end: number;
  text: string;
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function isSegmentArray(value: unknown): value is Segment[] {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return false;
  const first = value[0] as Record<string, unknown>;
  return (
    typeof first === "object" &&
    first !== null &&
    "start" in first &&
    "text" in first
  );
}

const STATUS_PILL_COLORS: Record<TranscriptionStatus, string> = {
  pending: "text-[#6b6560] border-[#6b6560]/30",
  processing: "text-amber-600 border-amber-400/40",
  completed: "text-[#c43e1c] border-[#c43e1c]/30",
  failed: "text-red-600 border-red-400/40",
};

const STATUS_DOT_COLORS: Record<TranscriptionStatus, string> = {
  pending: "bg-[#6b6560]",
  processing: "bg-amber-500",
  completed: "bg-[#c43e1c]",
  failed: "bg-red-600",
};

export function TranscriptView() {
  const { id } = useParams<{ id: string }>();
  const { job, loading, error } = useTranscription(id);

  if (loading) {
    return (
      <div className="animate-pulse space-y-8">
        <div className="h-3 w-16 rounded-sm bg-[#e8e4de]" />
        <div className="space-y-3">
          <div className="h-8 w-80 rounded-sm bg-[#e8e4de]" />
          <div className="h-3 w-32 rounded-sm bg-[#e8e4de]/60" />
        </div>
        <div className="h-px bg-[#e8e4de]" />
        <div className="space-y-4 pt-4">
          <div className="h-4 w-full rounded-sm bg-[#e8e4de]/40" />
          <div className="h-4 w-5/6 rounded-sm bg-[#e8e4de]/40" />
          <div className="h-4 w-4/6 rounded-sm bg-[#e8e4de]/40" />
          <div className="h-4 w-full rounded-sm bg-[#e8e4de]/40" />
          <div className="h-4 w-3/4 rounded-sm bg-[#e8e4de]/40" />
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="space-y-8">
        <Link
          to="/1"
          className="font-['DM_Sans',sans-serif] text-xs font-medium tracking-wide text-[#6b6560] transition-colors duration-300 hover:text-[#1a1a1a]"
        >
          ← Back
        </Link>
        <div className="border-l-2 border-[#c43e1c] py-2 pl-4 font-['DM_Sans',sans-serif] text-sm text-[#c43e1c]">
          {error ?? "Transcription not found"}
        </div>
      </div>
    );
  }

  const segments: Segment[] | null =
    job.result_json && "segments" in job.result_json
      ? isSegmentArray(job.result_json.segments)
        ? (job.result_json.segments as Segment[])
        : null
      : null;

  return (
    <div>
      {/* Back link */}
      <Link
        to="/1"
        className="inline-block font-['DM_Sans',sans-serif] text-xs font-medium tracking-wide text-[#6b6560] transition-colors duration-300 hover:text-[#1a1a1a]"
      >
        ← Back
      </Link>

      {/* Header area — dramatic typographic hierarchy */}
      <div className="mt-10">
        <h1 className="font-['Playfair_Display',serif] text-3xl font-bold leading-tight tracking-tight text-[#1a1a1a] sm:text-4xl">
          {job.file_name}
        </h1>

        {/* Status pill + date */}
        <div className="mt-4 flex items-center gap-4">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-['DM_Sans',sans-serif] text-[10px] font-medium uppercase tracking-[0.15em] ${STATUS_PILL_COLORS[job.status]}`}
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_DOT_COLORS[job.status]} ${
                job.status === "processing" ? "animate-pulse" : ""
              }`}
            />
            {STATUS_LABELS[job.status]}
          </span>
          <span className="font-['JetBrains_Mono',monospace] text-[11px] text-[#6b6560]">
            {formatDate(job.created_at)}
          </span>
        </div>
      </div>

      {/* Hairline divider */}
      <div className="mt-8 h-px bg-[#e8e4de]" />

      {/* Error for failed jobs */}
      {job.status === "failed" && job.error && (
        <div className="mt-8 border-l-2 border-red-500 py-2 pl-4 font-['DM_Sans',sans-serif] text-sm text-red-600">
          {job.error}
        </div>
      )}

      {/* Pending / processing states */}
      {(job.status === "pending" || job.status === "processing") && (
        <div className="mt-12 flex items-center gap-3 py-8">
          <div className="h-4 w-4 animate-spin rounded-full border border-[#e8e4de] border-t-[#1a1a1a]" />
          <span className="font-['DM_Sans',sans-serif] text-sm tracking-wide text-[#6b6560]">
            {job.status === "pending"
              ? "Waiting to process…"
              : "Transcribing your recording…"}
          </span>
        </div>
      )}

      {/* Transcript content — optimized for beautiful reading */}
      {job.status === "completed" && (
        <div className="mt-10 max-w-3xl">
          {/* Plain text — article-style typesetting */}
          {job.result_text && (
            <div className="mb-12">
              <p className="whitespace-pre-wrap font-['Crimson_Pro',serif] text-lg leading-[1.85] text-[#1a1a1a]">
                {job.result_text}
              </p>
            </div>
          )}

          {/* Timestamped segments — editorial layout */}
          {segments && segments.length > 0 && (
            <div>
              <div className="mb-6 flex items-center gap-4">
                <h2 className="font-['DM_Sans',sans-serif] text-[10px] font-medium uppercase tracking-[0.2em] text-[#6b6560]">
                  Timestamped Transcript
                </h2>
                <div className="h-px flex-1 bg-[#e8e4de]" />
              </div>

              <div className="space-y-0">
                {segments.map((seg, i) => (
                  <div
                    key={i}
                    className="group flex gap-6 border-b border-[#e8e4de]/50 py-3 transition-colors duration-300 last:border-b-0 hover:bg-[#f5f3ed]"
                  >
                    <span className="shrink-0 pt-0.5 font-['JetBrains_Mono',monospace] text-[11px] tabular-nums text-[#6b6560]/60">
                      {formatTimestamp(seg.start)}
                    </span>
                    <span className="font-['Crimson_Pro',serif] text-lg leading-relaxed text-[#1a1a1a]">
                      {seg.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
