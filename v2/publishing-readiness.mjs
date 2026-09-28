import {runTechnicalQc} from './technical-qc.mjs';
import {publishingDetails,finalVerificationStatus} from './publishing.mjs';
import {reusableAsset,selectedProjectAudio} from './core.mjs';
import {renderSignature} from './render-signature.mjs';

function item(id,label,state,message,blocking=false){return{id,label,state,message,blocking};}

export function publishingReadiness(project){
  if(!project)return {state:'NO PROJECT',readyForOwnerReview:false,items:[],summary:{blocking:0,warnings:0,passed:0}};
  const qc=runTechnicalQc(project,{targetAspect:'9:16'});
  const details=publishingDetails(project);
  const scenes=project.scenes||[];
  const clipCoverage=scenes.length?scenes.filter(scene=>!!reusableAsset(project,scene.id,'video')).length:0;
  const verification=finalVerificationStatus(project);
  const finalVerified=verification.fresh;
  const audioPresent=!!selectedProjectAudio(project,'music')||!!selectedProjectAudio(project,'voice');
  const captionsPresent=scenes.some(scene=>String(scene.caption||'').trim());
  const verificationMessage=finalVerified
    ?'Passed deterministic final-media verification for the current render inputs.'
    :verification.saved
      ?'Saved final MP4 verification is stale because render inputs changed. Re-assemble/download and verify the current final MP4.'
      :'Verify the downloaded final MP4 facts before owner review.';

  const items=[
    item('scene-plan','Scene plan',scenes.length?'pass':'block',scenes.length?`${scenes.length} scene${scenes.length===1?'':'s'} planned.`:'Create a scene plan first.',!scenes.length),
    item('clip-coverage','Final scene clips',scenes.length&&clipCoverage===scenes.length?'pass':'block',scenes.length?`${clipCoverage}/${scenes.length} scenes have an eligible saved video clip.`:'No scene clips yet.',!(scenes.length&&clipCoverage===scenes.length)),
    item('technical-qc','Technical QC',qc.passed?'pass':'block',qc.passed?`No deterministic blocking errors. ${qc.summary.warnings} warning${qc.summary.warnings===1?'':'s'} remain.`:`${qc.summary.errors} blocking error${qc.summary.errors===1?'':'s'} detected.`,!qc.passed),
    item('publishing-title','Publishing title',String(details.title||'').trim()?'pass':'block',String(details.title||'').trim()?'Saved title is present.':'Save a publishing title.',!String(details.title||'').trim()),
    item('final-verification','Final MP4 facts',finalVerified?'pass':'block',verificationMessage,!finalVerified),
    item('captions','Captions',captionsPresent?'pass':'optional',captionsPresent?'Scene captions are present.':'No scene captions saved; optional unless the video needs them.'),
    item('audio','Project audio',audioPresent?'pass':'optional',audioPresent?'A saved project audio track is present.':'No project music/voice track selected; optional depending on the video.'),
    item('human-review','Human visual/audio review','owner','Required: watch the complete final MP4 for motion, continuity, framing, flicker, identity, lip-sync and audio quality.'),
    item('rights-review','Rights / credits / platform settings','owner','Required: confirm rights/credits plus destination audience, disclosure and publishing settings.')
  ];

  const blocking=items.filter(entry=>entry.blocking).length;
  const warnings=items.filter(entry=>entry.state==='optional').length;
  const passed=items.filter(entry=>entry.state==='pass').length;
  const readyForOwnerReview=blocking===0;
  return {
    state:readyForOwnerReview?'OWNER REVIEW REQUIRED':'NOT READY',
    readyForOwnerReview,
    renderSignature:renderSignature(project),
    finalVerification:verification,
    items,
    summary:{blocking,warnings,passed},
    technicalQc:qc
  };
}

export function ownerReadyChecklist(project){
  const readiness=publishingReadiness(project);
  return {
    schema:1,
    kind:'aivm-v2-owner-review-checklist',
    projectId:project?.id||null,
    projectRevision:Number(project?.revision)||0,
    renderSignature:readiness.renderSignature||null,
    state:readiness.state,
    deterministicChecksPassed:readiness.readyForOwnerReview,
    checks:readiness.items.map(({id,label,state,message,blocking})=>({id,label,state,message,blocking})),
    ownerActions:[
      'Watch the complete downloaded MP4 and approve visual/audio quality.',
      'Confirm all imported/generated media can be published and add required credits.',
      'Confirm destination platform audience, disclosure, monetization and upload settings.',
      'Upload/publish manually only after those owner checks are complete.'
    ],
    note:'This checklist informs owner review; it does not publish, upload, or claim artistic quality was automatically verified.'
  };
}
