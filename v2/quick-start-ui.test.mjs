import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes,saveProject} from './core.mjs';

test('one activation plans then starts production despite the HTML reentrant click guard',async()=>{
  const nodes=new Map(),data=new Map(),microtasks=[];
  const node=id=>({id,value:'',dataset:{},textContent:'',classList:{add(){}},listeners:[],clickInProgress:false,
    setAttribute(){},addEventListener(type,fn,options){this.listeners.push({type,fn,capture:!!options?.capture});},
    click(){
      if(this.clickInProgress)return;
      this.clickInProgress=true;
      const event={stopped:false,preventDefault(){},stopImmediatePropagation(){this.stopped=true;}};
      try{for(const listener of [...this.listeners].sort((a,b)=>Number(b.capture)-Number(a.capture))){if(event.stopped)break;if(listener.type==='click')listener.fn(event);}}
      finally{
        // Event-listener microtasks can run before the outer activation ends.
        while(microtasks.length)microtasks.shift()();
        this.clickInProgress=false;
      }
    }});
  for(const id of ['createDraft','plan','prompt','name','projects','notice','quickStartBar'])nodes.set(id,node(id));
  const previous={document:globalThis.document,localStorage:globalThis.localStorage,queueMicrotask:globalThis.queueMicrotask};
  globalThis.queueMicrotask=callback=>microtasks.push(callback);
  globalThis.document={getElementById:id=>nodes.get(id)||null};
  globalThis.localStorage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};
  const created=[],started=[];
  nodes.get('plan').addEventListener('click',()=>{
    const project=planScenes(createProject(nodes.get('prompt').value,nodes.get('name').value),15);
    saveProject(localStorage,project);nodes.get('projects').dataset.activeProjectId=project.id;created.push(project);
  });
  nodes.get('createDraft').addEventListener('click',()=>started.push(nodes.get('projects').dataset.activeProjectId));
  try{
    await import('./quick-start-ui.mjs');
    nodes.get('prompt').value='A paper boat crosses a pond.';
    nodes.get('createDraft').click();
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(created.length,1);
    assert.deepEqual(started,[created[0].id]);
    const original=JSON.stringify(created[0]);
    nodes.get('createDraft').click();await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(created.length,1,'reusing the same prompt must not replace its plan');
    assert.deepEqual(started,[created[0].id,created[0].id]);
    nodes.get('prompt').value='A blue kite crosses a meadow.';
    nodes.get('createDraft').click();await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(created.length,2);
    assert.notEqual(created[0].id,created[1].id);
    assert.equal(JSON.stringify(created[0]),original);
    assert.deepEqual(started,[created[0].id,created[0].id,created[1].id]);
  }finally{globalThis.document=previous.document;globalThis.localStorage=previous.localStorage;globalThis.queueMicrotask=previous.queueMicrotask;}
});
