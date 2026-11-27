/* Module placeholder – areas that exist in the product but are not in the prototype yet (E-shop, Statistics).
   They stay in the navigation so testers meet the real information architecture; the page says plainly that it is not built. */
'use strict';
const notBuilt = (area, title, icon) => () => ({area, title, crumbs: [{label: title, href: area}],
  view: `<div class="phead"><div class="phead__t"><h1>${esc(title)}</h1></div></div><div class="bc-card">${emptyState(icon, t('notInPrototype'), t('notInPrototypeText'))}</div>`});
route('eshop', () => notBuilt('eshop', t('navEshop'), 'shopping-cart')());
route('stats', () => notBuilt('stats', t('navStats'), 'chart-column')());
