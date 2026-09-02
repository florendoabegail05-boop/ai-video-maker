"use strict";

function clean(value) { return String(value ?? "").trim(); }

function createContinuityLedger() {
  return { schemaVersion: 1, facts: new Map(), characterStates: new Map(), locationStates: new Map(), shotLinks: new Map() };
}

function rememberFact(ledger, key, value, source = "story") {
  const k = clean(key);
  if (!k) throw new Error("Continuity fact key is required");
  ledger.facts.set(k, { value, source: clean(source) || "story" });
  return ledger;
}

function rememberCharacter(ledger, characterId, state, shotId = null) {
  const id = clean(characterId);
  if (!id) throw new Error("characterId is required");
  ledger.characterStates.set(id, { ...state, lastShotId: shotId ? clean(shotId) : null });
  return ledger;
}

function rememberLocation(ledger, locationId, state, shotId = null) {
  const id = clean(locationId);
  if (!id) throw new Error("locationId is required");
  ledger.locationStates.set(id, { ...state, lastShotId: shotId ? clean(shotId) : null });
  return ledger;
}

function linkShots(ledger, previousShotId, nextShotId, handoff = {}) {
  if (!clean(previousShotId) || !clean(nextShotId)) throw new Error("Both shot IDs are required");
  ledger.shotLinks.set(clean(nextShotId), { previousShotId: clean(previousShotId), handoff: { ...handoff } });
  return ledger;
}

function snapshot(ledger) {
  return {
    schemaVersion: ledger.schemaVersion,
    facts: Object.fromEntries(ledger.facts),
    characterStates: Object.fromEntries(ledger.characterStates),
    locationStates: Object.fromEntries(ledger.locationStates),
    shotLinks: Object.fromEntries(ledger.shotLinks)
  };
}

const api = Object.freeze({ createContinuityLedger, rememberFact, rememberCharacter, rememberLocation, linkShots, snapshot });
if (typeof window !== "undefined") window.AIVM_CONTINUITY = api;
if (typeof module !== "undefined" && module.exports) module.exports = api;
