/**
 * Inline script injected into index.html + marketing.html at build time.
 * Runs before React/service worker bundles — forces refresh when deploy version changes.
 */
export function getAppVersionBootstrapScript(buildId) {
  const safe = buildId.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `(function(){try{var BUILD='${safe}';var KEY='bhojanos_app_build';var prev=localStorage.getItem(KEY);if(prev&&prev!==BUILD){localStorage.setItem(KEY,BUILD);var done=function(){location.reload()};if('serviceWorker'in navigator){navigator.serviceWorker.getRegistrations().then(function(r){return Promise.all(r.map(function(x){return x.unregister()}))}).then(function(){if('caches'in window){return caches.keys().then(function(k){return Promise.all(k.map(function(n){return caches.delete(n)}))})}}).finally(done)}else done();return}localStorage.setItem(KEY,BUILD);fetch('/version.json?'+Date.now(),{cache:'no-store'}).then(function(r){return r.json()}).then(function(v){if(!v||!v.build)return;var k='bhojanos_version';var p=localStorage.getItem(k);if(p&&p!==v.build){localStorage.setItem(k,v.build);if('serviceWorker'in navigator){navigator.serviceWorker.getRegistrations().then(function(r){return Promise.all(r.map(function(x){return x.unregister()}))}).then(function(){location.reload()})}}else localStorage.setItem(k,v.build)}).catch(function(){})}catch(e){}})();`;
}
