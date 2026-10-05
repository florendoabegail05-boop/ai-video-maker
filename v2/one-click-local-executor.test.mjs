import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes,addAsset,updateAsset,editScene} from './core.mjs';
import {createOneClickSession,oneClickCompletionStatus} from './one-click-orchestrator.mjs';
import {prepareNextOneClickDispatch} from './one-click-dispatch-envelope.mjs';
import {processOneClickDispatchResult} from './one-click-result-processor.mjs';
import {commitOneClickGeneratedMedia} from './one-click-media-commit.mjs';
import {executeOneClickLocalJob,bridgeFinalFacts} from './one-click-local-executor.mjs';
import {verifiedReleaseApprovalPreflight} from './verified-release-approval.mjs';
const report={imageFallback:{enabled:true},motionFallback:{enabled:true},tools:{ffmpeg:{available:true},ffprobe:{available:true}}};
const options={creation:{wantAudio:false,wantMotion:true,wantCaptions:true}};
const media={video:{width:1080,height:1920,fps:'30/1',codec:'h264'},audio:null,duration:1,bytes:5000,format:'mov,mp4'};
const fixture=()=>planScenes(createProject('A test garden'),1);
function api(overrides={}){return {bridgeCapabilities:async()=>report,inspectLocalMedia:async()=>media,
 generateImage:async()=>({blob:new Blob(['still']),sourcePath:'C:/test/still.ppm',name:'still.ppm',provider:'fallback',route:'basic-local-still'}),
 animateImage:async()=>({blob:new Blob(['clip']),sourcePath:'C:/test/clip.mp4',name:'clip.mp4',provider:'motion-fallback',route:'ffmpeg-camera-motion'}),
 assembleVideo:async()=>({outputPath:'C:/test/final.mp4',url:'http://127.0.0.1:8787/v1/exports/abc',media,bytes:5000}),...overrides};}
function imageDispatch(p){let s=createOneClickSession(p,report,options);const d=prepareNextOneClickDispatch(p,report,s,options);s=processOneClickDispatchResult(p,report,d.session,d.envelope,{ok:true},options).session;return prepareNextOneClickDispatch(p,report,s,options);}

test('local executor runs existing architecture through creation and machine verification, never approval',async()=>{
 let p=fixture(),s=createOneClickSession(p,report,options),output=null,factSets=[];
 for(let i=0;i<20;i++){
  const prepared=prepareNextOneClickDispatch(p,report,s,options);if(!prepared.prepared)break;
  const result=await executeOneClickLocalJob(()=>p,prepared.envelope,{api:api(),output});
  const processed=commitOneClickGeneratedMedia(p,report,prepared.session,prepared.envelope,result,options);
  assert.equal(processed.accepted,true);p=processed.project;s=processed.session;
  output=result.output||output;factSets=result.factSets||factSets;
 }
 const done=oneClickCompletionStatus(p,report,s,{...options,factSets});
 assert.equal(done.execution.progress.readyForVerification,true);
 assert.equal(done.state,'RIGHTS REVIEW REQUIRED');assert.equal(done.publishAuthorized,false);
 assert.equal(done.automaticPublishingAllowed,false);assert.equal(p.assets.length,2);
 assert.equal(factSets[0].raw.audioStream,false);assert.equal(factSets[0].raw.fps,30);
 assert.equal(verifiedReleaseApprovalPreflight(p,factSets).allowed,false);
});

test('generation completed after scene edit is rejected without deleting returned files',async()=>{
 let p=fixture();const prepared=imageDispatch(p);let created=false;
 await assert.rejects(()=>executeOneClickLocalJob(()=>p,prepared.envelope,{api:api({generateImage:async()=>{created=true;p=editScene(p,p.scenes[0].id,'Changed scene');return api().generateImage();}})}),/stale-generation|stale-dispatch/);
 assert.equal(created,true);assert.equal(p.assets.length,0);
});

test('hidden provider fallback is rejected instead of recording the guarded route',async()=>{
 const p=fixture(),prepared=imageDispatch(p);
 await assert.rejects(()=>executeOneClickLocalJob(()=>p,prepared.envelope,{api:api({generateImage:async()=>({...await api().generateImage(),provider:'unverified-provider'})})}),/Provider switched/);
 assert.equal(p.assets.length,0);
});

test('locked imported image is reused only after local file inspection and remains unchanged',async()=>{
 let p=fixture();p=addAsset(p,p.scenes[0].id,{kind:'image',name:'owner.png',provider:'local-import',hasFile:true,sourcePath:'C:/owner.png'});p=updateAsset(p,p.assets[0].id,'lock');
 const original=structuredClone(p);let inspections=0;
 const result=await executeOneClickLocalJob(()=>p,imageDispatch(p).envelope,{api:api({inspectLocalMedia:async()=>{inspections++;return media;},generateImage:async()=>{throw Error('must not generate');}})});
 assert.equal(result.reused,true);assert.equal(inspections,1);assert.deepEqual(p,original);
});

test('capability drift and mock reports cannot dispatch generation',async()=>{
 const p=fixture(),prepared=imageDispatch(p);
 await assert.rejects(()=>executeOneClickLocalJob(()=>p,prepared.envelope,{api:api({bridgeCapabilities:async()=>({...report,imageFallback:{enabled:false}})})}),/Route unavailable/);
 await assert.rejects(()=>executeOneClickLocalJob(()=>p,prepared.envelope,{api:api({bridgeCapabilities:async()=>({...report,mock:true})})}),/Mock/);
});

