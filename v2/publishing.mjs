import {revise, validateProjectBackup, captionsForTimeline, reusableAsset, selectedProjectAudio} from './core.mjs';
import {renderSignature,verificationFreshness} from './render-signature.mjs';
import {portableProvenanceSummary,portableAssetName} from './asset-provenance.mjs';

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

function portableProvider(value){
  const provider=String(value??'').replace(/\s+/g,' ').trim().slice(0,120);
  if(!provider)return null;
  if(/[\\/]/.test(provider))return null;
  if(/^(?:[a-zA-Z]:|[a-z][a-z0-9+.-]*:)/i.test(provider))return null;
  return provider;
}

export function setPublishingDetails(project, values) {
  if (project.costMode !== 'FREE ONLY') throw Error('Publishing preparation requires FREE ONLY.');
  return revise(project, {...project, publishing: {...(project.publishing||{}), ...normalizeDetails(values)}});
}

export function setFinalVerification(project, verification) {
  if (!verification || verification.kind !== 'aivm-v2-final-output-manifest') throw Error('Final-output verification manifest is invalid.');
  if (verification.projectId !== project.id) throw Error('Final-output verification belongs to a different project.');
  if (verification.verified !== true) throw Error('Only a passed final-output verification can be saved as verified.');
  const currentSignature=renderSignature(project);
  if(!verification.renderSignature||verification.renderSignature!==currentSignature)throw Error('Final-output verification does not match the current render inputs. Re-verify the current final MP4.');
  const safe = {
    kind: verification.kind,
    schema: verification.schema,
    projectId: verification.projectId,
    projectRevision: verification.projectRevision,
    renderSignature:verification.renderSignature,
    verifiedAt: verification.verifiedAt,
    verified: true,
    expected: verification.expected,
    actual: verification.actual,
    issues: Array.isArray(verification.issues)?verification.issues.map(item=>({code:item.code,severity:item.severity,message:item.message})):[],
    provider: portableProvider(verification.provider)
  };
  return revise(project,{...project,publishing:{...(project.publishing||{}),finalVerification:safe}});
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

function publishingVerification(project){
  const saved=project.publishing?.finalVerification;
  const freshness=verificationFreshness(project,saved);
  if(!freshness.fresh)return null;
  return {
    verifiedAt:saved.verifiedAt||null,
    projectRevision:saved.projectRevision??null,
    renderSignature:saved.renderSignature,
    expected:saved.expected||null,
    actual:saved.actual||null,
    issues:Array.isArray(saved.issues)?saved.issues:[],
    provider:portableProvider(saved.provider)
  };
}

export function finalVerificationStatus(project){
  const saved=project?.publishing?.finalVerification;
  const freshness=verificationFreshness(project,saved);
  return {saved:!!saved,fresh:freshness.fresh,reason:freshness.reason,verifiedAt:saved?.verifiedAt||null,renderSignature:saved?.renderSignature||null,currentSignature:freshness.currentSignature};
}

// Export only portable, explicitly chosen metadata. Never include local paths,
// bridge links, project history, prompts, reference instructions or media bytes.
export function makePublishingPackage(project) {
  validateProjectBackup(project);
  if (!project.scenes.length) throw Error('Create a scene plan before exporting a publishing package.');
  const details = normalizeDetails(publishingDetails(project));
  const finalVerification=publishingVerification(project);
  const provenance=portableProvenanceSummary(project);
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
    finalVerification
      ? 'Final MP4 deterministic media facts were verified for the current saved render inputs; visual realism, identity consistency, anatomy and flicker still require human review.'
      : 'Final MP4 verification is missing or stale for the current render inputs.',
    'Captions are manually entered scene text, not a speech transcript. Avoid adding these subtitles twice if the final video already has burned-in captions.'
  ];
  const missing = scenes.filter(scene => !scene.selectedClipId).map(scene => scene.order);
  if (missing.length) warnings.push(`No eligible local clip is recorded for scene(s): ${missing.join(', ')}.`);
  if(!provenance.complete)warnings.push(`${provenance.summary.needingReview} asset rights/source record${provenance.summary.needingReview===1?'':'s'} still require owner review before manual publishing.`);
  return {schema: 1, kind: 'aivm-v2-publishing-package', costMode: 'FREE ONLY',
    projectId: project.id, projectRevision: project.revision, ...details,
    renderSignature:renderSignature(project),
    plannedDuration: start, finalVideoVerified: !!finalVerification, finalOutput:finalVerification, scenes,
    audio: Object.fromEntries(['music', 'voice'].map(role => [role, selectedProjectAudio(project, role)?.id || null])),
    assets: project.assets.map(asset => ({id: asset.id, sceneId: asset.sceneId, kind: asset.kind,
      name: portableAssetName(asset.name)||asset.id, provider: portableProvider(asset.provider), status: asset.status,
      locked: !!asset.locked, reference: !!asset.reference})),
    provenance,
    captionsSrt: captionSrt(project), warnings,
    reviewChecklist: [
      'Watch the complete downloaded MP4: check motion, continuity, framing, captions and audio.',
      'Confirm the title and description accurately describe the finished video.',
      'Confirm permission to publish every imported image, clip, voice and music track; add required credits.',
      'Review the destination platform’s audience, disclosure and publishing settings before uploading manually.'
    ]};
}
