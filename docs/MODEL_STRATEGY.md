# Model Strategy (provider-neutral)

This document records evaluation targets, not hard dependencies. Models and licenses change; verify the current model card/license before shipping any provider.

## Video

Evaluate LTX, Wan, HunyuanVideo and other strong open-weight video families for text-to-video, image-to-video, video-to-video and editing. The application should select by capability, quality, latency, hardware fit and license—not by a hard-coded vendor name.

## Voice

Evaluate lightweight local TTS such as Kokoro for a zero-cost baseline, plus stronger expressive/multilingual models such as Chatterbox, F5-TTS, Fish Speech or newer models as hardware permits. Voice cloning must require explicit user authorization and should preserve provenance/consent metadata.

## Music and SFX

Treat music and sound effects as separate capabilities so the system can use specialized models or royalty-safe libraries. Generated audio should carry source/license metadata. Do not assume that an open-weight model's code, weights and generated-output rights are identical.

## Selection policy

1. Prefer models that can run locally when the user's hardware allows it.
2. Prefer permissive commercial terms when all other factors are comparable.
3. Keep a hosted-provider adapter as an optional escape hatch for users without suitable hardware.
4. Never put provider credentials in the browser.
5. Store provider/model/version metadata with every generated asset.
6. Keep the project contract independent from provider request/response formats.
7. Re-evaluate model quality periodically using the same internal test scenes.

## Quality benchmark scenes

Maintain a small deterministic benchmark set covering:

- close-up dialogue
- two-person interaction
- walking/action
- hands and object interaction
- camera movement
- lighting transition
- emotional performance
- continuity from a previous shot
- speech/music/SFX mixing

The benchmark is more valuable than choosing a model from a leaderboard alone because the app's prompts, continuity system and assembly pipeline materially affect perceived quality.

## $0 reality

Open-weight does not mean zero compute cost. Local video generation can require substantial GPU memory and time. Until suitable hardware is available, keep the app useful without generation and support optional hosted/free-tier adapters without coupling the core product to them.
