export const PROFILES=Object.freeze({light:Object.freeze({width:360,height:640,fps:24,label:'Light laptop'}),balanced:Object.freeze({width:576,height:1024,fps:24,label:'Balanced'}),strong:Object.freeze({width:720,height:1280,fps:30,label:'Stronger laptop'})});
export function profileFor(mode){return PROFILES[mode]||PROFILES.light;}
