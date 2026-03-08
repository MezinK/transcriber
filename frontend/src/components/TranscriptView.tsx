import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { renameSpeaker } from "../api/client";
import { useTranscription } from "../hooks/useTranscription";
import { formatTimestamp } from "../utils/format";
import { STATUS_LABEL } from "../utils/status";
import { formatDate } from "../utils/time";
import type { Speaker, Transcription, TranscriptionStatus } from "../types";

const TEXT_COLOR: Record<TranscriptionStatus, string> = {
  pending: "text-sky-500",
  processing: "text-amber-500",
  completed: "text-emerald-500",
  failed: "text-red-500",
};

const SPEAKER_STYLES = [
  {
    bar: "bg-sky-400",
    label: "text-sky-200",
    button: "hover:bg-sky-500/10 hover:text-sky-100",
    ring: "focus:ring-sky-400/40",
  },
  {
    bar: "bg-rose-400",
    label: "text-rose-200",
    button: "hover:bg-rose-500/10 hover:text-rose-100",
    ring: "focus:ring-rose-400/40",
  },
  {
    bar: "bg-emerald-400",
    label: "text-emerald-200",
    button: "hover:bg-emerald-500/10 hover:text-emerald-100",
    ring: "focus:ring-emerald-400/40",
  },
  {
    bar: "bg-amber-400",
    label: "text-amber-200",
    button: "hover:bg-amber-500/10 hover:text-amber-100",
    ring: "focus:ring-amber-400/40",
  },
  {
    bar: "bg-violet-400",
    label: "text-violet-200",
    button: "hover:bg-violet-500/10 hover:text-violet-100",
    ring: "focus:ring-violet-400/40",
  },
  {
    bar: "bg-cyan-400",
    label: "text-cyan-200",
    button: "hover:bg-cyan-500/10 hover:text-cyan-100",
    ring: "focus:ring-cyan-400/40",
  },
];

