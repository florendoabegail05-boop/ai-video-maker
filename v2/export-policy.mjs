const PORTABLE_KINDS=new Set(['aivm-v2-publishing-package','aivm-v2-owner-review-checklist','aivm-v2-owner-handoff','aivm-v2-provenance-summary','aivm-v2-release-envelope']);
const PRIVATE_KINDS=new Set(['aivm-v2-complete-backup','aivm-v2-project-backup']);

function textScan(value){
  let text='';
  try{text=JSON.stringify(value);}catch{return{privateSignals:['UNSERIALIZABLE'],portableSignals:[]};}
  const privateSignals=[];
  if(/sourcePath|outputPath|bridgeUrl|"history"|"prompt"/i.test(text))privateSignals.push('PRIVATE_PROJECT_FIELD');
  if(/[A-Za-z]:\\|\/Users\/|\/home\/|\/mnt\//.test(text))privateSignals.push('LOCAL_PATH');
  if(/127\.0\.0\.1|localhost/i.test(text))privateSignals.push('LOCAL_BRIDGE_URL');
  return{privateSignals:[...new Set(privateSignals)],portableSignals:[]};
}

export function classifyExport({kind=null,filename='',value=null,binary=false}={}){
  const name=String(filename||'').toLowerCase();
  if(binary||name.endsWith('.zip')||PRIVATE_KINDS.has(kind)){
    return{classification:'PRIVATE RECOVERY ONLY',shareable:false,requiresOwnerReview:true,reasons:['Complete/binary backup may contain project prompts, history and media bytes.']};
  }
  const scan=textScan(value);
  if(scan.privateSignals.length){
    return{classification:'REVIEW REQUIRED',shareable:false,requiresOwnerReview:true,reasons:scan.privateSignals};
  }
  if(PORTABLE_KINDS.has(kind)){
    return{classification:'PORTABLE — REVIEW BEFORE SHARING',shareable:true,requiresOwnerReview:true,reasons:['Portable structure detected; rights, credits and destination policy still require owner review.']};
  }
  return{classification:'REVIEW REQUIRED',shareable:false,requiresOwnerReview:true,reasons:['Unknown or unrecognized export type.']};
}

export function exportPolicyCatalog(){
  return{
    schema:1,
    kind:'aivm-v2-export-policy-catalog',
    entries:[
      {kind:'aivm-v2-publishing-package',classification:'PORTABLE — REVIEW BEFORE SHARING'},
      {kind:'aivm-v2-owner-review-checklist',classification:'PORTABLE — REVIEW BEFORE SHARING'},
      {kind:'aivm-v2-owner-handoff',classification:'PORTABLE — REVIEW BEFORE SHARING'},
      {kind:'aivm-v2-provenance-summary',classification:'PORTABLE — REVIEW BEFORE SHARING'},
      {kind:'aivm-v2-release-envelope',classification:'PORTABLE — REVIEW BEFORE SHARING'},
      {kind:'complete ZIP backup',classification:'PRIVATE RECOVERY ONLY'}
    ],
    note:'Classification is a structural privacy aid only. It does not determine copyright, licensing, confidentiality, platform policy or legal permission.'
  };
}
