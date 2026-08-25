---
name: helix-video-production
description: >
  Produce a finished video from a prompt — script, storyboard with an approval
  gate, generate/collect assets, assemble, and render — driven by the coding
  agent, with a hard budget cap. Use whenever the user works on video creation,
  a marketing/launch/demo video, ad creative, "make a video", storyboard,
  b-roll, voiceover video, social video, or "סרטון שיווקי", "סרטון הדגמה",
  "וידאו לרשתות" — without naming a library. Clean-room replacement for
  OpenMontage (AGPL); orchestrate permissive parts + provider APIs, never copy
  OpenMontage code. Homes: HELIX marketing service, OPS video content, demo-video.
metadata:
  type: reference
license: MIT (this skill) — orchestrates ffmpeg (LGPL build) + pluggable provider APIs + helix-tts; no OpenMontage code
---

# HELIX video-production — prompt to finished video

## Clean-room note
This is a **clean-room** capability skill. Video production is orchestration +
provider APIs; none of it needs OpenMontage's code. Do NOT read or copy from
OpenMontage (AGPL-3.0). Build from a JSON pipeline, ffmpeg (LGPL build), and
swappable media providers.

## The pipeline (what OpenMontage does, rebuilt clean)
1. **Brief → script** — the agent turns the prompt into a scene-by-scene script
   (JSON: scenes[], each with narration, visual intent, duration). Sanitize any
   narration through [[helix-clean-text]] before it's spoken/burned in.
2. **Storyboard = approval gate** — render a contact sheet (one card per scene:
   visual prompt, chosen provider, estimated cost, duration). **Nothing expensive
   runs until the user approves.** This gate is the whole point — no surprise bills.
3. **Asset generation (pluggable providers)** — per scene, pick a source:
   - Video: fal.ai / Runway / Veo / Seedance (paid) OR stock (Pexels/Pixabay,
     free keys) OR a screen clip from [[helix-screen-recording]].
   - Image: FLUX / Imagen / Recraft (paid) OR stock. Strip metadata with
     [[strip-image-metadata]].
   - Provider is an interface (`generate(prompt, opts) -> assetUrl`) so any
     backend swaps in; default to the cheapest that meets the quality bar.
4. **Voice/audio** — narration via [[helix-tts]] / [[voice-cloning-feature]]
   (authentic HELIX voice); music/SFX from a royalty-free library or a provider.
5. **Assemble** — ffmpeg (**LGPL build**, not GPL) concatenates clips, lays
   narration + music, adds captions/lower-thirds, transitions. Or a render API
   (e.g. Shotstack) if you don't want to run ffmpeg.
6. **Render + deliver** — export MP4 (H.264) + a vertical 9:16 cut for social;
   store in Supabase; return a share link via [[helix-screen-recording]]'s
   sharing pattern.

## Budget governance baked in (the part that matters)
- **Cost estimate BEFORE execution** — sum per-scene provider costs at the
  storyboard gate; show the total.
- **Spend cap** — a hard ceiling per video; the pipeline stops and asks rather
  than blowing past it. Log every provider call + dollar spent.
- **Cheapest-that-works** — prefer stock/local/free providers; only call premium
  video-gen when the scene needs it.
- **Cache assets** — a re-render with the same scene reuses the generated asset;
  never regenerate (and re-pay) for an unchanged scene.

## HELIX rules baked in
- **RTL/Hebrew captions** — right-aligned, correct font; burned-in text needs the
  Hebrew-font handling from [[helix-pdf]].
- **Brand** — HELIX intro/outro, palette, and per-product accent (see product
  accent rule); voice via the cloned HELIX voice, not a generic TTS.
- **Storage keys** — sanitize with the [[helix-docx]] key sanitizer.
- **No em-dash / no raw emojis** in on-screen copy (HELIX content rules).

## Product mapping
- **Marketing service** — launch/demo/ad videos for HELIX and for clients.
- **OPS** — social video content in the content pipeline.
- **STAGE** — startup launch/waitlist videos.
- **demo-video / Sign & Forms / SHOP** — product walkthroughs and explainers.

## Guardrails
- Storyboard approval gate + cost estimate before any paid generation.
- Hard spend cap; log every provider call and cost.
- Providers behind one interface; default to cheapest/free that meets quality.
- ffmpeg LGPL build (avoid GPL); or a render API.
- Never copy OpenMontage (AGPL) source — this is orchestration clean-room.
