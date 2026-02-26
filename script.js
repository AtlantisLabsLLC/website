// Advisory bar — horizontal LED-style ticker (constant scroll)
(function () {
  var MESSAGES = [
    'Free shipping on orders above $250.',
    'Free Bac water for orders above $200.'
  ];
  var SEP = '                    ';
  function run() {
    var track = document.querySelector('.advisory-track');
    if (!track) return;
    var text = (MESSAGES.join(SEP) + SEP).repeat(2);
    track.textContent = text;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();

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

  const BAC_WATER_FREE_ID = 'bac-water-free';
  const FREE_BAC_THRESHOLD = 200;
  const BAC_WATER_PRICE = 8.99;

  function getItemLineTotal(item) {
    var qty = item.quantity || 1;
    if (item.id === BAC_WATER_FREE_ID) return Math.max(0, qty - 1) * BAC_WATER_PRICE;
    return (item.price || 0) * qty;
  }

  function getPaidSubtotal(items) {
    return (items || getCart()).reduce(function (sum, item) {
      if (item.id === BAC_WATER_FREE_ID) return sum;
      var qty = item.quantity || 1;
      var price = item.price || 0;
      return sum + price * qty;
    }, 0);
  }

  function syncPromoItems() {
    var cart = getCart();
    var paidSubtotal = getPaidSubtotal(cart);
    var freeBacItem = cart.find(function (item) { return item.id === BAC_WATER_FREE_ID; });
    var hasFreeBac = !!freeBacItem;
    if (paidSubtotal >= FREE_BAC_THRESHOLD && !hasFreeBac) {
      cart.push({
        id: BAC_WATER_FREE_ID,
        name: 'Bacteriostatic Water (10ml) — Free',
        price: 0,
        quantity: 1
      });
      saveCart(cart);
    } else if (paidSubtotal < FREE_BAC_THRESHOLD && hasFreeBac) {
      var qty = freeBacItem.quantity || 1;
      var next = cart.filter(function (item) { return item.id !== BAC_WATER_FREE_ID; });
      if (qty > 1) {
        next.push({
          id: 'bac-water',
          name: 'Bacteriostatic Water (10ml)',
          price: BAC_WATER_PRICE,
          quantity: qty - 1
        });
      }
      saveCart(next);
    }
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
    syncPromoItems();
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
        (item.id === BAC_WATER_FREE_ID ? (qty > 1 ? '<span class="cart-item-price">$' + getItemLineTotal(item).toFixed(2) + '</span>' : '<span class="cart-item-price cart-item-free">Free</span>') : '<span class="cart-item-price">$' + (item.price * qty).toFixed(2) + '</span>') +
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
  window.syncPromoItems = syncPromoItems;
  window.getItemLineTotal = getItemLineTotal;

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

// Legal panel — slides in from left, content embedded below
(function () {
  const LEGAL_CONTENT = {
    privacy: {
      title: 'Privacy Policy',
      body: '<article class="faq-item"><h3>Effective date</h3><p>This Privacy Policy is effective as of February 22, 2026. Atlantis Labs is committed to protecting the privacy and security of our customers and visitors. This policy describes how we collect, use, and safeguard your information when you use our website, place an order, or contact us.</p></article><article class="faq-item"><h3>1. Information we collect</h3><p>We may collect the following when you visit or use our site: <strong>Personal information</strong> — name, email address, billing and shipping address, and phone number provided at checkout or when you contact us. <strong>Technical information</strong> — IP address, browser type, device information, and cookies used for site functionality and analytics. <strong>Order and transaction data</strong> — products purchased, shipping preferences, and payment method details.</p></article><article class="faq-item"><h3>2. How we use your information</h3><p>We use your information only for legitimate business purposes: processing and fulfilling orders; sending order confirmations, shipping updates, and providing customer support; improving site performance and user experience; preventing fraud and ensuring security; and complying with applicable laws and regulations.</p></article><article class="faq-item"><h3>3. How we protect your data</h3><p>Sensitive payment data is processed through secure, PCI-compliant third-party payment processors. We use industry-standard encryption and security measures to protect customer information. Atlantis Labs does not sell or rent customer data to third parties.</p></article><article class="faq-item"><h3>4. Sharing of information</h3><p>We may share limited customer information only when necessary: with trusted service providers who perform services on our behalf (e.g., shipping carriers, payment processors); when required by law, court order, or regulatory authority; or to investigate, prevent, or address fraud, illegal activity, or security threats.</p></article><article class="faq-item"><h3>5. Cookies and tracking</h3><p>Our website uses cookies and similar technologies to support site functionality (such as your shopping cart), improve performance, and for analytics. You may adjust your browser settings to refuse cookies; some features may not work correctly without them.</p></article><article class="faq-item"><h3>6. Data retention</h3><p>We retain order records and related information only as long as needed for legal, accounting, and operational purposes.</p></article><article class="faq-item"><h3>7. Your rights</h3><p>Depending on your location, you may have the right to access or request a copy of your personal information, request correction or deletion of your data, or opt out of certain data practices. To exercise these rights, contact us at <a href="mailto:contact@atlantislabs.shop" class="contact-email">contact@atlantislabs.shop</a>.</p></article><article class="faq-item"><h3>8. Policy updates</h3><p>We may update this Privacy Policy from time to time. Changes will be posted here with a revised effective date. Continued use of our website after changes indicates acceptance of the updated policy.</p></article><article class="faq-item"><h3>9. Contact us</h3><p>If you have questions about this Privacy Policy or how your data is handled, contact us at <a href="mailto:contact@atlantislabs.shop" class="contact-email">contact@atlantislabs.shop</a>.</p></article>'
    },
    terms: {
      title: 'Terms and Conditions',
      body: '<article class="faq-item"><h3>Effective date</h3><p>These Terms and Conditions are effective as of February 22, 2026. Welcome to Atlantis Labs. By accessing our website or purchasing our products, you agree to be bound by these Terms and Conditions. Please read them carefully.</p></article><article class="faq-item"><h3>1. Eligibility</h3><p>By purchasing from Atlantis Labs, you confirm that you are at least 21 years of age; a qualified individual purchasing products for research purposes only; and aware that our products are not intended for human or veterinary consumption, nor for diagnostic or therapeutic use.</p></article><article class="faq-item"><h3>2. Research use only</h3><p>All products sold by Atlantis Labs are intended strictly for laboratory research by qualified professionals. Products are not FDA-approved and should not be used for any medical, clinical, or recreational purpose. Atlantis Labs assumes no liability for misuse or misrepresentation of product application.</p></article><article class="faq-item"><h3>3. Orders and payment</h3><p>All prices are listed in USD unless otherwise specified. Atlantis Labs reserves the right to refuse or cancel any order at our discretion. Payments are processed securely through third-party providers; we do not store sensitive payment details on our servers.</p></article><article class="faq-item"><h3>4. Shipping and delivery</h3><p>We are based in California and ship domestically within the United States. Customers are responsible for providing a valid delivery address and complying with applicable laws. Risk of loss passes to you upon delivery to the carrier. Atlantis Labs is not liable for delays, losses, or failures caused by carriers or circumstances beyond our control.</p></article><article class="faq-item"><h3>5. Returns and refunds</h3><p>All sales are final. Research materials cannot be returned once shipped. Exceptions may be made only for verified damaged shipments or fulfillment errors. Contact us at <a href="mailto:contact@atlantislabs.shop" class="contact-email">contact@atlantislabs.shop</a> for such issues. Additional details are in our FAQ.</p></article><article class="faq-item"><h3>6. Limitation of liability</h3><p>Atlantis Labs products are provided “as is” without warranties, express or implied. We are not responsible for any direct, indirect, incidental, or consequential damages resulting from use or misuse of our products. Purchasers assume full responsibility for the safe handling, storage, and intended research use of all products.</p></article><article class="faq-item"><h3>7. Intellectual property</h3><p>All website content, branding, text, graphics, and logos are the intellectual property of Atlantis Labs. Unauthorized use, reproduction, or distribution is strictly prohibited.</p></article><article class="faq-item"><h3>8. Governing law</h3><p>These Terms and Conditions are governed by and construed under the laws of the State of California, United States. Any disputes shall be resolved exclusively in the state or federal courts located in California.</p></article><article class="faq-item"><h3>9. Changes to terms</h3><p>Atlantis Labs reserves the right to update or modify these Terms and Conditions at any time. Updates will be posted on this page with a revised effective date. Continued use of our website constitutes acceptance of the updated terms.</p></article><article class="faq-item"><h3>10. Contact</h3><p>For questions about these Terms and Conditions, contact us at <a href="mailto:contact@atlantislabs.shop" class="contact-email">contact@atlantislabs.shop</a>.</p></article>'
    },
    'terms-of-service': {
      title: 'Terms of Service',
      body: '<article class="faq-item"><h3>Effective date</h3><p>These Terms of Service are effective as of February 22, 2026. Please read them carefully before using the Atlantis Labs website or purchasing any products. By visiting our site or completing a purchase, you acknowledge that you have read, understood, and agree to be bound by these Terms.</p></article><article class="faq-item"><h3>1. Scope and acceptance</h3><p>These Terms govern your use of the Atlantis Labs website and all products, materials, and services offered through it. By using this website or placing an order, you agree to comply with and be legally bound by these Terms and our Terms and Conditions, as well as applicable laws. If you do not agree, you must not use our site or purchase our products.</p></article><article class="faq-item"><h3>2. Intended use and eligibility</h3><p>Atlantis Labs supplies research-grade peptides and related compounds intended strictly for laboratory research. These materials are not designed, labeled, or approved for human or animal consumption; diagnostic, therapeutic, or medical use; recreational or cosmetic use; or any other non-research application. By purchasing from us, you confirm that you are at least 21 years of age and a qualified research professional with appropriate training, facilities, and equipment to safely handle and store such materials.</p></article><article class="faq-item"><h3>3. Compliance and restrictions</h3><p>You agree not to use any product obtained from Atlantis Labs in a manner that violates applicable local, state, federal, or international law. You agree that our products will not be exported or resold in violation of trade or export control laws; used in the development, manufacture, or testing of controlled drugs or weapons; or misrepresented or marketed as consumable products. We reserve the right to refuse or cancel any order if misuse or non-compliance is suspected.</p></article><article class="faq-item"><h3>4. Research use and regulatory notice</h3><p>All products sold by Atlantis Labs are for research use only and may not be registered or listed with the U.S. Food and Drug Administration (FDA) or any other regulatory agency. Products should not be used in food, drugs, cosmetics, or medical devices. By accessing or purchasing from Atlantis Labs, you confirm that you will not use any product for human administration, consumption, or clinical purposes.</p></article><article class="faq-item"><h3>5. Product information and availability</h3><p>We strive to ensure product information, specifications, and pricing are accurate but cannot guarantee that descriptions or images are free of error. Product appearance may differ slightly. Atlantis Labs reserves the right to modify or discontinue any product or service at any time without prior notice.</p></article><article class="faq-item"><h3>6. Payment and orders</h3><p>Placing an order constitutes a legally binding agreement to pay. All sales are final unless otherwise stated. Unpaid or fraudulent transactions may be referred to collections or law enforcement as appropriate.</p></article><article class="faq-item"><h3>7. External links</h3><p>This website may contain links to third-party sites for your convenience. Atlantis Labs does not control, endorse, or assume responsibility for the content, products, or services on those sites. Accessing external links is at your own risk.</p></article><article class="faq-item"><h3>8. Limitation of liability</h3><p>All Atlantis Labs products are sold “as is” for research purposes only. We make no express or implied warranties. You assume full responsibility for the safe handling, storage, and lawful use of any materials purchased. Atlantis Labs shall not be liable for any damages—direct, indirect, incidental, or consequential—arising from misuse, mishandling, or unauthorized application of its products.</p></article><article class="faq-item"><h3>9. Indemnification</h3><p>You agree to indemnify and hold harmless Atlantis Labs, its officers, affiliates, employees, and agents from any and all claims, damages, or expenses (including reasonable attorney’s fees) arising from your use or misuse of the website or products, violation of these Terms, or infringement of any third-party rights.</p></article><article class="faq-item"><h3>10. Age and legal confirmation</h3><p>By accessing Atlantis Labs or making a purchase, you affirm that you are 21 years of age or older, legally permitted to purchase research materials, and fully aware of the regulations governing their use.</p></article><article class="faq-item"><h3>11. Modifications</h3><p>Atlantis Labs may update or revise these Terms at any time. The current version will be posted on this page with the updated date. Continued use of the website or further purchases after changes are posted constitutes acceptance of the revised Terms.</p></article><article class="faq-item"><h3>12. Final acknowledgment</h3><p>By completing a purchase or using this website, you confirm that you have read, understood, and accepted these Terms of Service, and that you will handle all products in compliance with applicable laws and research standards. Not for human or animal consumption — for research use only.</p></article><article class="faq-item"><h3>Contact</h3><p>For questions about these Terms of Service, contact us at <a href="mailto:contact@atlantislabs.shop" class="contact-email">contact@atlantislabs.shop</a>.</p></article>'
    },
    returns: {
      title: 'Returns & Refund Policy',
      body: '<article class="faq-item"><h3>Overview</h3><p>At Atlantis Labs, every vial is prepared, sealed, and shipped with care. Due to the nature of our products, we maintain strict standards on returns and refunds to protect both our customers and our integrity as a research supplier.</p></article><article class="faq-item"><h3>General policy</h3><p>All sales are final once an order has been processed and shipped. We do not accept returns of research materials once they have left our facility. Opened products cannot be returned under any circumstance. For safety and quality control, we are unable to offer refunds for orders that have been delivered.</p></article><article class="faq-item"><h3>Undelivered or lost shipments</h3><p>If your shipment never reaches its destination (e.g., lost in transit or undeliverable), contact us and we will work with you to either issue a refund or reship the package, as appropriate. This helps us maintain product integrity and ensures materials are handled only under controlled conditions.</p></article><article class="faq-item"><h3>Damaged or defective items</h3><p>If your order arrives damaged during transit, contact our support team within 2 days of delivery. Please provide your order number and clear photos of the packaging and damaged product. Once verified, we will resend a replacement item at no additional cost.</p></article><article class="faq-item"><h3>Fulfillment errors</h3><p>If an incorrect item was shipped or your order is incomplete, notify us within 2 days of delivery with proof of the error. We will promptly correct it and arrange for the correct item(s) to be shipped at no cost to you.</p></article><article class="faq-item"><h3>Non-refundable circumstances</h3><p>Refunds or replacements are not offered when: products have been opened, used, or tampered with after delivery; orders are seized, rejected, or delayed by customs or regulatory authorities; or packages are lost due to incorrect or incomplete shipping information provided by the customer.</p></article><article class="faq-item"><h3>How to request support</h3><p>Contact us at <a href="mailto:contact@atlantislabs.shop" class="contact-email">contact@atlantislabs.shop</a> with your order details. Our team will respond within 1–2 business days with next steps.</p></article><article class="faq-item"><h3>Compliance</h3><p>By completing a purchase, you acknowledge and agree to these terms. Atlantis Labs products are intended strictly for laboratory research and are not for human consumption.</p></article>'
    }
  };

  const overlay = document.getElementById('legal-overlay');
  const panel = document.getElementById('legal-panel');
  const titleEl = document.getElementById('legal-panel-title');
  const bodyEl = document.getElementById('legal-panel-body');
  const closeBtn = document.getElementById('legal-panel-close');

  function closeLegal() {
    if (!panel || !overlay) return;
    panel.classList.remove('is-open');
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function openLegal(title, bodyHtml) {
    if (!panel || !overlay || !titleEl || !bodyEl) return;
    titleEl.textContent = title;
    bodyEl.innerHTML = bodyHtml;
    panel.classList.add('is-open');
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  document.querySelectorAll('[data-legal]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var key = this.getAttribute('data-legal');
      var data = key && LEGAL_CONTENT[key];
      if (data) openLegal(data.title, data.body);
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeLegal);
  if (overlay) overlay.addEventListener('click', closeLegal);
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
    var target = document.querySelector(href);
    // On home page, scrolling to #contact: center the intro paragraph + contact section in the viewport
    if (href === '#contact' && target) {
      var about = document.getElementById('about');
      if (about) {
        e.preventDefault();
        var aboutTop = about.getBoundingClientRect().top + window.pageYOffset;
        var contactBottom = target.getBoundingClientRect().bottom + window.pageYOffset;
        var centerY = (aboutTop + contactBottom) / 2;
        var scrollTop = centerY - window.innerHeight / 2;
        window.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
        return;
      }
    }
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
