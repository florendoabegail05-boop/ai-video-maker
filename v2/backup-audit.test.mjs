import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes,addAsset} from './core.mjs';
import {backupPreflight,portableBackupReceipt} from './backup-audit.mjs';

test('healthy small project is backup-eligible and labeled private',()=>{
  let project=planScenes(createProject('Private owner prompt','Backup'),5);
  const scene=project.scenes[0].id;
  project=addAsset(project,scene,{kind:'image',name:'still.png',hasFile:true,size:2048,sourcePath:'C:/local/still.png',provider:'local-import'});
  const report=backupPreflight(project);
  assert.equal(report.allowed,true);
  assert.equal(report.summary.errors,0);
  assert.match(report.privacyNote,/private recovery artifact/i);
  assert.ok(report.issues.some(item=>item.code==='PROMPT_INCLUDED'&&item.severity==='info'));
  const receipt=portableBackupReceipt(project,report);
  assert.equal(receipt.kind,'aivm-v2-backup-preflight-receipt');
  assert.doesNotMatch(JSON.stringify(receipt),/C:\/local|Private owner prompt/);
});

test('unsupported extension blocks complete backup',()=>{
  let project=planScenes(createProject('Story'),5);
  project=addAsset(project,project.scenes[0].id,{kind:'image',name:'unsafe.exe',hasFile:true,size:100,sourcePath:'C:/unsafe.exe',provider:'local-import'});
  const report=backupPreflight(project);
  assert.equal(report.allowed,false);
  assert.ok(report.issues.some(item=>item.code==='UNSUPPORTED_EXTENSION'&&item.severity==='error'));
});

test('known total above 100 MB is refused before bundle creation',()=>{
  let project=planScenes(createProject('Story'),5);
  project=addAsset(project,project.scenes[0].id,{kind:'video',name:'large.mp4',hasFile:true,size:101*1024*1024,sourcePath:'C:/large.mp4',provider:'local-import'});
  const report=backupPreflight(project);
  assert.equal(report.allowed,false);
  assert.ok(report.issues.some(item=>item.code==='BACKUP_TOO_LARGE'));
});

test('missing source path is warning rather than destructive repair',()=>{
  let project=planScenes(createProject('Story'),5);
  project=addAsset(project,project.scenes[0].id,{kind:'image',name:'still.png',hasFile:true,size:100,provider:'local-import'});
  const before=JSON.stringify(project);
  const report=backupPreflight(project);
  assert.equal(JSON.stringify(project),before);
  assert.ok(report.issues.some(item=>item.code==='FILE_NOT_CONNECTED'&&item.severity==='warning'));
});
