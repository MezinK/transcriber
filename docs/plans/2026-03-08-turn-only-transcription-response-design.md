# Turn-Only Transcription Response Design

**Goal**

Reduce normal transcription response payload size and align the frontend with the new speaker-turn transcript model by removing raw ASR artifacts from the default API response.

## Current State

The backend now stores canonical transcript data in `speakers_json` and `turns_json`, but the frontend still expects the older payload shape:

- `transcript_text`
- `segments_json`

This mismatch causes two problems:

1. The detail page is still segment-oriented instead of turn-oriented.
2. The backend spends time serializing `segments_json` even though the main UI does not need it for normal polling and detail rendering.

## Decision

Use a turn-only default API contract.

`GET /transcriptions` and `GET /transcriptions/{id}` should return:

- metadata
- `speakers`
- `turns`

They should no longer return:

- `transcript_text`
- `segments_json`

`segments_json` remains stored in `transcription_artifacts` for internal use, debugging, or a future dedicated detailed/raw endpoint.

## API Contract

### List and Detail Responses

Each transcription response should include:

- `id`
- `source_filename`
- `media_type`
- `status`
- `attempt_count`
- `error`
- `created_at`
- `updated_at`
- `completed_at`
- `speakers`
- `turns`

### Speakers Shape

```json
[
  { "speaker_key": "speaker_0", "display_name": "Speaker 1" },
  { "speaker_key": "speaker_1", "display_name": "Speaker 2" }
]
```

### Turns Shape

```json
[
  {
    "speaker_key": "speaker_0",
    "start": 0.0,
    "end": 6.8,
    "text": "Hello, today we're going to look into this weather app."
  }
]
```

## Frontend Rendering

The transcript detail page should become turn-driven:

- build a local speaker name lookup from `speakers`
- render each turn as a timed row
- show the resolved display name for each `speaker_key`
- show `turn.text` as the transcript body

The page should not fall back to `transcript_text` or raw segments.

If `turns` is empty:

- `pending`: show waiting state
- `processing`: show in-progress state
- `failed`: show the failure banner
- `completed`: show an empty transcript placeholder

## Error Handling

The contract is intentionally breaking. No compatibility layer is required.

Frontend code should fail fast at compile time by removing the old fields from the shared TypeScript types.

## Testing

### Backend

- update response schema tests to assert `segments_json` is absent
- keep existing storage behavior unchanged

### Frontend

- update TypeScript types to remove `transcript_text` and `segments_json`
- add or update component tests if present, otherwise verify with build/typecheck
- verify the transcript page renders turns and speaker names correctly

## Future Extension

If the product later needs a raw/debug transcript view, add a dedicated artifact endpoint such as:

- `GET /transcriptions/{id}/segments`

That keeps the main API slim while preserving access to raw ASR output when explicitly requested.
