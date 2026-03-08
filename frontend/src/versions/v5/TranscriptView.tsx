import { Link, useParams } from "react-router-dom";
import { useTranscription } from "../../hooks/useTranscription";
import { STATUS_LABELS } from "../../utils/status";
import { formatDate } from "../../utils/time";

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

function formatDuration(segments: Segment[]): string {
  if (segments.length === 0) return "—";
  const last = segments[segments.length - 1];
  const totalSeconds = Math.ceil(last.end);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
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

export function TranscriptView() {
  const { id } = useParams<{ id: string }>();
  const { job, loading, error } = useTranscription(id);

  if (loading) {
    return (
      <div className="flex gap-8">
        <div className="w-32 shrink-0" />
        <p className="py-16 font-['JetBrains_Mono',monospace] text-[11px] text-[#888888]">
          Loading...
        </p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div>
        <div className="flex gap-8">
          <div className="w-32 shrink-0" />
          <div className="py-16">
            <Link
              to="/5"
              className="font-['JetBrains_Mono',monospace] text-[11px] uppercase tracking-[0.15em] text-[#888888] no-underline transition-colors duration-200 hover:text-[#111111]"
            >
              ← Back
            </Link>
            <p className="mt-8 font-['DM_Sans',sans-serif] text-sm text-[#888888]">
              {error ?? "Transcription not found."}
            </p>
          </div>
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
    <article>
      {/* Back link — Swiss grid aligned */}
      <div className="flex gap-8">
        <div className="w-32 shrink-0" />
        <Link
          to="/5"
          className="font-['JetBrains_Mono',monospace] text-[11px] uppercase tracking-[0.15em] text-[#888888] no-underline transition-colors duration-200 hover:text-[#111111]"
        >
          ← Back
        </Link>
      </div>

      {/* DRAMATIC headline — oversized Swiss type */}
      <div className="mt-12 flex gap-8">
        <div className="w-32 shrink-0" />
        <h1 className="flex-1 font-['DM_Sans',sans-serif] text-5xl font-black leading-[1.1] tracking-tight text-[#111111] md:text-6xl">
          {job.file_name}
        </h1>
      </div>

      {/* Red structural accent line */}
      <div className="mt-8 flex gap-8">
        <div className="w-32 shrink-0" />
        <div className="h-1 w-16 bg-[#dc2626]" />
      </div>

      {/* Structured metadata row */}
      <div className="mt-8 flex gap-8">
        <div className="w-32 shrink-0">
          <span className="font-['JetBrains_Mono',monospace] text-[10px] uppercase tracking-[0.2em] text-[#888888]">
            Details
          </span>
        </div>
        <div className="flex flex-1 gap-12">
          {/* Status */}
          <div>
            <span className="block font-['JetBrains_Mono',monospace] text-[10px] uppercase tracking-[0.2em] text-[#888888]">
              Status
            </span>
            <span className="mt-1 block font-['DM_Sans',sans-serif] text-sm font-bold text-[#111111]">
              {STATUS_LABELS[job.status]}
            </span>
          </div>

          {/* Date */}
          <div>
            <span className="block font-['JetBrains_Mono',monospace] text-[10px] uppercase tracking-[0.2em] text-[#888888]">
              Date
            </span>
            <span className="mt-1 block font-['DM_Sans',sans-serif] text-sm text-[#111111]">
              {formatDate(job.completed_at ?? job.created_at)}
            </span>
          </div>

          {/* Duration — only if segments available */}
          {segments && segments.length > 0 && (
            <div>
              <span className="block font-['JetBrains_Mono',monospace] text-[10px] uppercase tracking-[0.2em] text-[#888888]">
                Duration
              </span>
              <span className="mt-1 block font-['JetBrains_Mono',monospace] text-sm text-[#111111]">
                {formatDuration(segments)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Black rule divider */}
      <div className="mt-8 border-t-2 border-[#111111]" />

      {/* Failed state */}
      {job.status === "failed" && job.error && (
        <div className="mt-8 flex gap-8">
          <div className="w-32 shrink-0">
            <span className="font-['JetBrains_Mono',monospace] text-[10px] uppercase tracking-[0.2em] text-[#dc2626]">
              Error
            </span>
          </div>
          <p className="flex-1 font-['DM_Sans',sans-serif] text-sm text-[#dc2626]">
            {job.error}
          </p>
        </div>
      )}

      {/* Processing / Pending state */}
      {(job.status === "pending" || job.status === "processing") && (
        <div className="mt-12 flex gap-8">
          <div className="w-32 shrink-0" />
          <div className="flex items-center gap-3">
            <div className="h-1 w-1 animate-pulse bg-[#dc2626]" />
            <span className="font-['DM_Sans',sans-serif] text-sm text-[#888888]">
              Transcription in progress
            </span>
          </div>
        </div>
      )}

      {/* Completed — Transcript content */}
      {job.status === "completed" && (
        <div className="mt-12">
          {/* Plain text — no segments */}
          {job.result_text && !segments && (
            <div className="flex gap-8">
              <div className="w-32 shrink-0">
                <span className="font-['JetBrains_Mono',monospace] text-[10px] uppercase tracking-[0.2em] text-[#888888]">
                  Transcript
                </span>
              </div>
              <div className="flex-1 whitespace-pre-wrap font-['DM_Sans',sans-serif] text-base leading-[2] text-[#111111]">
                {job.result_text}
              </div>
            </div>
          )}

          {/* Segments — TRUE two-column layout: timestamp left, text right */}
          {segments && segments.length > 0 && (
            <div>
              {/* Section label */}
              <div className="mb-6 flex gap-8">
                <div className="w-32 shrink-0">
                  <span className="font-['JetBrains_Mono',monospace] text-[10px] uppercase tracking-[0.2em] text-[#888888]">
                    Transcript
                  </span>
                </div>
                <div className="flex-1" />
              </div>

              {/* Segment rows */}
              {segments.map((seg, i) => (
                <div key={i} className="flex gap-8">
                  {/* Timestamp in left margin — JetBrains Mono */}
                  <div className="w-32 shrink-0 pt-[3px] text-right">
                    <span className="font-['JetBrains_Mono',monospace] text-[11px] text-[#888888]">
                      {formatTimestamp(seg.start)}
                    </span>
                  </div>

                  {/* Text in right content area — generous line spacing */}
                  <div
                    className={`flex-1 border-t font-['DM_Sans',sans-serif] text-base leading-[2] text-[#111111] ${
                      i === 0 ? "border-transparent" : "border-[#e5e5e5]"
                    } py-4`}
                  >
                    {seg.text}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Full text below segments */}
          {job.result_text && segments && segments.length > 0 && (
            <div className="mt-16">
              <div className="border-t-2 border-[#111111]" />
              <div className="mt-8 flex gap-8">
                <div className="w-32 shrink-0">
                  <span className="font-['JetBrains_Mono',monospace] text-[10px] uppercase tracking-[0.2em] text-[#888888]">
                    Full Text
                  </span>
                </div>
                <div className="flex-1 whitespace-pre-wrap font-['DM_Sans',sans-serif] text-base leading-[2] text-[#111111]">
                  {job.result_text}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
