from services.transcript_assembly import build_transcript_artifacts, rename_speaker


def test_build_transcript_artifacts_groups_words_into_speaker_turns():
    words = [
        {"word": "Hello,", "start": 0.0, "end": 0.4},
        {"word": "today", "start": 0.4, "end": 0.8},
        {"word": "we're", "start": 0.8, "end": 1.2},
        {"word": "talking", "start": 1.2, "end": 1.6},
        {"word": "now.", "start": 1.6, "end": 2.0},
        {"word": "Hi.", "start": 2.1, "end": 2.4},
    ]
    speaker_spans = [
        {"speaker_key": "speaker_0", "start": 0.0, "end": 2.05},
        {"speaker_key": "speaker_1", "start": 2.05, "end": 2.5},
    ]

    result = build_transcript_artifacts(words=words, speaker_spans=speaker_spans)

    assert result.speakers == [
        {"speaker_key": "speaker_0", "display_name": "Speaker 1"},
        {"speaker_key": "speaker_1", "display_name": "Speaker 2"},
    ]
    assert result.turns == [
        {
            "speaker_key": "speaker_0",
            "start": 0.0,
            "end": 2.0,
            "text": "Hello, today we're talking now.",
        },
        {
            "speaker_key": "speaker_1",
            "start": 2.1,
            "end": 2.4,
            "text": "Hi.",
        },
    ]


def test_build_transcript_artifacts_falls_back_to_unknown_speaker():
    words = [
        {"word": "No", "start": 0.0, "end": 0.2},
        {"word": "match.", "start": 0.2, "end": 0.4},
    ]

    result = build_transcript_artifacts(words=words, speaker_spans=[])

    assert result.speakers == [
        {"speaker_key": "unknown", "display_name": "Unknown Speaker"}
    ]
    assert result.turns == [
        {
            "speaker_key": "unknown",
            "start": 0.0,
            "end": 0.4,
            "text": "No match.",
        }
    ]


def test_rename_speaker_updates_only_matching_entry():
    speakers = [
        {"speaker_key": "speaker_0", "display_name": "Speaker 1"},
        {"speaker_key": "speaker_1", "display_name": "Speaker 2"},
    ]

    renamed = rename_speaker(
        speakers=speakers,
        speaker_key="speaker_1",
        display_name="Alice",
    )

    assert renamed == [
        {"speaker_key": "speaker_0", "display_name": "Speaker 1"},
        {"speaker_key": "speaker_1", "display_name": "Alice"},
    ]
