import fs from 'node:fs/promises';
const LOCAL_IMAGE_NODES=new Set(['CheckpointLoaderSimple','CLIPTextEncode','EmptyLatentImage','KSampler','VAEDecode','VAEEncode','LoadImage','SaveImage','PreviewImage','LoraLoader','LatentUpscale','ImageScale','ImageScaleBy','ImageUpscaleWithModel','UpscaleModelLoader']);
export function isLocalCoreImageWorkflow(workflow){if(!workflow||typeof workflow!=='object'||Array.isArray(workflow))return false;const nodes=Object.values(workflow);return nodes.length>0&&nodes.length<=100&&nodes.every(node=>node&&LOCAL_IMAGE_NODES.has(node.class_type)&&node.inputs&&typeof node.inputs==='object');}
export async function verifiedFreeImageWorkflow(file){if(!file)return false;try{return isLocalCoreImageWorkflow(JSON.parse(await fs.readFile(file,'utf8')));}catch{return false;}}
export function loopbackHttpUrl(value){try{const url=new URL(value);return url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname)?url:null;}catch{return null;}}
