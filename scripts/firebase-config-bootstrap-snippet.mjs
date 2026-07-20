/** Public bhojanos-prod Firebase web SDK config — keep in sync with src/config/bhojanosProdFirebase.ts */
const BHOJANOS_PROD_FIREBASE_PUBLIC = {
  apiKey: 'AIzaSyC6kCJwsEWuwLVPGmJsVDDxTyWlayp2yLQ',
  authDomain: 'bhojanos-prod.firebaseapp.com',
  projectId: 'bhojanos-prod',
  storageBucket: 'bhojanos-prod.firebasestorage.app',
  messagingSenderId: '170989397954',
  appId: '1:170989397954:web:9c67dbacc58329f360185b',
};

/** Sync Firebase config fetch — injected into HTML before any module loads on prod hosts. */
export function getFirebaseConfigBootstrapScript(apiUrl) {
  const remoteBase = apiUrl.replace(/'/g, "\\'");
  const fallback = JSON.stringify(BHOJANOS_PROD_FIREBASE_PUBLIC);
  return `(function(){var FALLBACK=${fallback};function applyFallback(){window.__BH_FIREBASE_CONFIG__=FALLBACK}try{var h=location.hostname.toLowerCase();if(h.indexOf('bhojanos')===-1)return;var paths=['/api/client-config','/api/health?webClient=1'];var bases=[location.origin.replace(/\\/$/,''),'${remoteBase}'];for(var b=0;b<bases.length;b++){for(var i=0;i<paths.length;i++){try{var xhr=new XMLHttpRequest();xhr.open('GET',bases[b]+paths[i],false);xhr.timeout=8000;xhr.send(null);if(xhr.status!==200)continue;var d=JSON.parse(xhr.responseText);var fb=(d&&d.firebase&&d.firebase.apiKey)?d.firebase:(d&&d.webClient&&d.webClient.firebase&&d.webClient.firebase.apiKey)?d.webClient.firebase:null;if(fb&&fb.projectId&&fb.apiKey){window.__BH_FIREBASE_CONFIG__=fb;return}}catch(e){}}}applyFallback()}catch(e){try{applyFallback()}catch(e2){}}})();`;
}
