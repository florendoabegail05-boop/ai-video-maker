const ALLOWED_EXTENSIONS={
  image:new Set(['.png','.jpg','.jpeg','.webp','.ppm']),
  video:new Set(['.mp4','.mov','.webm'])
};

function text(value){return typeof value==='string'?value.trim():'';}
function extension(path){
  const name=path.split(/[\\/]/).filter(Boolean).at(-1)||'';
  const dot=name.lastIndexOf('.');
  return dot>=0?name.slice(dot).toLowerCase():'';
}

export function generatedMediaBasename(value){
  const path=text(value);
  return path.split(/[\\/]/).filter(Boolean).at(-1)||'';
}

export function validateLocalGeneratedMediaPath(value,kind){
  const path=text(value);
  if(!path)return {ok:false,reason:'generated-media-path-missing'};
  if(/[\u0000-\u001f\u007f]/.test(path))return {ok:false,reason:'generated-media-path-control-character'};
  if(path.startsWith('\\\\?\\')||path.startsWith('\\\\.\\'))return {ok:false,reason:'device-path-not-allowed'};
  if(path.startsWith('\\\\'))return {ok:false,reason:'network-path-not-allowed'};

  const windows=/^[A-Za-z]:[\\/]/.test(path);
  const posix=path.startsWith('/');
  const scheme=/^[A-Za-z][A-Za-z0-9+.-]*:/.test(path);
  if(scheme&&!windows)return {ok:false,reason:'external-or-uri-path-not-allowed'};
  if(!windows&&!posix)return {ok:false,reason:'relative-generated-media-path-not-allowed'};

  const segments=path.split(/[\\/]+/);
  if(segments.some(segment=>segment==='..'))return {ok:false,reason:'generated-media-path-traversal'};

  const allowed=ALLOWED_EXTENSIONS[kind];
  if(!allowed)return {ok:false,reason:'unsupported-generated-media-kind'};
  const ext=extension(path);
  if(!allowed.has(ext))return {ok:false,reason:'generated-media-extension-not-allowed',extension:ext||null};

  return {ok:true,path,absolute:true,kind,extension:ext,basename:generatedMediaBasename(path)};
}
