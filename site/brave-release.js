/* Official release metadata snapshot; APKs are downloaded directly from Brave. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.BraveRelease = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  return {
  "tag": "v1.98.63",
  "checkedOn": "2026-11-02",
  "releaseUrl": "https://github.com/brave/brave-browser/releases/tag/v1.98.63",
  "assets": [
    {
      "name": "Bravearm64Universal.apk",
      "label": "ARM64 · Universal",
      "bytes": 211048197,
      "digest": "sha256:e8aa128c52ab7b92c4efc57519935763a8ccefb77800bd240ca5684dbe6368a0",
      "url": "https://github.com/brave/brave-browser/releases/download/v1.98.63/Bravearm64Universal.apk"
    },
    {
      "name": "BraveMonoarm64.apk",
      "label": "ARM64 · Mono",
      "bytes": 363072982,
      "digest": "sha256:b3fa3a8c576635785093e180139c2cc8acc8442dccdfc653fe368da6cc01c595",
      "url": "https://github.com/brave/brave-browser/releases/download/v1.98.63/BraveMonoarm64.apk"
    },
    {
      "name": "BraveMonoarm.apk",
      "label": "ARM 32-bit · Mono",
      "bytes": 231232302,
      "digest": "sha256:fb08e64403bc2ab657e50a06630083277b16ffb9d24478262020bc004ae1ce9b",
      "url": "https://github.com/brave/brave-browser/releases/download/v1.98.63/BraveMonoarm.apk"
    },
    {
      "name": "BraveMonox64.apk",
      "label": "x86-64 · Mono",
      "bytes": 401620765,
      "digest": "sha256:6b0df2d4512c936fd8f34d3152e9c2057110ca4f189903b9a05f772977703ed0",
      "url": "https://github.com/brave/brave-browser/releases/download/v1.98.63/BraveMonox64.apk"
    },
    {
      "name": "BraveMonox86.apk",
      "label": "x86 32-bit · Mono",
      "bytes": 309129994,
      "digest": "sha256:0d1ac1ac9284e95d468f663ee809e4f830a8f36f6969628dd8f41530500a3453",
      "url": "https://github.com/brave/brave-browser/releases/download/v1.98.63/BraveMonox86.apk"
    }
  ]
};
}));

