import {auditProjectIntegrity} from './project-integrity.mjs';

const MAX_TOTAL_BYTES=100*1024*1024;
const MAX_METADATA_BYTES=1024*1024;
const MAX_FILES=501;
const ALLOWED_EXT=new Set(['png','jpg','jpeg','webp','ppm','mp4','mov','webm','wav','mp3','m4a','ogg','flac']);

function issue(code,severity,message,details={}){return{code,severity,message,...details};}
function ext(name=''){const value=String(name).split('.').at(-1)?.toLowerCase()||'';return value;}
function jsonBytes(value){try{return new TextEncoder().encode(JSON.stringify(value)).length;}catch{return Infinity;}}

export function backupPreflight(project,{knownFileSizes={}}={}){
  const issues=[];
  const integrity=auditProjectIntegrity(project);
  if(!integrity.passed)issues.push(issue('PROJECT_INTEGRITY','error','Project integrity must pass before creating a complete backup.'));

  const metadataBytes=jsonBytes(project);
  if(metadataBytes>MAX_METADATA_BYTES)issues.push(issue('METADATA_TOO_LARGE','error',`Project metadata is ${metadataBytes} bytes; complete backup metadata must stay at or below ${MAX_METADATA_BYTES} bytes.`));

  const assets=Array.isArray(project?.assets)?project.assets:[];
  const withFiles=assets.filter(asset=>asset.hasFile);
  if(withFiles.length+1>MAX_FILES)issues.push(issue('TOO_MANY_FILES','error',`Backup would contain ${withFiles.length+1} files; limit is ${MAX_FILES}.`));

  let knownBytes=metadataBytes===Infinity?0:metadataBytes;
  let unknownSizes=0;
  for(const asset of withFiles){
    const extension=ext(asset.name);
    if(!ALLOWED_EXT.has(extension))issues.push(issue('UNSUPPORTED_EXTENSION','error',`Asset ${asset.name||asset.id} uses unsupported backup extension: ${extension||'(none)'}.`,{assetId:asset.id}));
    const size=Number(knownFileSizes[asset.id]??asset.size);
    if(Number.isFinite(size)&&size>=0)knownBytes+=size;
    else unknownSizes+=1;
    if(!asset.sourcePath)issues.push(issue('FILE_NOT_CONNECTED','warning',`Asset ${asset.name||asset.id} is marked as having a file but has no connected local source path.`,{assetId:asset.id}));
  }
  if(knownBytes>MAX_TOTAL_BYTES)issues.push(issue('BACKUP_TOO_LARGE','error',`Known backup size is about ${knownBytes} bytes, above the 100 MB complete-backup limit.`));
  if(unknownSizes)issues.push(issue('UNKNOWN_FILE_SIZE','warning',`${unknownSizes} media file${unknownSizes===1?'':'s'} have unknown size; final bundle creation may still refuse the backup if the 100 MB limit is exceeded.`));

  if(project?.prompt)issues.push(issue('PROMPT_INCLUDED','info','Complete ZIP backups intentionally include full project metadata such as the project prompt. Treat the ZIP as private owner data.'));
  if((project?.history||[]).length)issues.push(issue('HISTORY_INCLUDED','info','Complete ZIP backups include bounded project revision history. Treat the ZIP as private owner data.'));

  const errors=issues.filter(item=>item.severity==='error').length;
  const warnings=issues.filter(item=>item.severity==='warning').length;
  const info=issues.filter(item=>item.severity==='info').length;
  return{
    allowed:errors===0,
    issues,
    summary:{errors,warnings,info,assets:assets.length,files:withFiles.length+1,metadataBytes,knownBytes,unknownSizes},
    privacyNote:'A complete ZIP is a private recovery artifact, not a publishing package. It may contain prompts, project history and media bytes. Do not upload it publicly unless the owner intentionally chooses to do so.',
    portabilityNote:'Restored media must be reconnected to the local bridge/runtime; sourcePath values are not relied on as portable file locations.'
  };
}

export function portableBackupReceipt(project,preflight=backupPreflight(project)){
  return{
    schema:1,
    kind:'aivm-v2-backup-preflight-receipt',
    projectId:project?.id||null,
    projectRevision:Number(project?.revision)||0,
    allowed:preflight.allowed,
    summary:preflight.summary,
    issues:preflight.issues.map(({code,severity,message,assetId})=>({code,severity,message,...(assetId?{assetId}:{})})),
    privacyNote:preflight.privacyNote,
    portabilityNote:preflight.portabilityNote
  };
}
