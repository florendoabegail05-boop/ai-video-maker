"use strict";

// Stable public configuration. Keep product policy here; provider credentials never belong here.
const AIVM_MEDIA_CONFIG = Object.freeze({
  schemaVersion: 1,
  output: Object.freeze({ defaultWidth: 1080, defaultHeight: 1920, fps: 30, container: "mp4", videoCodec: "h264", audioCodec: "aac" }),
  shot: Object.freeze({ minSeconds: 2, maxSeconds: 10, defaultSeconds: 5 }),
  mediaKinds: Object.freeze(["image", "video", "voice", "audio", "assembly"]),
  providerPolicy: Object.freeze({ browserSafeDefault: true, requireHttps: true, allowSecretInBrowser: false }),
  freeFirst: Object.freeze({ preferLocal: true, allowRemoteOnlyThroughSecureAdapter: true })
});

if (typeof window !== "undefined") window.AIVM_MEDIA_CONFIG = AIVM_MEDIA_CONFIG;
if (typeof module !== "undefined" && module.exports) module.exports = AIVM_MEDIA_CONFIG;
