import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes} from './core.mjs';
import {makeFinalOutputManifest} from './final-output.mjs';
import {makePublishingPackage,setFinalVerification,finalVerificationStatus} from './publishing.mjs';

function project(){return planScenes(createProject('PRIVATE LEGACY PROMPT','Portable verification'),5);}

test('portable publishing output re-sanitizes an older saved verification snapshot before export',()=>{
  let p=project();
  const manifest=makeFinalOutputManifest(p,{video:{width:1080,height:1920,fps:30},duration:5,bytes:2_000_000,provider:'ffmpeg'});
  p=setFinalVerification(p,manifest);
  p={
    ...p,
    publishing:{
      ...p.publishing,
      finalVerification:{
        ...p.publishing.finalVerification,
        verifiedAt:'C:\\Users\\Abe\\private-time.txt',
        projectRevision:'C:\\private\\revision.txt',
        expected:{...p.publishing.finalVerification.expected,sourcePath:'C:\\private\\expected.json',secret:'EXPECTED_SECRET'},
        actual:{...p.publishing.finalVerification.actual,outputPath:'/private/final.mp4',bridgeUrl:'http://127.0.0.1/private',secret:'ACTUAL_SECRET'},
        issues:[{code:'LOW_FPS',severity:'warning',message:'C:\\Users\\Abe\\private-final.mp4'}],
        provider:'https://private.example.test/ffmpeg?token=SECRET_TOKEN'
      }
    }
  };
  const status=finalVerificationStatus(p);
  const pack=makePublishingPackage(p);
  assert.equal(status.fresh,true);
  assert.equal(status.verifiedAt,null);
  assert.equal(pack.finalVideoVerified,true);
  assert.equal(pack.finalOutput.verifiedAt,null);
  assert.equal(pack.finalOutput.projectRevision,null);
  assert.equal(pack.finalOutput.provider,null);
  assert.equal(pack.finalOutput.issues[0].message,'Verified frame rate is below the preferred threshold.');
  assert.deepEqual(Object.keys(pack.finalOutput.expected).sort(),['aspect','duration','fps','height','width']);
  assert.deepEqual(Object.keys(pack.finalOutput.actual).sort(),['bytes','duration','fps','hasAudio','hasVideo','height','width']);
  assert.doesNotMatch(JSON.stringify(pack),/Users\\Abe|\/private\/|127\.0\.0\.1|EXPECTED_SECRET|ACTUAL_SECRET|SECRET_TOKEN|PRIVATE LEGACY PROMPT/);
});
