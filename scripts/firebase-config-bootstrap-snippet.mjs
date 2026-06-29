/** Sync Firebase config fetch — injected into HTML before any module loads on prod hosts. */
export function getFirebaseConfigBootstrapScript(apiUrl) {
  const base = apiUrl.replace(/'/g, "\\'");
  return `(function(){try{var h=location.hostname.toLowerCase();if(h.indexOf('bhojanos')===-1)return;var b='${base}';var paths=['/api/client-config','/api/health?webClient=1'];for(var i=0;i<paths.length;i++){try{var xhr=new XMLHttpRequest();xhr.open('GET',b+paths[i],false);xhr.timeout=8000;xhr.send(null);if(xhr.status!==200)continue;var d=JSON.parse(xhr.responseText);var fb=(d&&d.firebase&&d.firebase.apiKey)?d.firebase:(d&&d.webClient&&d.webClient.firebase&&d.webClient.firebase.apiKey)?d.webClient.firebase:null;if(fb&&fb.projectId){window.__BH_FIREBASE_CONFIG__=fb;return}}catch(e){}}}catch(e){}})();`;
}
