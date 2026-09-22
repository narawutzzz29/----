/* Service worker — ให้แอปเปิดได้แม้ไม่มีสัญญาณ
   เก็บเฉพาะตัวแอป ไม่เก็บข้อมูลจากฐานข้อมูล */
var CACHE = 'canecut-v1';
var SHELL = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).catch(function(){}));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){ return k===CACHE ? null : caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);

  // ข้อมูลจาก Supabase — ต่อเน็ตเท่านั้น ไม่ cache
  if(url.hostname.indexOf('supabase') > -1) return;

  // ตัวแอปเอง: ใช้เน็ตก่อน ถ้าไม่มีค่อยใช้ของที่เก็บไว้
  if(url.origin === location.origin){
    e.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); }).catch(function(){});
        return res;
      }).catch(function(){
        return caches.match(req).then(function(hit){ return hit || caches.match('./index.html'); });
      })
    );
    return;
  }

  // ไลบรารี/ฟอนต์จากภายนอก: ใช้ของที่เก็บไว้ก่อน
  e.respondWith(
    caches.match(req).then(function(hit){
      return hit || fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); }).catch(function(){});
        return res;
      });
    })
  );
});
