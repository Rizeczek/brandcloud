/* BrandCloud prototype top bar – injected by the build into every prototype page (first element in <body>).
   Home → signpost, prototype name + state chip, Figma link, and – on app pages – facilitator controls:
   View as <user>, CS/EN, Reset prototype. Copy link, log out. Hide with ?bar=0 (test sessions, screenshots).
   Talks to the app through window.BCProto (app/boot.js). Not part of the product UI. */
(function () {
  var me = document.currentScript, data = {};
  try { data = JSON.parse(me.getAttribute('data-proto') || '{}'); } catch (e) {}
  if (new URLSearchParams(location.search).get('bar') === '0') return;
  var H = 36, root = document.documentElement;
  root.style.setProperty('--bc-topbar-h', H + 'px');
  var st = document.createElement('style');
  st.textContent = 'body{padding-top:var(--bc-topbar-h)!important}';
  document.head.appendChild(st);
  var P = {
    back: '<path d="M15 6l-6 6 6 6"/>', copy: '<path d="M9 9h10v10H9z"/><path d="M5 15V5h10"/>', ok: '<path d="M5 12l4 4 10-10"/>',
    figma: '<path d="M9 3h3v6H9a3 3 0 0 1 0-6zM12 3h3a3 3 0 0 1 0 6h-3zM9 9h3v6H9a3 3 0 0 1 0-6zM15 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM9 15h3v3a3 3 0 1 1-3-3z"/>',
    out: '<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M14 16l4-4-4-4M18 12H9"/>', reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
  };
  var svg = function (k) { return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + P[k] + '</svg>'; };
  var esc = function (s) { return String(s || '').replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); };
  var host = document.createElement('div');
  host.id = 'bc-topbar';
  host.style.cssText = 'position:fixed;inset:0 0 auto 0;height:' + H + 'px;z-index:2147483000';
  var sh = host.attachShadow({mode: 'open'});
  sh.innerHTML = '<style>' +
    ':host{all:initial}' +
    '.bar{box-sizing:border-box;height:' + H + 'px;display:flex;align-items:center;gap:6px;padding:0 8px 0 6px;background:#16151a;color:#f4f3f6;font:600 13px/1 "Mona Sans",system-ui,sans-serif}' +
    'a,button,select{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 8px;border-radius:6px;cursor:pointer;color:inherit;white-space:nowrap}' +
    'a:hover,button:hover,select:hover{background:#ffffff1a}a:focus-visible,button:focus-visible,select:focus-visible{outline:2px solid #6f9bff}' +
    'select{padding-right:22px;background:#ffffff12 url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2710%27 height=%276%27%3E%3Cpath d=%27M1 1l4 4 4-4%27 stroke=%27%23f4f3f6%27 fill=%27none%27/%3E%3C/svg%3E") no-repeat right 8px center;max-width:220px;overflow:hidden;text-overflow:ellipsis}' +
    'option{color:#000}' +
    '.sep{width:1px;height:16px;background:#ffffff33;flex:none}' +
    '.t{min-width:0;flex:1;display:flex;align-items:center;gap:8px;overflow:hidden}.t span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.st{flex:none;height:20px;display:inline-flex;align-items:center;font:400 12px/1 "Mona Sans",system-ui;padding:0 8px;border-radius:99px}' +
    '.st--main{background:#1f3d2c;color:#9ee6b8}.st--standalone{background:#45330e;color:#ffd78a}' +
    '.seg{display:inline-flex;border-radius:6px;background:#ffffff12;padding:1px}.seg button{height:24px;padding:0 7px;font-weight:600}.seg button[aria-pressed=true]{background:#ffffff33}' +
    '.lbl{font-weight:600}.ic{width:26px;padding:0;justify-content:center}.muted{color:#b9b6c2;font-weight:400}' +
    '@media (max-width:760px){.lbl,.st,.figma,.muted{display:none}select{max-width:120px}}' +
    '</style><nav class="bar" aria-label="Prototype">' +
    '<a class="home" href="/" title="All BrandCloud prototypes">' + svg('back') + '<span class="lbl">Prototypes</span></a><span class="sep"></span>' +
    '<div class="t"><span>' + esc(data.title || document.title) + '</span>' + (data.state ? '<em class="st st--' + data.state + '">' + (data.state === 'main' ? 'In Main' : 'Standalone') + '</em>' : '') + '</div>' +
    '<span class="ctl"></span>' +
    (data.figma ? '<a class="figma ic" href="' + esc(data.figma) + '" target="_blank" rel="noopener" title="Open in Figma" aria-label="Open in Figma">' + svg('figma') + '</a>' : '') +
    '<button class="copy ic" type="button" title="Copy link" aria-label="Copy link">' + svg('copy') + '</button>' +
    '<a class="out ic" href="/_sv/logout.php" title="Log out of the prototype site" aria-label="Log out">' + svg('out') + '</a></nav>';
  var ctl = sh.querySelector('.ctl');
  function controls() {
    var A = window.BCProto; if (!A) return;
    var t = A.t;
    ctl.style.display = 'contents';
    ctl.innerHTML = '<span class="muted">' + esc(t('protoActingAs')) + '</span><select class="me" aria-label="' + esc(t('protoActingAs')) + '">' +
      A.users().map(function (u) { return '<option value="' + esc(u.id) + '"' + (u.id === A.me ? ' selected' : '') + '>' + esc(u.name) + ' · ' + esc(u.role) + '</option>'; }).join('') + '</select>' +
      '<span class="seg" role="group" aria-label="' + esc(t('protoLang')) + '">' + A.langs.map(function (l) { return '<button type="button" data-l="' + l + '" aria-pressed="' + (l === A.lang) + '">' + l.toUpperCase() + '</button>'; }).join('') + '</span>' +
      '<button class="reset" type="button" title="' + esc(t('protoReset')) + '">' + svg('reset') + '<span class="lbl">' + esc(t('protoReset')) + '</span></button><span class="sep"></span>';
    ctl.querySelector('.me').addEventListener('change', function (e) { A.setMe(e.target.value); });
    ctl.querySelectorAll('[data-l]').forEach(function (b) { b.addEventListener('click', function () { A.setLang(b.dataset.l); }); });
    ctl.querySelector('.reset').addEventListener('click', function () { if (confirm(t('protoResetConfirm'))) A.reset(); });
  }
  window.addEventListener('bc-proto-ready', controls);
  window.addEventListener('bc-lang', controls);
  window.addEventListener('bc-me', controls);
  sh.querySelector('.copy').addEventListener('click', function () {
    var url = location.origin + location.pathname + location.hash, b = sh.querySelector('.copy');
    var done = function () { b.innerHTML = svg('ok'); setTimeout(function () { b.innerHTML = svg('copy'); }, 1500); };
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { prompt('Copy link', url); }); else prompt('Copy link', url);
  });
  var b = document.body;
  if (b) b.insertBefore(host, b.firstChild); else root.appendChild(host);
})();