test('bridge fact adapter preserves unknowns and explicit absence without native audio claims',()=>{
 const p=fixture();const unknown=bridgeFinalFacts(p,{}),absent=bridgeFinalFacts(p,media);
 assert.equal(unknown.raw.fps,null);assert.equal(unknown.raw.width,null);assert.equal(unknown.raw.audioStream,null);
 assert.equal(absent.raw.audioStream,false);assert.equal(absent.raw.fps,30);
 assert.equal(absent.evidence.nativeAudio,undefined);
});

test('an envelope cannot redirect guarded generation to another scene',async()=>{
 const p=planScenes(createProject('Two scenes'),10),prepared=imageDispatch(p);
 const changed={...prepared.envelope,sceneId:p.scenes[1].id,payload:{...prepared.envelope.payload,sceneId:p.scenes[1].id}};
 await assert.rejects(()=>executeOneClickLocalJob(()=>p,changed,{api:api()}),/dispatch-scene-guard-mismatch/);
 assert.equal(p.assets.length,0);
});

test('provider request boundary pins fallback routes and preserves the accepted result shape',async()=>{
 let p=fixture(),s=createOneClickSession(p,report,options);const calls=[];
 const localApi=api({generateImage:async(...args)=>{calls.push(['image',args]);return api().generateImage();},animateImage:async(...args)=>{calls.push(['motion',args]);return api().animateImage();}});
 for(let i=0;i<4;i++){
  const d=prepareNextOneClickDispatch(p,report,s,options);assert.equal(d.prepared,true);
  const result=await executeOneClickLocalJob(()=>p,d.envelope,{api:localApi});
  const next=commitOneClickGeneratedMedia(p,report,d.session,d.envelope,result,options);assert.equal(next.accepted,true);p=next.project;s=next.session;
 }
 assert.equal(calls.filter(c=>c[0]==='image').length,1);assert.equal(calls.filter(c=>c[0]==='motion').length,1);
 assert.equal(calls[0][1][2],'basic-local-still');assert.equal(calls[1][1][3],'ffmpeg-camera-motion');
 assert.equal(p.assets.length,2);
});

test('provider request boundary refuses mock, unavailable and mismatched reports without generation',async()=>{
 const p=fixture(),d=imageDispatch(p);let calls=0;
 for(const changed of [{...report,mock:true},{},{...report,freeOnlyImageWorkflow:true}]){
  await assert.rejects(()=>executeOneClickLocalJob(()=>p,d.envelope,{api:api({bridgeCapabilities:async()=>changed,generateImage:async()=>{calls++;throw Error('unexpected generation');}})}),/Mock|Route unavailable|Provider request not ready/);
 }
 assert.equal(calls,0);
});

test('execution rejects all unsafe envelope permissions before calling generation',async()=>{
 const p=fixture(),d=imageDispatch(p);let calls=0;
 for(const flag of ['paidProviderAllowed','externalUploadAllowed','destructiveReplacementAllowed','automaticPublishingAllowed','publishAuthorized']){
  await assert.rejects(()=>executeOneClickLocalJob(()=>p,{...d.envelope,[flag]:true},{api:api({generateImage:async()=>{calls++;}})}));
 }
 assert.equal(calls,0);
});

test('verified ComfyUI references fail closed without a resolver; reference-free generation works',async()=>{
 const p=fixture();const comfy={...report,freeOnlyImageWorkflow:true,supportsCharacterReferences:true,supportsWorldReferences:true,referenceForwardingEnabled:true};
 let s=createOneClickSession(p,comfy,options);let d=prepareNextOneClickDispatch(p,comfy,s,options);s=processOneClickDispatchResult(p,comfy,d.session,d.envelope,{ok:true},options).session;d=prepareNextOneClickDispatch(p,comfy,s,options);
 let calls=0;const localApi=api({bridgeCapabilities:async()=>comfy,generateImage:async(...args)=>{calls++;assert.equal(args.length,3);assert.equal(args[2],'local-comfyui');return {...await api().generateImage(),provider:'comfyui',route:'local-comfyui'};}});
 const withRefs=structuredClone(d.envelope);withRefs.payload.characterReferenceIds=['approved-character'];
 await assert.rejects(()=>executeOneClickLocalJob(()=>p,withRefs,{api:localApi}),/reference resolver unavailable/);assert.equal(calls,0);
 const result=await executeOneClickLocalJob(()=>p,d.envelope,{api:localApi});assert.equal(result.ok,true);assert.equal(calls,1);
});

test('fallback reference IDs are metadata only and never passed as provider arguments',async()=>{
 const p=fixture(),d=imageDispatch(p);d.envelope.payload.characterReferenceIds=['approved-character'];d.envelope.payload.worldReferenceIds=['approved-world'];
 let captured;await executeOneClickLocalJob(()=>p,d.envelope,{api:api({generateImage:async(...args)=>{captured=args;return api().generateImage();}})});
 assert.equal(captured.length,3);assert.doesNotMatch(JSON.stringify(captured),/approved-character|approved-world|sourcePath|includeBytes/);
});

test('a not-ready provider request cannot execute even when legacy motion routing is available',async()=>{
 let p=fixture(),s=createOneClickSession(p,report,options);
 for(let i=0;i<2;i++){const d=prepareNextOneClickDispatch(p,report,s,options);const r=await executeOneClickLocalJob(()=>p,d.envelope,{api:api()});const n=commitOneClickGeneratedMedia(p,report,d.session,d.envelope,r,options);p=n.project;s=n.session;}
 const d=prepareNextOneClickDispatch(p,report,s,options);assert.equal(d.envelope.jobType,'motion');let calls=0;
 await assert.rejects(()=>executeOneClickLocalJob(()=>p,d.envelope,{api:api({bridgeCapabilities:async()=>({...report,tools:{ffmpeg:{available:true},ffprobe:{available:false}}}),animateImage:async()=>{calls++;}})}),/Provider request not ready/);
 assert.equal(calls,0);
});
