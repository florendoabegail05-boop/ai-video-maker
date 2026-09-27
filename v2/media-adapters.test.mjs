import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdapterDescriptor,canUseAdapter,motionInstruction,audioPlanForScene,qualityRiskProfile} from './media-adapters.mjs';

test('FREE ONLY accepts only verified free adapters',()=>{const free=createAdapterDescriptor({id:'local-motion',kind:'video',label:'Local motion',verified:true,freeOnly:true});assert.equal(canUseAdapter(free).allowed,true);const paid=createAdapterDescriptor({id:'paid',kind:'video',label:'Paid',verified:true,freeOnly:false});assert.equal(canUseAdapter(paid).allowed,false);assert.equal(canUseAdapter(paid,{costMode:'BEST QUALITY',ownerApproved:true}).allowed,true);});

test('unverified adapter is blocked',()=>{const adapter=createAdapterDescriptor({id:'x',kind:'voice',label:'Voice'});assert.match(canUseAdapter(adapter).reason,/not verified/i);});

test('motion instruction carries anti-flicker and preservation rules',()=>{const text=motionInstruction({direction:{motion:'Baby reaches for a toy',camera:'gentle push-in'}});assert.match(text,/Baby reaches/);assert.match(text,/flicker/);assert.match(text,/Preserve the approved source image/);});

test('audio plan separates dialogue and sound roles',()=>{const plan=audioPlanForScene({dialogue:'Hello',voiceId:'mom',ambience:'room tone',sfx:'door chime',musicCue:'soft piano',direction:{audioIntent:'leave space for speech'}});assert.equal(plan.dialogue,'Hello');assert.equal(plan.voiceId,'mom');assert.equal(plan.sfx,'door chime');});

test('quality risk profile never invents capabilities',()=>{const adapter=createAdapterDescriptor({id:'v',kind:'video',label:'V',verified:true,capabilities:{temporalConsistency:'medium',referenceImages:true,maxDuration:5,maxFps:24,nativeAudio:false}});const risk=qualityRiskProfile(adapter);assert.equal(risk.flickerRisk,'medium');assert.equal(risk.identityDriftRisk,'reduced');assert.equal(risk.nativeAudio,false);assert.equal(risk.lipSync,false);});

test('invalid adapter kind fails',()=>assert.throws(()=>createAdapterDescriptor({id:'x',kind:'unknown',label:'X'}),/Unsupported/));
