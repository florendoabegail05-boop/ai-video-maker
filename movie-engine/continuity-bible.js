"use strict";

const clean = v => String(v ?? "").replace(/\s+/g, " ").trim();
const id = (prefix, value) => `${prefix}-${clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unnamed"}`;

function createBible({ projectId = "project", characters = [], locations = [], props = [], style = {} } = {}) {
  const mapItems = (items, prefix) => items.map((item, index) => ({
    id: clean(item.id) || id(prefix, item.name || `${prefix}-${index + 1}`),
    name: clean(item.name) || `${prefix} ${index + 1}`,
    description: clean(item.description),
    locked: item.locked !== false,
    constraints: Array.isArray(item.constraints) ? item.constraints.map(clean).filter(Boolean) : []
  }));
  return {
    schemaVersion: 2, projectId: clean(projectId) || "project",
    characters: mapItems(characters, "character"), locations: mapItems(locations, "location"), props: mapItems(props, "prop"),
    style: { id: clean(style.id) || "style-master", name: clean(style.name) || "Master style", description: clean(style.description), palette: clean(style.palette), camera: clean(style.camera), lighting: clean(style.lighting), negative: Array.isArray(style.negative) ? style.negative.map(clean).filter(Boolean) : [], locked: style.locked !== false }
  };
}

function getLockedReferences(bible, shot = {}) {
  const ids = {
    characters: Array.isArray(shot.characters) ? shot.characters : [],
    locations: Array.isArray(shot.locations) ? shot.locations : [],
    props: Array.isArray(shot.props) ? shot.props : []
  };
  const find = (collection, wanted) => collection.filter(item => wanted.includes(item.id) && item.locked);
  return {
    characters: find(bible?.characters || [], ids.characters), locations: find(bible?.locations || [], ids.locations), props: find(bible?.props || [], ids.props),
    style: bible?.style?.locked ? bible.style : null
  };
}

function validateBible(bible) {
  const issues = [];
  if (!bible?.projectId) issues.push("Project ID is required");
  if (!bible?.style?.locked) issues.push("A locked master style is required");
  for (const collection of ["characters", "locations", "props"]) {
    const seen = new Set();
    for (const item of bible?.[collection] || []) {
      if (!item.id) issues.push(`${collection} item is missing ID`);
      if (seen.has(item.id)) issues.push(`Duplicate ${collection} ID: ${item.id}`);
      seen.add(item.id);
    }
  }
  return { ok: issues.length === 0, issues };
}

const api = Object.freeze({ createBible, getLockedReferences, validateBible });
if (typeof window !== "undefined") window.AIVM_CONTINUITY_BIBLE = api;
if (typeof module !== "undefined" && module.exports) module.exports = api;
