import {promptGuide} from './prompt-guide.mjs';

const el=id=>document.getElementById(id);

function ensureGuideNode(prompt){
  let node=el('promptGuideStatus');
  if(node)return node;
  node=document.createElement('p');
  node.id='promptGuideStatus';
  node.className='badge';
  node.setAttribute('aria-live','polite');
  prompt.insertAdjacentElement('afterend',node);
  return node;
}

export function installPromptGuideUi(){
  const prompt=el('prompt');
  if(!prompt||prompt.dataset.promptGuideBound==='1')return false;
  prompt.dataset.promptGuideBound='1';
  const node=ensureGuideNode(prompt);

  const refresh=()=>{
    const guide=promptGuide(prompt.value);
    node.dataset.state=guide.state;
    node.textContent=guide.message;
  };

  prompt.addEventListener('input',refresh);
  prompt.addEventListener('change',refresh);
  el('projects')?.addEventListener('click',()=>queueMicrotask(refresh));
  el('restore')?.addEventListener('change',()=>queueMicrotask(refresh));
  el('restoreBundle')?.addEventListener('change',()=>queueMicrotask(refresh));
  refresh();
  return true;
}

installPromptGuideUi();
