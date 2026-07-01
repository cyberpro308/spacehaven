/* =====================================================================
   Menu page — render dishes from MENU, filter/search, add to cart.
   ===================================================================== */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const money = (n) => "₦" + Number(n).toLocaleString("en-NG");

  const grid = $("#menuGrid");
  if (!grid || !window.MENU) return;

  const FAV_KEY = "sh_favs_v1";
  let favs = [];
  try { favs = JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch { favs = []; }
  const saveFavs = () => { try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch {} };

  const tagLabel = { veg: "Veg", spicy: "Spicy", gf: "Gluten-free", pop: "Popular" };
  const tagIcon  = { veg: "fa-leaf", spicy: "fa-pepper-hot", gf: "fa-wheat-awn-circle-exclamation", pop: "fa-fire" };

  function starHtml(rating) {
    const full = Math.round(rating);
    return "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
  }

  function cardHtml(d) {
    const isFav = favs.includes(d.id);
    const tags = (d.tags || []).map((t) =>
      `<span class="tag ${t}"><i class="fa-solid ${tagIcon[t]}"></i>${tagLabel[t]}</span>`).join("");
    return `
      <article class="dish" data-cat="${d.cat}" data-name="${d.name.toLowerCase()}" data-id="${d.id}">
        <div class="dish-media">
          <img src="${d.img}" alt="${d.name}" loading="lazy">
          <div class="dish-tags">${tags}</div>
          <button class="dish-fav ${isFav ? "active" : ""}" type="button" data-fav aria-pressed="${isFav}" aria-label="Save ${d.name}">
            <i class="fa-${isFav ? "solid" : "regular"} fa-heart"></i>
          </button>
        </div>
        <div class="dish-body">
          <div class="dish-head">
            <h3>${d.name}</h3>
            <span class="dish-price">${money(d.price)}</span>
          </div>
          <div class="dish-meta">
            <span class="stars" aria-hidden="true">${starHtml(d.rating)}</span>
            <span>${d.rating.toFixed(1)} · ${d.reviews} reviews</span>
          </div>
          <p>${d.desc}</p>
          <div class="dish-foot">
            <div class="qty" aria-label="Quantity">
              <button type="button" data-q-dec aria-label="Decrease quantity">−</button>
              <input type="text" value="1" readonly aria-label="Quantity">
              <button type="button" data-q-inc aria-label="Increase quantity">+</button>
            </div>
            <button class="btn primary" type="button" data-add>
              <i class="fa-solid fa-cart-plus"></i> Add
            </button>
          </div>
        </div>
      </article>`;
  }

  function render(list) {
    grid.innerHTML = list.map(cardHtml).join("");
    $("#menuEmpty").classList.toggle("show", list.length === 0);
    $("#menuCount") && ($("#menuCount").textContent = `${list.length} dish${list.length === 1 ? "" : "es"}`);
  }

  let activeCat = "all";
  let query = "";
  function apply() {
    const list = window.MENU.filter((d) => {
      const catOk = activeCat === "all" || d.cat === activeCat;
      const qOk = !query || d.name.toLowerCase().includes(query) || d.desc.toLowerCase().includes(query);
      return catOk && qOk;
    });
    render(list);
  }

  render(window.MENU);

  /* Filters */
  $$(".chip[data-filter]").forEach((chip) =>
    chip.addEventListener("click", () => {
      $$(".chip[data-filter]").forEach((c) => { c.classList.remove("active"); c.setAttribute("aria-selected", "false"); });
      chip.classList.add("active"); chip.setAttribute("aria-selected", "true");
      activeCat = chip.dataset.filter;
      apply();
    })
  );

  /* Search */
  const search = $("#menuSearch");
  search && search.addEventListener("input", () => { query = search.value.trim().toLowerCase(); apply(); });

  /* Grid interactions (delegated) */
  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".dish");
    if (!card) return;
    const id = card.dataset.id;
    const input = card.querySelector(".qty input");
    let qty = parseInt(input.value, 10) || 1;

    if (e.target.closest("[data-q-inc]")) { input.value = Math.min(20, qty + 1); return; }
    if (e.target.closest("[data-q-dec]")) { input.value = Math.max(1, qty - 1); return; }
    if (e.target.closest("[data-add]")) {
      window.SH.addToCart(id, qty);
      input.value = 1;
      return;
    }
    const favBtn = e.target.closest("[data-fav]");
    if (favBtn) {
      const i = favs.indexOf(id);
      if (i >= 0) favs.splice(i, 1); else favs.push(id);
      saveFavs();
      const active = favs.includes(id);
      favBtn.classList.toggle("active", active);
      favBtn.setAttribute("aria-pressed", active);
      favBtn.querySelector("i").className = `fa-${active ? "solid" : "regular"} fa-heart`;
      window.SH.toast(active ? "Saved to favourites" : "Removed from favourites", "info");
    }
  });
})();
