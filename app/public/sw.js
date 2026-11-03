// Service worker: o aplicativo abre rápido e instala no celular.
// Guarda só a "casca" (telas, estilo, fontes). Dados de clientes NUNCA são
// guardados no aparelho: a API sempre vai direto ao servidor.

const VERSAO = 'aguillera-v1';
const CASCA = ['/', '/index.html', '/app.css', '/app.js', '/manifest.webmanifest', '/icones/icone.svg',
  '/fontes/eb-garamond-400.woff2', '/fontes/eb-garamond-600.woff2', '/fontes/libre-franklin-400.woff2', '/fontes/libre-franklin-600.woff2'];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(VERSAO).then((c) => c.addAll(CASCA)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (ev) => {
  const url = new URL(ev.request.url);
  if (ev.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  // Rede primeiro (sempre a versão mais nova); sem internet, usa a cópia guardada.
  ev.respondWith(fetch(ev.request).then((r) => {
    if (r.ok) { const copia = r.clone(); caches.open(VERSAO).then((c) => c.put(ev.request, copia)); }
    return r;
  }).catch(() => caches.match(ev.request).then((r) => r || caches.match('/index.html'))));
});
