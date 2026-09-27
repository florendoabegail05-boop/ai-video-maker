import {revise, validateProjectBackup, captionsForTimeline, reusableAsset, selectedProjectAudio} from './core.mjs';

export function publishingDetails(project) {
  return {title: project.publishing?.title ?? project.name ?? '', description: project.publishing?.description ?? ''};
}

function normalizeDetails(values) {
  const title = String(values.title ?? '').trim();
  const description = String(values.description ?? '').replace(/\r\n?/g, '\n').trim();
  if (!title || title.length > 100) throw Error('Use a title between 1 and 100 characters.');
  if (description.length > 5000) throw Error('Description must be 5000 characters or fewer.');
  return {title, description};
}

export function setPublishingDetails(project, values) {
  if (project.costMode !== 'FREE ONLY') throw Error('Publishing preparation requires FREE ONLY.');
  return revise(project, {...project, publishing: normalizeDetails(values)});
}

function srtTime(seconds) {
  const ms = Math.round(seconds * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
}

export function captionSrt(project) {
  validateProjectBackup(project);
  return captionsForTimeline(project).map((caption, index) =>
    `${index + 1}\n${srtTime(caption.start)} --> ${srtTime(caption.end)}\n${caption.text.replace(/\s+/g, ' ')}\n`
  ).join('\n');
}

// Export only portable, explicitly chosen metadata. Never include local paths,
// bridge links, project history, prompts, reference instructions or media bytes.
export function makePublishingPackage(project) {
  validateProjectBackup(project);
  if (!project.scenes.length) throw Error('Create a scene plan before exporting a publishing package.');
  const details = normalizeDetails(publishingDetails(project));
  let start = 0;
  const scenes = project.scenes.map((scene, index) => {
    const clip = reusableAsset(project, scene.id, 'video');
    const row = {sceneId: scene.id, order: index + 1, start, end: start + scene.duration,
      caption: String(scene.caption || '').trim(), selectedClipId: clip?.id || null};
    start = row.end;
    return row;
  });
  const warnings = [
    'Metadata only: download the final MP4 and media files separately.',
    'Clip selection reflects saved metadata; local file availability and final MP4 quality are not verified by this package.',
    'Captions are manually entered scene text, not a speech transcript. Avoid adding these subtitles twice if the final video already has burned-in captions.'
  ];
  const missing = scenes.filter(scene => !scene.selectedClipId).map(scene => scene.order);
  if (missing.length) warnings.push(`No eligible local clip is recorded for scene(s): ${missing.join(', ')}.`);
  return {schema: 1, kind: 'aivm-v2-publishing-package', costMode: 'FREE ONLY',
    projectId: project.id, projectRevision: project.revision, ...details,
    plannedDuration: start, finalVideoVerified: false, scenes,
    audio: Object.fromEntries(['music', 'voice'].map(role => [role, selectedProjectAudio(project, role)?.id || null])),
    assets: project.assets.map(asset => ({id: asset.id, sceneId: asset.sceneId, kind: asset.kind,
      name: asset.name, provider: asset.provider || null, status: asset.status,
      locked: !!asset.locked, reference: !!asset.reference})),
    captionsSrt: captionSrt(project), warnings,
    reviewChecklist: [
      'Watch the complete downloaded MP4: check motion, continuity, framing, captions and audio.',
      'Confirm the title and description accurately describe the finished video.',
      'Confirm permission to publish every imported image, clip, voice and music track; add required credits.',
      'Review the destination platform’s audience, disclosure and publishing settings before uploading manually.'
    ]};
}
