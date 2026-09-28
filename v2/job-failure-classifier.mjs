function clean(value,max=500){return String(value??'').replace(/\s+/g,' ').trim().slice(0,max);}

function normalizeCode(value){return clean(value,120).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}

export function classifyJobFailure(input={}){
  const payload=typeof input==='string'?{message:input}:input||{};
  const code=normalizeCode(payload.code||payload.errorCode||payload.reasonCode);
  const text=clean([payload.error,payload.reason,payload.message].filter(Boolean).join(' '),800).toLowerCase();
  const haystack=`${code} ${text}`.trim();

  let category='UNKNOWN';
  let reason='unclassified-failure';
  let nextAction='REVIEW_FAILURE';
  let retryEligible=true;

  if(/paid|payment|credit|billing|login|captcha|permission|owner-approval|owner approval|manual action|manual input/.test(haystack)){
    category='OWNER_ACTION_REQUIRED';reason='owner-or-paid-action-required';nextAction='OWNER_OR_MANUAL_INPUT_REQUIRED';retryEligible=false;
  }else if(/locked|stale|project-changed|project changed|scene-changed|scene changed|render-inputs-changed|render inputs changed|generation-inputs-changed|generation inputs changed|guard mismatch|revision-changed|revision changed/.test(haystack)){
    category='STATE_CHANGED';reason='state-changed-replan-required';nextAction='REPLAN';retryEligible=false;
  }else if(/unsupported|not supported|capability missing|capability unavailable|ffmpeg missing|ffprobe missing|tool missing|workflow missing|model missing|no verified .* route|route unavailable/.test(haystack)){
    category='CAPABILITY_MISSING';reason='capability-required';nextAction='REVIEW_BLOCKERS';retryEligible=false;
  }else if(/timeout|timed out|temporar|connection reset|connection refused|bridge disconnected|bridge error|network error|busy|try again|5\d\d/.test(haystack)){
    category='TRANSIENT';reason='transient-failure';nextAction='RETRY_ELIGIBLE';retryEligible=true;
  }

  return {
    schema:1,
    kind:'aivm-v2-job-failure-classification',
    category,
    reason,
    nextAction,
    retryEligible,
    automaticRetryAllowed:false,
    code:code||null,
    summary:clean(payload.error||payload.reason||payload.message,300)||null,
    note:'Classification is advisory and conservative. It never authorizes paid providers, automatic retry, deletion, uploads, permission bypasses or publishing.'
  };
}
