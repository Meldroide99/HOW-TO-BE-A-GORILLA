// Service Worker — caché offline para la app de entrenamiento
var CACHE_NAME = 'entreno-cache-v7';
var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Instalar: cachear los archivos de la app
self.addEventListener('install', function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(ASSETS).catch(function(){ /* tolerante si falta alguno */ });
    })
  );
});

// Activar: limpiar cachés viejas
self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if(k !== CACHE_NAME) return caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

// Fetch: network-first para index.html (para recibir actualizaciones), cache-first para el resto
self.addEventListener('fetch', function(event){
  var req = event.request;
  if(req.method !== 'GET'){ return; }
  var url = new URL(req.url);
  var isHTML = req.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname.endsWith('/');

  if(isHTML){
    // Network-first: intenta traer la versión nueva; si no hay red, usa caché
    event.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function(c){ c.put('./index.html', copy); });
        return res;
      }).catch(function(){
        return caches.match('./index.html').then(function(r){ return r || caches.match('./'); });
      })
    );
  } else {
    // Cache-first para estáticos
    event.respondWith(
      caches.match(req).then(function(cached){
        return cached || fetch(req).then(function(res){
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function(c){ c.put(req, copy); });
          return res;
        }).catch(function(){ return cached; });
      })
    );
  }
});
