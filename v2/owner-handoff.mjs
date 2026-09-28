import {publishingReadiness,ownerReadyChecklist} from './publishing-readiness.mjs';
import {publishingDetails,finalVerificationStatus} from './publishing.mjs';
import {reusableAsset,selectedProjectAudio} from './core.mjs';
import {renderSignature} from './render-signature.mjs';

export function makeOwnerHandoffPackage(project){
  if(!project?.id)throw Error('Select a project first.');
  const readiness=publishingReadiness(project);
  const details=publishingDetails(project);
  const verification=finalVerificationStatus(project);
  const scenes=(project.scenes||[]).map((scene,index)=>({
    sceneId:scene.id,
    order:index+1,
    duration:Number(scene.duration)||0,
    selectedClipId:reusableAsset(project,scene.id,'video')?.id||null,
    captionPresent:!!String(scene.caption||'').trim()
  }));
  const blockers=readiness.items.filter(item=>item.blocking).map(item=>({id:item.id,label:item.label,message:item.message}));
  return {
    schema:1,
    kind:'aivm-v2-owner-handoff',
    costMode:'FREE ONLY',
    projectId:project.id,
    projectRevision:Number(project.revision)||0,
    renderSignature:renderSignature(project),
    state:readiness.state,
    deterministicChecksPassed:readiness.readyForOwnerReview,
    title:String(details.title||''),
    descriptionPresent:!!String(details.description||'').trim(),
    finalVideoVerification:{saved:verification.saved,fresh:verification.fresh,verifiedAt:verification.fresh?verification.verifiedAt:null},
    timeline:{sceneCount:scenes.length,plannedDuration:scenes.reduce((sum,scene)=>sum+scene.duration,0),scenes},
    audio:{musicAssetId:selectedProjectAudio(project,'music')?.id||null,voiceAssetId:selectedProjectAudio(project,'voice')?.id||null},
    blockers,
    ownerChecklist:ownerReadyChecklist(project),
    nextAction:readiness.readyForOwnerReview
      ?'Owner: watch the complete final MP4, review rights/credits/platform settings, then decide whether to publish manually.'
      :'Resolve the listed deterministic blockers, render/download the current final MP4 if needed, and re-run verification before owner review.',
    note:'Portable handoff metadata only. It excludes prompts, local file paths, bridge URLs, media bytes and project history. It never publishes or uploads anything.'
  };
}
