/* =====================================================================
   Space Haven — shared application logic
   Exposes window.SH with cart + toast helpers used across pages.
   ===================================================================== */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const money = (n) => "₦" + Number(n).toLocaleString("en-NG");
  const DELIVERY_FEE = 1500;
  const FREE_DELIVERY_OVER = 15000;

  /* ---------------- Toast system ---------------- */
  let toastWrap;
  function toast(message, type = "success", title) {
    if (!toastWrap) {
      toastWrap = document.createElement("div");
      toastWrap.className = "toast-wrap";
      toastWrap.setAttribute("aria-live", "polite");
      document.body.appendChild(toastWrap);
    }
    const icons = { success: "fa-circle-check", error: "fa-circle-exclamation", info: "fa-circle-info" };
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.setAttribute("role", "status");
    el.innerHTML = `<i class="fa-solid ${icons[type] || icons.success}"></i>
      <div>${title ? `<b>${title}</b>` : ""}<span>${message}</span></div>`;
    toastWrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => el.remove(), 350);
    }, 3600);
  }

  /* ---------------- Cart (localStorage) ---------------- */
  const CART_KEY = "sh_cart_v1";
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { cart = []; }

  const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {} };
  const cartCount = () => cart.reduce((s, i) => s + i.qty, 0);
  const cartSubtotal = () => cart.reduce((s, i) => s + i.price * i.qty, 0);
  const findDish = (id) => (window.MENU || []).find((d) => d.id === id);

  function addToCart(id, qty = 1) {
    const dish = findDish(id);
    if (!dish) return;
    const row = cart.find((i) => i.id === id);
    if (row) row.qty += qty;
    else cart.push({ id, name: dish.name, price: dish.price, img: dish.img, qty });
    saveCart(); renderCart(); bumpBadge();
    toast(`${dish.name} added to your cart`, "success", "Added to cart");
  }
  function setQty(id, qty) {
    const row = cart.find((i) => i.id === id);
    if (!row) return;
    row.qty = Math.max(0, qty);
    if (row.qty === 0) cart = cart.filter((i) => i.id !== id);
    saveCart(); renderCart();
  }
  function removeFromCart(id) {
    cart = cart.filter((i) => i.id !== id);
    saveCart(); renderCart();
    toast("Item removed from cart", "info");
  }
  function clearCart() { cart = []; saveCart(); renderCart(); }

  function bumpBadge() {
    $$(".cart-count").forEach((b) => {
      const n = cartCount();
      b.textContent = n;
      b.classList.toggle("show", n > 0);
      if (!reduceMotion && n > 0) {
        b.animate(
          [{ transform: "scale(1)" }, { transform: "scale(1.35)" }, { transform: "scale(1)" }],
          { duration: 300, easing: "cubic-bezier(.22,1,.36,1)" }
        );
      }
    });
  }

  function renderCart() {
    bumpBadge();
    const list = $("#cartItems");
    if (list) {
      if (!cart.length) {
        list.innerHTML = `<div class="cart-empty">
          <i class="fa-solid fa-basket-shopping"></i>
          <p>Your cart is empty.<br>Add some delicious dishes!</p>
          <a href="menu.html" class="btn primary small" style="margin-top:14px">Browse Menu</a>
        </div>`;
      } else {
        list.innerHTML = cart.map((i) => `
          <div class="cart-row" data-id="${i.id}">
            <img src="${i.img}" alt="${i.name}" loading="lazy">
            <div>
              <div class="ci-name">${i.name}</div>
              <div class="ci-price">${money(i.price)}</div>
              <div class="qty" style="margin-top:6px">
                <button type="button" data-cart-dec aria-label="Decrease">−</button>
                <input type="text" value="${i.qty}" readonly aria-label="Quantity">
                <button type="button" data-cart-inc aria-label="Increase">+</button>
              </div>
            </div>
            <button class="ci-remove" type="button" data-cart-remove aria-label="Remove ${i.name}">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>`).join("");
      }
    }
    // Totals (cart drawer + any checkout summary)
    const sub = cartSubtotal();
    const delivery = sub === 0 ? 0 : (sub >= FREE_DELIVERY_OVER ? 0 : DELIVERY_FEE);
    $$("[data-cart-subtotal]").forEach((e) => (e.textContent = money(sub)));
    $$("[data-cart-delivery]").forEach((e) => (e.textContent = delivery === 0 ? (sub === 0 ? money(0) : "FREE") : money(delivery)));
    $$("[data-cart-total]").forEach((e) => (e.textContent = money(sub + delivery)));
    // Render checkout order lines if present
    const sum = $("#checkoutSummary");
    if (sum) {
      sum.innerHTML = cart.length
        ? cart.map((i) => `<div class="cart-line"><span>${i.qty}× ${i.name}</span><span>${money(i.price * i.qty)}</span></div>`).join("")
        : `<div class="cart-line"><span>No items yet</span><span>—</span></div>`;
    }
    document.dispatchEvent(new CustomEvent("cart:change", { detail: { count: cartCount(), subtotal: sub } }));
  }

  /* Delegate cart row buttons */
  document.addEventListener("click", (e) => {
    const row = e.target.closest(".cart-row");
    if (row) {
      const id = row.dataset.id;
      const item = cart.find((i) => i.id === id);
      if (e.target.closest("[data-cart-inc]")) return setQty(id, (item?.qty || 0) + 1);
      if (e.target.closest("[data-cart-dec]")) return setQty(id, (item?.qty || 0) - 1);
      if (e.target.closest("[data-cart-remove]")) return removeFromCart(id);
    }
  });

  /* ---------------- Cart drawer open/close ---------------- */
  function openCart() { document.body.classList.add("cart-open", "no-scroll"); }
  function closeCart() { document.body.classList.remove("cart-open", "no-scroll"); }

  /* =====================================================================
     DOM ready — wire everything that depends on markup
     ===================================================================== */
  document.addEventListener("DOMContentLoaded", () => {
    /* Theme */
    const THEME_KEY = "sh_theme";
    const root = document.documentElement;
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) root.setAttribute("data-theme", stored);
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) root.setAttribute("data-theme", "dark");
    $$("[data-theme-toggle]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        localStorage.setItem(THEME_KEY, next);
      })
    );

    /* Header scroll state */
    const nav = $(".nav");
    const toTop = $(".to-top");
    const onScroll = () => {
      const y = window.scrollY || 0;
      nav && nav.classList.toggle("scrolled", y > 8);
      toTop && toTop.classList.toggle("show", y > 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    toTop && toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    /* Active nav link based on current file */
    const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    $$(".nav-links a, .drawer-links a").forEach((a) => {
      const href = (a.getAttribute("href") || "").toLowerCase();
      if (href === page || (page === "" && href === "index.html")) a.classList.add("active");
    });

    /* Mobile drawer */
    const navToggle = $(".nav-toggle");
    const closeDrawerBtn = $("#drawerClose");
    const openDrawer = () => document.body.classList.add("drawer-open", "no-scroll");
    const closeDrawer = () => document.body.classList.remove("drawer-open", "no-scroll");
    navToggle && navToggle.addEventListener("click", () =>
      document.body.classList.contains("drawer-open") ? closeDrawer() : openDrawer()
    );
    closeDrawerBtn && closeDrawerBtn.addEventListener("click", closeDrawer);
    $$(".drawer-links a").forEach((a) => a.addEventListener("click", closeDrawer));

    /* Cart drawer triggers */
    $$("[data-open-cart]").forEach((b) => b.addEventListener("click", openCart));
    const cartClose = $("#cartClose");
    cartClose && cartClose.addEventListener("click", closeCart);
    const backdrop = $(".drawer-backdrop");
    backdrop && backdrop.addEventListener("click", () => { closeDrawer(); closeCart(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeDrawer(); closeCart(); closeLightbox(); }
    });

    renderCart();

    /* Scroll reveal */
    const reveals = $$("[data-reveal]");
    if (!reduceMotion && "IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
      reveals.forEach((el) => io.observe(el));
    } else reveals.forEach((el) => el.classList.add("in"));

    /* FAQ accordion */
    $$(".faq-q").forEach((q) =>
      q.addEventListener("click", () => {
        const item = q.closest(".faq-item");
        const a = item.querySelector(".faq-a");
        const open = item.classList.toggle("open");
        q.setAttribute("aria-expanded", open ? "true" : "false");
        a.style.maxHeight = open ? a.scrollHeight + "px" : 0;
      })
    );

    /* Testimonials carousel */
    const track = $("#tstTrack");
    if (track) {
      const step = () => {
        const card = track.querySelector(".tst");
        return card ? card.getBoundingClientRect().width + 22 : 360;
      };
      $("#tstPrev") && $("#tstPrev").addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
      $("#tstNext") && $("#tstNext").addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));
      let hover = false;
      track.addEventListener("mouseenter", () => (hover = true));
      track.addEventListener("mouseleave", () => (hover = false));
      if (!reduceMotion) {
        setInterval(() => {
          if (hover) return;
          const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 10;
          if (atEnd) track.scrollTo({ left: 0, behavior: "smooth" });
          else track.scrollBy({ left: step(), behavior: "smooth" });
        }, 4600);
      }
    }

    /* Lightbox (gallery) */
    initLightbox();

    /* Opening hours "open now" */
    initHours();

    /* Newsletter forms */
    $$("[data-newsletter]").forEach((form) =>
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = form.querySelector("input");
        if (input && input.value.includes("@")) {
          toast("You're subscribed! Check your inbox for a welcome treat.", "success", "Subscribed 🎉");
          form.reset();
        } else {
          toast("Please enter a valid email address.", "error");
        }
      })
    );

    /* Set current year */
    $$("[data-year]").forEach((e) => (e.textContent = new Date().getFullYear()));

    /* Animated count-up for stats */
    initCountUp();
  });

  /* ---------------- Count-up ---------------- */
  function initCountUp() {
    const els = $$("[data-count]");
    if (!els.length) return;
    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const decimals = parseInt(el.dataset.decimals || "0", 10);
      const suffix = el.dataset.suffix || "";
      const dur = 1400;
      if (reduceMotion) { el.textContent = target.toFixed(decimals) + suffix; return; }
      let start = null;
      const tick = (ts) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
        el.textContent = (target * eased).toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = target.toFixed(decimals) + suffix;
      };
      requestAnimationFrame(tick);
    };
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } });
      }, { threshold: 0.4 });
      els.forEach((el) => io.observe(el));
    } else els.forEach(run);
  }

  /* ---------------- Lightbox ---------------- */
  let lbImages = [], lbIndex = 0, lbEl, lbImg;
  function initLightbox() {
    const links = $$("[data-lightbox]");
    if (!links.length) return;
    lbImages = links.map((a) => a.getAttribute("href") || a.querySelector("img")?.src);
    lbEl = $("#lightbox");
    lbImg = $("#lightboxImg");
    if (!lbEl) return;
    links.forEach((a, i) =>
      a.addEventListener("click", (e) => { e.preventDefault(); openLightbox(i); })
    );
    $("#lbClose") && $("#lbClose").addEventListener("click", closeLightbox);
    $("#lbPrev") && $("#lbPrev").addEventListener("click", () => lbShow(-1));
    $("#lbNext") && $("#lbNext").addEventListener("click", () => lbShow(1));
    lbEl.addEventListener("click", (e) => { if (e.target === lbEl) closeLightbox(); });
    document.addEventListener("keydown", (e) => {
      if (!lbEl.classList.contains("open")) return;
      if (e.key === "ArrowLeft") lbShow(-1);
      if (e.key === "ArrowRight") lbShow(1);
    });
  }
  function openLightbox(i) {
    if (!lbEl) return;
    lbIndex = i; lbImg.src = lbImages[i];
    lbEl.classList.add("open"); document.body.classList.add("no-scroll");
  }
  function closeLightbox() { lbEl && lbEl.classList.remove("open"); document.body.classList.remove("no-scroll"); }
  function lbShow(d) { lbIndex = (lbIndex + d + lbImages.length) % lbImages.length; lbImg.src = lbImages[lbIndex]; }

  /* ---------------- Opening hours ---------------- */
  function initHours() {
    const pill = $("#openStatus");
    if (!pill) return;
    // Mon–Thu 11–22, Fri–Sat 11–23:30, Sun 12–21
    const now = new Date();
    const day = now.getDay(); // 0 Sun
    const mins = now.getHours() * 60 + now.getMinutes();
    const schedule = {
      0: [12 * 60, 21 * 60],
      1: [11 * 60, 22 * 60], 2: [11 * 60, 22 * 60], 3: [11 * 60, 22 * 60], 4: [11 * 60, 22 * 60],
      5: [11 * 60, 23 * 60 + 30], 6: [11 * 60, 23 * 60 + 30],
    };
    const [open, close] = schedule[day];
    const isOpen = mins >= open && mins < close;
    pill.className = "open-pill " + (isOpen ? "open" : "closed");
    pill.innerHTML = `<span class="dot"></span> ${isOpen ? "Open now" : "Closed now"}`;
    // Highlight today's row
    $$(".hours-list li").forEach((li, i) => li.classList.toggle("today", ((i + 1) % 7) === day));
  }

  /* ---------------- Form validation helper ---------------- */
  function validateForm(form) {
    let ok = true;
    $$("[required]", form).forEach((field) => {
      const group = field.closest(".field-group") || field.parentElement;
      const err = group ? group.querySelector(".err-msg") : null;
      let valid = field.value.trim() !== "";
      if (valid && field.type === "email") valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value);
      if (valid && field.type === "tel") valid = field.value.replace(/\D/g, "").length >= 7;
      field.classList.toggle("invalid", !valid);
      if (err) err.classList.toggle("show", !valid);
      if (!valid && ok) field.focus();
      if (!valid) ok = false;
    });
    return ok;
  }

  /* ---------------- Public API ---------------- */
  window.SH = {
    addToCart, setQty, removeFromCart, clearCart,
    getCart: () => cart.slice(),
    cartCount, cartSubtotal,
    openCart, closeCart,
    toast, money, validateForm, renderCart,
    DELIVERY_FEE, FREE_DELIVERY_OVER,
  };
})();
