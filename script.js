// Password gate — site-wide
(function () {
  var KEY = 'atlantis_pw_ok';
  var PASS = 'Ultramog69';
  function get() { try { return sessionStorage.getItem(KEY); } catch (e) { return null; } }
  function set() { try { sessionStorage.setItem(KEY, '1'); } catch (e) {} }
  function init() {
    if (get() === '1') return;
    var wrap = document.createElement('div');
    wrap.className = 'password-gate';
    wrap.innerHTML = '<div class="password-gate-inner"><p class="password-gate-text">Enter password</p><input type="password" class="password-gate-input" placeholder="Password" autocomplete="off"><button type="button" class="password-gate-btn">Enter</button></div>';
    document.body.insertBefore(wrap, document.body.firstChild);
    var input = wrap.querySelector('.password-gate-input');
    var btn = wrap.querySelector('.password-gate-btn');
    function submit() {
      if (input.value === PASS) { set(); wrap.remove(); }
      else { input.value = ''; input.placeholder = 'Incorrect'; }
    }
    btn.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    input.focus();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// Age gate — only on homepage, resets every 24 hours
(function () {
  var path = window.location.pathname || '';
  var isHome = path === '/' || path === '/index.html' || path.endsWith('/');
  if (!isHome) return;
  var KEY = 'atlantis_age_verified';
  var HOURS = 24;
  function get() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function set(val) {
    try { localStorage.setItem(KEY, JSON.stringify({ answer: val, ts: Date.now() })); } catch (e) {}
  }
  function isExpired() {
    var data = get();
    if (!data || !data.ts) return true;
    return (Date.now() - data.ts) > HOURS * 60 * 60 * 1000;
  }
  function shouldShow() {
    var data = get();
    if (!data) return true;
    if (data.answer === 'yes' && !isExpired()) return false;
    return true;
  }
  function init() {
    if (!shouldShow()) return;
    var gate = document.createElement('div');
    gate.className = 'age-gate';
    gate.innerHTML = '<div class="age-gate-inner"><p class="age-gate-text">Are you 21 or older?</p><div class="age-gate-buttons"><button type="button" class="age-gate-btn age-gate-yes">Yes</button><button type="button" class="age-gate-btn age-gate-no">No</button></div></div>';
    document.body.insertBefore(gate, document.body.firstChild);
    gate.querySelector('.age-gate-yes').addEventListener('click', function () { set('yes'); gate.remove(); });
    gate.querySelector('.age-gate-no').addEventListener('click', function () { set('no'); window.location.href = 'https://www.google.com'; });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// Cart with cookie persistence
(function () {
  const CART_COOKIE = 'atlantis_cart';
  const COOKIE_DAYS = 7;

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  function setCookie(name, value, days) {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = name + '=' + encodeURIComponent(value) + ';path=/;expires=' + d.toUTCString() + ';SameSite=Lax';
  }

  function getCart() {
    try {
      const raw = getCookie(CART_COOKIE);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveCart(items) {
    setCookie(CART_COOKIE, JSON.stringify(items), COOKIE_DAYS);
  }

  function updateCartBadge() {
    const items = getCart();
    const total = items.reduce(function (sum, item) { return sum + (item.quantity || 1); }, 0);
    document.querySelectorAll('.cart-badge').forEach(function (el) {
      el.textContent = total;
      el.classList.toggle('is-empty', total === 0);
    });
  }

  function renderCart() {
    const body = document.querySelector('.cart-panel-body');
    if (!body) return;
    const items = getCart();
    updateCartBadge();
    if (items.length === 0) {
      body.innerHTML = '<p class="cart-empty">Your cart is empty</p>';
      return;
    }
    body.innerHTML = items.map(function (item, i) {
      const qty = item.quantity || 1;
      return (
        '<div class="cart-item" data-index="' + i + '">' +
        '<div class="cart-item-info">' +
        '<span class="cart-item-name">' + (item.name || 'Item') + '</span>' +
        '<div class="cart-item-qty-controls">' +
        '<button type="button" class="qty-btn qty-minus" aria-label="Decrease quantity">−</button>' +
        '<span class="qty-value">' + qty + '</span>' +
        '<button type="button" class="qty-btn qty-plus" aria-label="Increase quantity">+</button>' +
        '</div>' +
        (item.price ? '<span class="cart-item-price">$' + (item.price * qty).toFixed(2) + '</span>' : '') +
        '</div>' +
        '<button type="button" class="cart-item-remove" aria-label="Remove">×</button>' +
        '</div>'
      );
    }).join('') +
      '<div class="cart-panel-footer"><a href="checkout.html" class="cart-checkout-btn">Checkout</a></div>';
    body.querySelectorAll('.cart-item-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const idx = parseInt(this.closest('.cart-item').dataset.index, 10);
        const cart = getCart();
        cart.splice(idx, 1);
        saveCart(cart);
        renderCart();
      });
    });
    body.querySelectorAll('.cart-item .qty-minus').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const idx = parseInt(this.closest('.cart-item').dataset.index, 10);
        const cart = getCart();
        const item = cart[idx];
        const qty = Math.max(0, (item.quantity || 1) - 1);
        if (qty === 0) {
          cart.splice(idx, 1);
        } else {
          item.quantity = qty;
        }
        saveCart(cart);
        renderCart();
      });
    });
    body.querySelectorAll('.cart-item .qty-plus').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const idx = parseInt(this.closest('.cart-item').dataset.index, 10);
        const cart = getCart();
        const item = cart[idx];
        item.quantity = (item.quantity || 1) + 1;
        saveCart(cart);
        renderCart();
      });
    });
  }

  window.getCart = getCart;

  window.addToCart = function (item) {
    const cart = getCart();
    const qty = item.quantity || 1;
    const existing = cart.find(function (c) { return c.id === (item.id || ''); });
    if (existing) {
      existing.quantity = (existing.quantity || 1) + qty;
    } else {
      cart.push({
        id: item.id || Date.now(),
        name: item.name || 'Product',
        price: item.price || 0,
        quantity: qty
      });
    }
    saveCart(cart);
    renderCart();
  };

  window.saveCart = saveCart;

  const trigger = document.getElementById('cart-trigger');
  const panel = document.getElementById('cart-panel');
  const overlay = document.getElementById('cart-overlay');
  const close = document.getElementById('cart-close');

  function openCart() {
    renderCart();
    panel.classList.add('is-open');
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeCart() {
    panel.classList.remove('is-open');
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (trigger) trigger.addEventListener('click', openCart);
  if (close) close.addEventListener('click', closeCart);
  if (overlay) overlay.addEventListener('click', closeCart);

  renderCart();
  updateCartBadge();
})();

// Menu timestamp (e.g. 02/22/2026 10:34 PM EST)
function updateMenuTime() {
  const el = document.getElementById('menu-time');
  if (el) {
    el.textContent = new Date().toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });
  }
}
updateMenuTime();
setInterval(updateMenuTime, 60000);

// Smooth scroll for anchor links (backup for CSS)
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Remove page-exit when returning via back/forward (fixes blank page on back)
window.addEventListener('pageshow', function () {
  document.body.classList.remove('page-exit');
});

// Page transition on navigation
document.addEventListener('click', function (e) {
  var a = e.target.closest('a');
  if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
  var href = a.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
  if (href.startsWith('http') && !href.startsWith(window.location.origin)) return;
  e.preventDefault();
  document.body.classList.add('page-exit');
  setTimeout(function () { window.location.href = href; }, 250);
});
