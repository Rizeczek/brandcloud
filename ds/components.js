/* BrandCloud DS – composite components (custom elements, light DOM so tokens and DS classes apply) + BCUI helpers.
   Needs /ds/icons.js first. Every element / helper maps to one Figma component (see /catalog/).

   <bc-icon name="folder" size="20">            Icon (Lucide; bc-folder / bc-smartpage are BrandCloud's own)
   <bc-avatar name="Petra Nováková" size="s">   Avatar (initials)
   <bc-permission-matrix data-config='{…}'>     Team × object radio matrix (Hide / View / View & download / Edit / Edit & lock)
   BCUI.modal({title, desc, body, actions, size, side, onOpen, beforeClose}) → Promise<value|null>   Modal (mobile: bottomsheet) / Sidesheet (side:true)
   BCUI.menu(anchorEl, items) → Promise<value|null>    Popover menu; item {label, icon, value, danger, disabled, why} or '-'
   BCUI.toast(text, {action}) → Promise<'action'|null> Toast with optional action (e.g. Undo)
   BCUI.icon(name, size) → svg string */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  function icon(name, size = 20) {
    const i = (window.BCIcons || {})[name];
    if (!i) { console.warn('BrandCloud DS: unknown icon', name); return ''; }
    const paint = i.fill ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"';
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" ${paint} aria-hidden="true" focusable="false">${i.d}</svg>`;
  }

  class BcIcon extends HTMLElement {
    static get observedAttributes() { return ['name', 'size']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() { const s = +(this.getAttribute('size') || 20); this.style.setProperty('--ic', s + 'px'); this.innerHTML = icon(this.getAttribute('name'), s); }
  }
  class BcAvatar extends HTMLElement {
    connectedCallback() {
      const n = (this.getAttribute('name') || '?').trim().split(/\s+/);
      this.className = 'bc-avatar' + (this.getAttribute('size') ? ' bc-avatar--' + this.getAttribute('size') : '');
      this.textContent = (n[0][0] || '') + (n.length > 1 ? n[n.length - 1][0] : '');
      this.setAttribute('aria-hidden', 'true');
    }
  }
  /* config: {name, levels:[{id,label}], cols?:[label], rows:[{id,label,icon,depth,sub,value,inherited,max,disabled}]}
     max = highest allowed level index (ceiling); higher radios are disabled. Fires "change" {detail:{row, level}}. */
  class BcPermissionMatrix extends HTMLElement {
    connectedCallback() { this.render(); this.addEventListener('change', this.onChange); }
    disconnectedCallback() { this.removeEventListener('change', this.onChange); }
    onChange(e) {
      if (!e.target.matches('input[type=radio]')) return;
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('matrix', {bubbles: true, detail: {row: e.target.dataset.row, level: e.target.value}}));
    }
    render() {
      let c = {}; try { c = JSON.parse(this.dataset.config || '{}'); } catch (e) {}
      const L = c.levels || [];
      this.innerHTML = `<table class="bc-pmx"><thead><tr><th>${esc(c.first || '')}</th>${L.map(l => `<th scope="col">${esc(l.label)}</th>`).join('')}</tr></thead><tbody>` +
        (c.rows || []).map(r => `<tr class="${r.inherited ? 'is-inherited' : ''}${r.sub ? ' is-sub' : ''}" style="--depth:${r.depth || 0}"><td><span class="bc-pmx__name">${r.icon ? `<bc-icon name="${esc(r.icon)}" size="18"></bc-icon>` : ''}<span>${esc(r.label)}${r.note ? `<br><small>${esc(r.note)}</small>` : ''}</span></span></td>` +
          L.map((l, i) => `<td><label title="${esc(l.label)}"><input class="bc-radio" type="radio" name="${esc(c.name)}-${esc(r.id)}" data-row="${esc(r.id)}" value="${esc(l.id)}" aria-label="${esc(r.label)}: ${esc(l.label)}"${l.id === r.value ? ' checked' : ''}${r.disabled || (r.max != null && i > r.max) ? ' disabled' : ''}></label></td>`).join('') + '</tr>').join('') +
        '</tbody></table>';
    }
  }
  customElements.define('bc-icon', BcIcon);
  customElements.define('bc-avatar', BcAvatar);
  customElements.define('bc-permission-matrix', BcPermissionMatrix);

  /* ---------------- overlays */
  const labels = {close: 'Close'};
  let layer = 0;
  function trapKeys(box, close) {
    return e => {
      if (e.key === 'Escape') { e.preventDefault(); close(null); }
      if (e.key !== 'Tab') return;
      const f = [...box.querySelectorAll('button,input,select,textarea,a[href],[tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    };
  }
  function modal(o) {
    return new Promise(resolve => {
      const prev = document.activeElement, id = 'bcm' + (++layer);
      const scrim = document.createElement('div'); scrim.className = 'bc-scrim';
      const box = document.createElement('div');
      box.className = o.side ? 'bc-sidesheet' : 'bc-modal' + (o.size ? ' bc-modal--' + o.size : '');
      box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', id);
      const acts = o.actions || [];
      box.innerHTML = `<div class="bc-modal__grab" aria-hidden="true"></div><div class="bc-modal__head"><div style="flex:1;min-width:0"><h2 id="${id}">${esc(o.title)}</h2>${o.desc ? `<p>${esc(o.desc)}</p>` : ''}</div>` +
        `<button class="bc-btn bc-btn--ghost bc-btn--icon" data-m="__close" aria-label="${esc(labels.close)}">${icon('x', 20)}</button></div>` +
        `<div class="bc-modal__body">${o.body || ''}</div>` +
        (acts.length ? `<div class="bc-modal__foot">${acts.map(a => `<button class="bc-btn bc-btn--${a.variant || 'secondary'}" data-m="${esc(a.value)}"${a.disabled ? ' disabled' : ''}>${a.icon ? icon(a.icon, 18) : ''}${esc(a.label)}</button>`).join('')}</div>` : '');
      let done = false;
      const close = v => {
        if (done) return;
        if (v !== null && o.beforeClose && o.beforeClose(v, box) === false) return;
        done = true; document.removeEventListener('keydown', keys, true); scrim.remove(); box.remove();
        if (prev && prev.focus) prev.focus();
        resolve(v);
      };
      const keys = trapKeys(box, close);
      box.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b && !b.disabled) close(b.dataset.m === '__close' ? null : b.dataset.m); });
      box.addEventListener('submit', e => { e.preventDefault(); const p = acts.find(a => a.variant === 'primary' || a.variant === 'danger'); if (p) close(p.value); });
      scrim.addEventListener('click', () => close(null));
      document.addEventListener('keydown', keys, true);
      document.body.append(scrim, box);
      if (o.onOpen) o.onOpen(box, close);
      const first = box.querySelector('[autofocus]') || box.querySelector('.bc-modal__body input,.bc-modal__body select,.bc-modal__body textarea') || box.querySelector('.bc-modal__foot .bc-btn--primary') || box.querySelector('[data-m]');
      if (first) first.focus();
    });
  }
  function menu(anchor, items) {
    return new Promise(resolve => {
      document.querySelectorAll('.bc-menu').forEach(m => m.remove());
      const m = document.createElement('div'); m.className = 'bc-menu'; m.setAttribute('role', 'menu');
      m.innerHTML = items.map(it => it === '-' ? '<hr>' : `<button role="menuitem" data-v="${esc(it.value)}" class="${it.danger ? 'is-danger' : ''}"${it.disabled ? ' disabled' : ''}>${it.icon ? `<bc-icon name="${esc(it.icon)}" size="18"></bc-icon>` : ''}<span>${esc(it.label)}</span>${it.why ? `<span class="bc-menu__why">${esc(it.why)}</span>` : ''}</button>`).join('');
      document.body.appendChild(m);
      const r = anchor.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
      m.style.left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8)) + 'px';
      m.style.top = (r.bottom + h + 8 > innerHeight ? Math.max(8, r.top - h - 4) : r.bottom + 4) + 'px';
      let done = false;
      const close = v => { if (done) return; done = true; m.remove(); document.removeEventListener('pointerdown', out, true); document.removeEventListener('keydown', key, true); anchor.focus && anchor.focus(); resolve(v); };
      const out = e => { if (!m.contains(e.target)) close(null); };
      const key = e => {
        const bs = [...m.querySelectorAll('button:not(:disabled)')], i = bs.indexOf(document.activeElement);
        if (e.key === 'Escape') { e.preventDefault(); close(null); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); (bs[i + 1] || bs[0]).focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); (bs[i - 1] || bs[bs.length - 1]).focus(); }
      };
      m.addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) close(b.dataset.v); });
      setTimeout(() => { document.addEventListener('pointerdown', out, true); document.addEventListener('keydown', key, true); const f = m.querySelector('button:not(:disabled)'); f && f.focus(); });
    });
  }
  let toastEl = null, toastT = 0;
  function toast(text, o = {}) {
    return new Promise(resolve => {
      if (toastEl) toastEl.remove();
      clearTimeout(toastT);
      const t = toastEl = document.createElement('div'); t.className = 'bc-toast'; t.setAttribute('role', 'status');
      t.innerHTML = `<span>${esc(text)}</span>${o.action ? `<button class="bc-btn bc-btn--s">${esc(o.action)}</button>` : ''}`;
      document.body.appendChild(t);
      const end = v => { clearTimeout(toastT); if (toastEl === t) { t.remove(); toastEl = null; } resolve(v); };
      if (o.action) t.querySelector('button').addEventListener('click', () => end('action'));
      toastT = setTimeout(() => end(null), o.duration || (o.action ? 6000 : 3200));
    });
  }
  window.BCUI = {icon, esc, modal, menu, toast, labels};
})();
