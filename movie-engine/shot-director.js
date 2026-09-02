"use strict";

const clean = v => String(v ?? "").replace(/\s+/g, " ").trim();
const choose = (index, list) => list[index % list.length];

function buildShot({ shotNumber, durationSeconds = 5, beat, action, emotion = "natural", bible, previousShot = null, format = "9:16" } = {}) {
  if (!Number.isInteger(shotNumber) || shotNumber < 1) throw new Error("shotNumber must be a positive integer");
  const refs = typeof globalThis !== "undefined" && globalThis.AIVM_CONTINUITY_BIBLE?.getLockedReferences
    ? globalThis.AIVM_CONTINUITY_BIBLE.getLockedReferences(bible || {}, beat || {})
    : { characters: [], locations: [], props: [], style: null };
  const shotSizes = ["wide establishing", "medium action", "medium close-up", "close-up", "detail insert"];
  const movements = ["slow push-in", "smooth tracking move", "gentle pan", "subtle handheld drift", "locked-off hold"];
  const compositions = ["clear foreground/background separation", "rule-of-thirds subject placement", "centered readable silhouette", "leading lines toward the action"];
  const size = choose(shotNumber - 1, shotSizes);
  const movement = choose(shotNumber - 1, movements);
  const composition = choose(shotNumber - 1, compositions);
  const lockedText = [...refs.characters, ...refs.locations, ...refs.props].map(x => `${x.name}: ${x.description}`).join(" | ");
  const styleText = refs.style ? `${refs.style.name}: ${refs.style.description}. Palette: ${refs.style.palette}. Camera: ${refs.style.camera}. Lighting: ${refs.style.lighting}.` : "consistent master visual style";
  const continuity = previousShot ? `Continue directly from ${previousShot.shotId}. Preserve screen direction, character pose, prop placement and lighting direction unless the story explicitly changes them.` : "Establish the visual baseline for the sequence.";
  const negative = refs.style?.negative?.join(", ") || "text, watermark, logo, extra limbs, duplicate subjects, unstable identity, warped hands, flicker";
  const visualPrompt = [styleText, lockedText, `Shot ${shotNumber}: ${size}, ${composition}.`, `Action: ${clean(action)}. Emotion: ${clean(emotion)}.`, continuity, `Format ${format}. High-detail cinematic composition.`, `Avoid: ${negative}.`].filter(Boolean).join(" ");
  const motionPrompt = `${clean(action)}. ${movement}; natural acceleration and deceleration; physically plausible motion; preserve identity and environment; end in a pose that can hand off to the next shot. ${continuity}`;
  return {
    schemaVersion: 2, shotId: `shot-${String(shotNumber).padStart(3, "0")}`, number: shotNumber,
    durationSeconds: Math.max(1, Number(durationSeconds) || 5), beat: clean(beat?.type || beat || "scene"), objective: clean(beat?.objective), emotion: clean(emotion),
    framing: size, cameraMovement: movement, composition, visualPrompt, motionPrompt,
    continuityIn: previousShot?.shotId || null, continuityOut: `shot-${String(shotNumber + 1).padStart(3, "0")}`,
    references: { characters: refs.characters.map(x => x.id), locations: refs.locations.map(x => x.id), props: refs.props.map(x => x.id) }
  };
}

function buildShotList({ story, bible, actions = [], format = "9:16" } = {}) {
  const beats = story?.beats || [];
  return beats.map((beat, index) => buildShot({ shotNumber: index + 1, durationSeconds: beat.duration, beat, action: actions[index] || beat.objective, emotion: choose(index, ["curious", "hopeful", "surprised", "determined", "joyful", "warm"]), bible, previousShot: index ? { shotId: `shot-${String(index).padStart(3, "0")}` } : null, format }));
}

const api = Object.freeze({ buildShot, buildShotList });
if (typeof window !== "undefined") window.AIVM_SHOT_DIRECTOR = api;
if (typeof module !== "undefined" && module.exports) module.exports = api;
