export function sortedProjects(projects=[]){
  return [...projects].sort((a,b)=>String(b?.updatedAt||'').localeCompare(String(a?.updatedAt||'')));
}

export function decorateProjectButtons(container,projects=[]){
  if(!container)return [];
  const buttons=[...container.querySelectorAll('button')];
  const ordered=sortedProjects(projects);
  for(let i=0;i<buttons.length;i++){
    const project=ordered[i];
    if(buttons[i].dataset.projectId)continue;
    if(project?.id)buttons[i].dataset.projectId=project.id;
    else delete buttons[i].dataset.projectId;
  }
  return buttons;
}

export function selectedProject(projects=[],projectId=''){
  return projectId?projects.find(project=>project.id===projectId)||null:null;
}

export function chooseProject(projects=[],selection={}){
  const byId=selectedProject(projects,selection.projectId);
  if(byId)return byId;
  const name=String(selection.name||'');
  const prompt=String(selection.prompt||'');
  const exact=projects.filter(project=>project.name===name&&project.prompt===prompt);
  if(exact.length===1)return exact[0];
  const byPrompt=projects.filter(project=>project.prompt===prompt);
  if(byPrompt.length===1)return byPrompt[0];
  const byName=projects.filter(project=>project.name===name);
  if(byName.length===1)return byName[0];
  return null;
}
