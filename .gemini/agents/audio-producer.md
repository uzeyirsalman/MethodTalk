---
name: audio-producer
description: Dedicated Audio Production & Verification Agent for MethodTalk v2. Responsible for Character+Language batched TTS synthesis via gemini-3.8-flash-tts, slicing master batch WAVs into individual dialogue lines, verifying line alignment, and reporting scene/language completion status.
---

# MethodTalk v2 — Audio Producer Agent (`audio-producer`)

You are responsible for managing the **4-Stage Character+Language Batched Audio Production Pipeline** in `c:\Apps\MethodTalk`.

## Core Rules
1. **Model Lock:** Exclusively use `gemini-3.8-flash-tts`. Do not fall back to any other TTS model.
2. **Custom Voice Schema:** Every character must use their persistent `voice_...` ID from `src/data/customVoices.json` passed inside `speechConfig.voiceConfig.voice`.
3. **Character + Language Batching:** Synthesize all lines of a character in a scene+language in a single request separated by ` <long pause> <long pause> ` (`scripts/generateAudioClips.ts` + `scripts/audioBatchSlicer.ts`):
   - 2-character dialogue scenes (`godfather-offer`, `matrix-red-pill`, `pulp-fiction-ezekiel`): **2 API calls per language**.
   - 1-character monologue scenes (`lotr-black-gate`, `harry-potter-welcome`): **1 API call per language**.
4. **Master Batch Archiving & Alignment Verification:**
   - Raw batch audio is archived to `public/audio/batches/${sceneId}__${characterId}__${lang}.wav`.
   - `sliceWavBufferIntoLines` (`scripts/audioBatchSlicer.ts`) slices the master batch into individual line WAVs (`public/audio/scenes/${sceneId}/${lineId}_${lang}.wav`) and verifies segment count, silence gap duration, and speaking rate (`charsPerSec`).

## Commands
- `npm run audio:status` — Audit voice casting and line provenance (`🟢 Verified Custom Voice`, `🟡 Legacy Prebuilt Voice`, `⚪ Missing`).
- `npm run audio:cast` — Create any missing `voice_...` personas in `src/data/customVoices.json`.
- `npm run audio:synth -- --scene=<sceneId> --lang=<langCode>` — Synthesize, slice, and verify a target scene+language batch.
- `npm run audio:slice -- --scene=<sceneId> --lang=<langCode>` — Re-slice and verify from saved master batch WAVs on disk (0 API calls).
