const PORTABLE_KINDS=new Set([
  'aivm-v2-publishing-package',
  'aivm-v2-owner-review-checklist',
  'aivm-v2-provenance-summary',
  'aivm-v2-owner-release-approval',
  'aivm-v2-release-envelope',
  'aivm-v2-owner-handoff'
]);
const PRIVATE_KINDS=new Set(['aivm-v2-project-backup','aivm-v2-complete-backup']);
const SENSITIVE_KEYS=new Set(['sourcePath','outputPath','bridgeUrl','prompt','history','mediaBytes','bytesBase64','filePath']);

function findings(value,path='$',out=[]){
  if(value===null||value===undefined)return out;
  if(Array.isArray(value)){value.forEach((item,index)=>findings(item,`${path}[${index}]`,out));return out;}
  if(typeof value!=='object')return out;
  for(const [key,item] of Object.entries(value)){
    const next=`${path}.${key}`;
    if(SENSITIVE_KEYS.has(key))out.push({code:'SENSITIVE_FIELD',path:next,message:`Sensitive/private field present: ${key}.`});
    if(typeof item==='string'){
      if(/^[A-Za-z]:\\/.test(item)||item.startsWith('/Users/')||item.startsWith('/home/')||item.startsWith('/private/'))out.push({code:'LOCAL_PATH',path:next,message:'Local filesystem path detected.'});
      if(/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//i.test(item))out.push({code:'LOCAL_BRIDGE_URL',path:next,message:'Loopback/local bridge URL detected.'});
    }
    findings(item,next,out);
  }
  return out;
}

export function classifyArtifactForSharing(artifact,{artifactType='json'}={}){
  if(artifactType==='complete-zip')return {
    classification:'PRIVATE RECOVERY ONLY',
    shareRecommended:false,
    findings:[{code:'COMPLETE_BACKUP_PRIVATE',path:'$',message:'Complete ZIP backups may contain project prompts, history and media bytes.'}],
    note:'Keep complete backups private unless the owner intentionally chooses to share their full contents.'
  };
  const kind=artifact?.kind||null;
  const detected=findings(artifact);
  const explicitlyPrivate=PRIVATE_KINDS.has(kind);
  const portableKind=PORTABLE_KINDS.has(kind);
  const shareRecommended=portableKind&&!explicitlyPrivate&&detected.length===0;
  return {
    classification:explicitlyPrivate?'PRIVATE RECOVERY ONLY':shareRecommended?'PORTABLE — REVIEW BEFORE SHARING':'REVIEW REQUIRED',
    shareRecommended,
    kind,
    findings:detected,
    note:shareRecommended
      ?'No known local-path/private-project fields were detected by this structural check. The owner should still review content and recipient before sharing.'
      :'Do not treat this artifact as share-safe until the findings and intended recipient are reviewed.'
  };
}

export function assertPortableArtifact(artifact,options={}){
  const report=classifyArtifactForSharing(artifact,options);
  if(!report.shareRecommended)throw Error(`Artifact is not cleared by the structural share-safety check: ${report.classification}.`);
  return report;
}
