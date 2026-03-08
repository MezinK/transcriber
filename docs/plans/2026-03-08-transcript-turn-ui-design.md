# Transcript Turn UI Design

**Goal**

Render completed transcripts as a structured speaker-turn view and support inline speaker renaming directly on the transcript page.

## Current State

The backend now returns `speakers` and `turns`, but the current frontend detail page is too minimal and does not present the transcript in a readable structure. The target experience is a row-based transcript view similar to transcript review tools, not a plain block of text.

## Decision

Use a turn-oriented transcript layout with three visible columns:

- timestamp
- speaker name
- transcript text

Each turn is one row. Speaker names are editable inline, and each speaker has a persistent color derived from `speaker_key`.

## Layout

### Desktop

The transcript body should render as a 3-column grid:

- left column: timestamp
- middle column: speaker label
- right column: turn text

Each row should include a slim colored vertical accent tied to the speaker.

### Mobile

Rows should collapse into stacked cards:

- timestamp and speaker on top
- turn text below

The speaker color should remain visible in the row marker or label.

## Interaction

### Speaker Rename

Speaker names are editable inline.

Behavior:

- click speaker name to enter edit mode
- `Enter` submits
- `Escape` cancels
- blur submits if value changed
- disable only the active editor while saving
- on success, update local speaker state from the server response
- on failure, preserve previous name and show inline feedback

Renaming is transcript-local and uses the existing rename endpoint.

## Color Model

Colors must be stable per `speaker_key`, not per display name. Renaming `Speaker 1` to `Alice` must not change the assigned color.

Use a deterministic mapping from `speaker_key` to a small curated palette. Avoid random colors and avoid storing colors in the database.

## Data Flow

1. Transcript page fetches one transcription.
2. The page builds a lookup map from `speaker_key` to display metadata.
3. Turns render by joining `turn.speaker_key` with the speaker map.
4. Rename action calls `PATCH /transcriptions/{id}/speakers/{speaker_key}`.
5. The response replaces local transcription state.

## Error Handling

- pending/processing/failed banners remain above the transcript area
- completed transcripts with no turns show an empty-state message
- rename failures show a small inline error near the edited speaker field

## Out of Scope

- raw segment/debug transcript UI
- speaker merging/splitting
- global speaker identity across transcripts
- confidence coloring

## Testing

### Frontend

- build/typecheck must pass
- manual smoke test:
  - transcript rows render
  - timestamps show correctly
  - speaker colors remain stable
  - renaming one speaker updates all matching turns
  - pending/processing/failed states still render

### Backend

- existing rename endpoint contract remains unchanged