function hashSpeakerKey(speakerKey: string): number {
  let hash = 0;
  for (let i = 0; i < speakerKey.length; i += 1) {
    hash = (hash * 31 + speakerKey.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getSpeakerStyle(speakerKey: string) {
  return SPEAKER_STYLES[hashSpeakerKey(speakerKey) % SPEAKER_STYLES.length];
}

function getSpeakerDisplayName(
  speakers: Speaker[] | null | undefined,
  speakerKey: string,
) {
  return (
    speakers?.find((speaker) => speaker.speaker_key === speakerKey)?.display_name ??
    speakerKey
  );
}

export function TranscriptView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { job, loading, error } = useTranscription(id);
  const [localJob, setLocalJob] = useState<Transcription | null>(null);
  const [speakerDrafts, setSpeakerDrafts] = useState<Record<string, string>>({});
  const [savingSpeakerKey, setSavingSpeakerKey] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<{
    speakerKey: string;
    message: string;
  } | null>(null);
  const resolvedTranscript = localJob ?? job;

  const speakersByKey = useMemo(
    () =>
      new Map(
        (resolvedTranscript?.speakers ?? []).map((speaker) => [
          speaker.speaker_key,
          speaker.display_name,
        ]),
      ),
    [resolvedTranscript?.speakers],
  );

  useEffect(() => {
    setLocalJob(job);
    setSpeakerDrafts(
      Object.fromEntries(
        (job?.speakers ?? []).map((speaker) => [
          speaker.speaker_key,
          speaker.display_name,
        ]),
      ),
    );
  }, [job]);

  if (loading) {
    return <p className="text-zinc-500 text-sm">Loading...</p>;
  }

  if (error || !resolvedTranscript) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-zinc-400 text-sm mb-1">Transcription not found</p>
        <p className="text-zinc-600 text-xs mb-6">
          The page you're looking for doesn't exist.
        </p>
        <button
          onClick={() => navigate("/")}
          className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
        >
          &larr; Back to transcriptions
        </button>
      </div>
    );
  }

  const currentTranscript: Transcription = resolvedTranscript;

  async function commitRename(speakerKey: string) {
    if (!id) return;
    const nextName = (
      speakerDrafts[speakerKey] ??
      getSpeakerDisplayName(currentTranscript.speakers, speakerKey)
    ).trim();
    const currentName = getSpeakerDisplayName(currentTranscript.speakers, speakerKey);

    if (!nextName) {
      setRenameError({
        speakerKey,
        message: "Speaker name is required.",
      });
      return;
    }

    if (nextName === currentName) {
      setRenameError(null);
      return;
    }

    try {
      setSavingSpeakerKey(speakerKey);
      setRenameError(null);
      const updated = await renameSpeaker(id, speakerKey, nextName);
      setLocalJob(updated);
      setSpeakerDrafts(
        Object.fromEntries(
          (updated.speakers ?? []).map((speaker) => [
            speaker.speaker_key,
            speaker.display_name,
          ]),
        ),
      );
    } catch (renameErr) {
      setRenameError({
        speakerKey,
        message:
          renameErr instanceof Error ? renameErr.message : "Failed to rename speaker",
      });
    } finally {
      setSavingSpeakerKey(null);
    }
  }

  return (
    <div>
      <button
        onClick={() => navigate("/")}
        className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm mb-6 inline-block"
      >
        &larr; Back
      </button>

      <h1 className="text-2xl font-semibold text-zinc-100 mb-3">
        {currentTranscript.source_filename}
      </h1>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mb-8">
        <span className={TEXT_COLOR[currentTranscript.status]}>
          {STATUS_LABEL[currentTranscript.status]}
        </span>
        <span className="text-zinc-500">{currentTranscript.media_type}</span>
        <span className="text-zinc-500">
          Created {formatDate(currentTranscript.created_at)}
        </span>
        {currentTranscript.completed_at && (
          <span className="text-zinc-500">
            Completed {formatDate(currentTranscript.completed_at)}
          </span>
        )}
      </div>

      {currentTranscript.status === "failed" && currentTranscript.error && (
        <div className="bg-zinc-900 rounded-lg p-4 mb-6 border-l-4 border-red-500">
          <p className="text-red-400 text-sm">{currentTranscript.error}</p>
        </div>
      )}

      {currentTranscript.status === "processing" && (
        <div className="bg-zinc-900 rounded-lg p-4 mb-6 border-l-4 border-amber-500">
          <p className="text-amber-500 text-sm">Transcription in progress...</p>
        </div>
      )}

      {currentTranscript.status === "pending" && (
        <div className="bg-zinc-900 rounded-lg p-4 mb-6 border-l-4 border-sky-500">
          <p className="text-sky-500 text-sm">Waiting for a worker...</p>
        </div>
      )}

      {currentTranscript.turns && currentTranscript.turns.length > 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[72px_180px_minmax(0,1fr)] gap-4 px-5 py-3 border-b border-zinc-900 text-[11px] uppercase tracking-[0.24em] text-zinc-600">
            <span>Time</span>
            <span>Speaker</span>
            <span>Transcript</span>
          </div>

          <div className="divide-y divide-zinc-900">
            {currentTranscript.turns.map((turn, index) => {
              const speakerKey = turn.speaker_key;
              const style = getSpeakerStyle(speakerKey);
              const isSaving = savingSpeakerKey === speakerKey;
              const speakerName =
                speakerDrafts[speakerKey] ??
                speakersByKey.get(speakerKey) ??
                getSpeakerDisplayName(currentTranscript.speakers, speakerKey);

              return (
                <div
                  key={`${speakerKey}-${turn.start}-${index}`}
                  className="grid gap-3 px-4 py-4 md:grid-cols-[72px_180px_minmax(0,1fr)] md:gap-4 md:px-5"
                >
                  <div className="text-xs font-mono text-zinc-500 md:pt-1">
                    {formatTimestamp(turn.start)}
                  </div>

                  <div className="md:pt-0.5">
                    <div className="space-y-2">
                      <label
                        className={`flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 transition focus-within:border-zinc-700 ${style.button}`}
                      >
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${style.bar}`}
                          aria-hidden="true"
                        />
                        <input
                          value={speakerName}
                          onChange={(e) => {
                            const nextName = e.target.value;
                            setSpeakerDrafts((current) => ({
                              ...current,
                              [speakerKey]: nextName,
                            }));
                            if (renameError?.speakerKey === speakerKey) {
                              setRenameError(null);
                            }
                          }}
                          onBlur={() => void commitRename(speakerKey)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void commitRename(speakerKey);
                            } else if (e.key === "Escape") {
                              e.preventDefault();
                              setSpeakerDrafts((current) => ({
                                ...current,
                                [speakerKey]:
                                  speakersByKey.get(speakerKey) ??
                                  getSpeakerDisplayName(
                                    currentTranscript.speakers,
                                    speakerKey,
                                  ),
                              }));
                              setRenameError(null);
                            }
                          }}
                          disabled={isSaving}
                          className={`min-w-0 flex-1 bg-transparent text-sm font-medium ${style.label} outline-none placeholder:text-zinc-600`}
                          placeholder="Speaker"
                          aria-label={`Rename ${speakerName}`}
                        />
                      </label>
                      {renameError?.speakerKey === speakerKey && (
                        <p className="text-xs text-rose-300">{renameError.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex gap-3">
                      <span
                        className={`mt-1 hidden h-auto w-1.5 shrink-0 rounded-full md:block ${style.bar}`}
                        aria-hidden="true"
                      />
                      <p className="text-sm leading-7 text-zinc-200 whitespace-pre-wrap">
                        {turn.text}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : currentTranscript.status === "completed" ? (
        <p className="text-zinc-500 text-sm">
          No speaker turns were produced for this transcription.
        </p>
      ) : null}
    </div>
  );
}
