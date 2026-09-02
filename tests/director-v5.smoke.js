"use strict";
const fs=require("fs");
const assert=require("assert");
const source=fs.readFileSync("director-v5.js","utf8");
const index=fs.readFileSync("index.html","utf8");
const sw=fs.readFileSync("sw.js","utf8");
for(const token of ["analyze","productionChecklist","providerPack","PRODUCTION READY","continuityCoverage","causeEffect"]){assert(source.includes(token),`missing Director capability: ${token}`);}
for(const token of ["director-v5.css","director-v5.js"]){assert(index.includes(token),`not integrated: ${token}`);}
assert(sw.includes("aivm-shell-v5"),"service-worker cache was not bumped");
assert(sw.includes("./director-v5.js"),"Director script is not cached");
assert(sw.includes("./director-v5.css"),"Director stylesheet is not cached");
assert(!/https?:\/\//.test(source),"Director must remain local-first");
assert(!/api[_-]?key|client[_-]?secret|access[_-]?token/i.test(source),"Director must not contain credential patterns");
assert(!/document\.createElement\([\"']style/.test(source),"Director must not create inline style tags under strict CSP");
console.log("Director v5 smoke tests passed");
