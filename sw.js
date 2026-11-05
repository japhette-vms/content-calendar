const V='cc-v2',SHELL=['./','index.html','manifest.webmanifest','icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL).catch(()=>{})));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
 if(u.origin===location.origin||['cdn.jsdelivr.net','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname)){
  e.respondWith(fetch(r).then(res=>{if(res.ok||res.type==='opaque'){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp));}return res;})
   .catch(()=>caches.match(r).then(m=>m||(r.mode==='navigate'?caches.match('index.html'):null)).then(m=>m||Response.error())));}});

/* Phone notifications: show the message the server sends and open the app when tapped. */
self.addEventListener('push',e=>{
 let d={};try{d=e.data?e.data.json():{};}catch(x){d={body:e.data?e.data.text():''};}
 e.waitUntil(self.registration.showNotification(d.title||'Content Calendar',{body:d.body||d.message||'You have an update.',icon:'icon.svg',badge:'icon.svg',data:{url:d.url||'./'}}));});
self.addEventListener('notificationclick',e=>{
 e.notification.close();
 const u=new URL((e.notification.data&&e.notification.data.url)||'./',self.registration.scope).href;
 e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{
  for(const c of l){if(c.url.startsWith(self.registration.scope)&&'focus' in c)return c.focus();}
  return clients.openWindow(u);}));});
