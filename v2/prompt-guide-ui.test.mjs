import test from 'node:test';
import assert from 'node:assert/strict';

test('prompt guide follows asynchronous restored project rendering without rewriting the prompt',async()=>{
  const nodes=new Map(),observers=[];
  const node=id=>({id,value:'',dataset:{},textContent:'',listeners:{},
    setAttribute(){},addEventListener(event,callback){this.listeners[event]=callback;},
    insertAdjacentElement(position,element){nodes.set(element.id,element);}});
  for(const id of ['prompt','projects','restore','restoreBundle','summary'])nodes.set(id,node(id));
  const oldDocument=globalThis.document,oldObserver=globalThis.MutationObserver;
  globalThis.document={getElementById:id=>nodes.get(id),createElement:()=>node('')};
  globalThis.MutationObserver=class{constructor(callback){this.callback=callback;}observe(target){observers.push({target,callback:this.callback});}};
  try{
    await import('./prompt-guide-ui.mjs');
    const prompt=nodes.get('prompt'),guide=nodes.get('promptGuideStatus');
    assert.match(guide.textContent,/Describe the subject/);
    nodes.get('restoreBundle').listeners.change();
    await Promise.resolve(); // The file input event happens before file reading completes.
    prompt.value='1. Open the door\n2. Enter the room\n3. Find the star';
    const original=prompt.value;
    assert.equal(observers.length,1);
    assert.equal(observers[0].target,nodes.get('summary'));
    observers[0].callback(); // Studio renders the asynchronously restored project.
    assert.match(guide.textContent,/3 ordered story steps/);
    assert.equal(prompt.value,original);
  }finally{globalThis.document=oldDocument;globalThis.MutationObserver=oldObserver;}
});
