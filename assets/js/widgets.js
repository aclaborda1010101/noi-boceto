/* NOI — widgets: slideshows con cortes, secuencia de cortes al hacer scroll, galería, reservas y carta */
(function () {
  "use strict";

  const NOI = window.NOI;
  if (!NOI) return;

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const pad = (n) => String(n).padStart(2, "0");

  /* ---------- Slideshows: una foto corta a la siguiente ---------- */
  const DEFAULT_INTERVAL = 6200;
  const FADE_MS = 2600;

  function initSlides(el) {
    const images = [...el.querySelectorAll("img")];
    if (images.length < 2 || NOI.reduceMotion) return;
    const interval = Number(el.dataset.interval) || DEFAULT_INTERVAL;
    let index = images.findIndex((img) => img.classList.contains("is-active"));
    if (index < 0) index = 0;
    let timer = null;
    let visible = true;

    const advance = () => {
      const prev = images[index];
      index = (index + 1) % images.length;
      const next = images[index];
      prev.classList.remove("is-active", "is-entering");
      prev.classList.add("is-prev");
      next.classList.remove("is-prev");
      next.classList.add("is-active", "is-entering");
      setTimeout(() => {
        prev.classList.remove("is-prev");
        next.classList.remove("is-entering");
      }, FADE_MS);
    };
    const start = () => { if (!timer && visible && !document.hidden) timer = setInterval(advance, interval); };
    const stop = () => { clearInterval(timer); timer = null; };

    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      el.classList.toggle("is-paused", !visible);
      visible ? start() : stop();
    }).observe(el);
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

    const offset = Number(el.dataset.offset) || 0;
    NOI.onReady(() => setTimeout(start, offset));
  }

  /* ---------- Escenario de la home: fotos de las dos salas fundiéndose ---------- */
  const FILTER_LEAVE_DELAY = 450;

  function initStage(stage) {
    const home = stage.closest("[data-home]") || document.body;
    const images = [...stage.querySelectorAll("img")];
    const interval = Number(stage.dataset.interval) || DEFAULT_INTERVAL;
    const captionEl = document.querySelector("[data-stage-caption]");
    const indexEl = document.querySelector("[data-stage-index]");
    const totalEl = document.querySelector("[data-stage-total]");
    const bar = document.querySelector("[data-stage-bar]");
    let index = 0;
    let filter = null;
    let busyUntil = 0;
    let timer = null;
    let leaveTimer = null;

    home.style.setProperty("--stage-interval", `${interval}ms`);
    if (totalEl) totalEl.textContent = pad(images.length);

    const updateMeta = () => {
      if (captionEl) captionEl.textContent = images[index].dataset.caption || "";
      if (indexEl) indexEl.textContent = pad(index + 1);
      if (!bar) return;
      bar.classList.remove("is-running");
      void bar.offsetWidth; // reinicia la barra de progreso
      if (timer) bar.classList.add("is-running");
    };

    const nextIndex = () => {
      for (let step = 1; step <= images.length; step += 1) {
        const candidate = (index + step) % images.length;
        if (!filter || images[candidate].dataset.set === filter) return candidate;
      }
      return index;
    };

    const goTo = (target) => {
      if (target === index) return;
      const prev = images[index];
      const next = images[target];
      index = target;
      prev.classList.remove("is-active", "is-entering");
      prev.classList.add("is-prev");
      next.classList.remove("is-prev");
      next.classList.add("is-active", "is-entering");
      busyUntil = performance.now() + FADE_MS;
      setTimeout(() => {
        prev.classList.remove("is-prev");
        next.classList.remove("is-entering");
      }, FADE_MS);
      updateMeta();
    };

    const stop = () => { clearInterval(timer); timer = null; };
    const start = () => {
      stop();
      if (NOI.reduceMotion || document.hidden) return;
      timer = setInterval(() => goTo(nextIndex()), interval);
      updateMeta();
    };

    // Cambia de sala con un corte inmediato (o en cuanto termine el corte en curso)
    const setFilter = (value) => {
      clearTimeout(leaveTimer);
      if (filter === value) return;
      filter = value;
      if (value) home.dataset.set = value; else delete home.dataset.set;
      const needsCut = value && images[index].dataset.set !== value;
      if (!needsCut) { start(); return; }
      const wait = Math.max(0, busyUntil - performance.now());
      setTimeout(() => { goTo(nextIndex()); start(); }, wait);
    };

    document.querySelectorAll("[data-stage-filter]").forEach((link) => {
      const value = link.dataset.stageFilter;
      link.addEventListener("pointerenter", () => setFilter(value));
      link.addEventListener("focus", () => setFilter(value));
      const leave = () => { leaveTimer = setTimeout(() => setFilter(null), FILTER_LEAVE_DELAY); };
      link.addEventListener("pointerleave", leave);
      link.addEventListener("blur", leave);
    });

    // Precarga el resto de fotos cuando la primera ya está en pantalla
    const warm = () => images.forEach((img) => {
      img.loading = "eager";
      if (img.decode) img.decode().catch(() => { /* se decodificará al mostrarse */ });
    });
    if (document.readyState === "complete") warm(); else window.addEventListener("load", warm, { once: true });

    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    updateMeta();
    NOI.onReady(() => {
      home.classList.add("is-ready");
      start();
    });
  }

  /* ---------- Cortes: fotos a pantalla completa que se cortan al hacer scroll ---------- */
  const CLIPS = {
    bottom: (t) => `inset(${(1 - t) * 100}% 0 0 0)`,
    top: (t) => `inset(0 0 ${(1 - t) * 100}% 0)`,
    left: (t) => `inset(0 ${(1 - t) * 100}% 0 0)`,
    right: (t) => `inset(0 0 0 ${(1 - t) * 100}%)`,
    "center-v": (t) => `inset(0 ${(1 - t) * 50}% 0 ${(1 - t) * 50}%)`,
    "center-h": (t) => `inset(${(1 - t) * 50}% 0 ${(1 - t) * 50}% 0)`,
    diagonal: (t) => {
      const x = t * 140;
      return `polygon(0 0, ${x}% 0, ${x - 40}% 100%, 0 100%)`;
    },
  };

  function initCuts(section) {
    const cuts = [...section.querySelectorAll(".cut")];
    const indexEl = section.querySelector("[data-cuts-index]");
    const labelEl = section.querySelector("[data-cuts-label]");
    const bar = section.querySelector("[data-cuts-bar]");
    const steps = cuts.length - 1;
    section.style.setProperty("--n", String(cuts.length + 0.6));
    let current = -1;

    if (NOI.reduceMotion) {
      cuts.forEach((cut) => { cut.style.clipPath = "none"; });
      return;
    }

    NOI.onScroll(() => {
      const box = section.getBoundingClientRect();
      const travel = box.height - window.innerHeight;
      if (travel <= 0 || box.bottom < 0 || box.top > window.innerHeight) return;
      const progress = clamp(-box.top / travel, 0, 1);
      const s = progress * steps;

      cuts.forEach((cut, k) => {
        if (k === 0) return;
        const t = easeInOut(clamp(s - (k - 1), 0, 1));
        const clip = CLIPS[cut.dataset.cut] || CLIPS.bottom;
        cut.style.clipPath = t >= 1 ? "none" : clip(t);
        const scale = `scale(${(1.18 - 0.18 * t).toFixed(4)})`;
        cut.querySelectorAll("img").forEach((img) => { img.style.transform = scale; });
      });

      const active = clamp(Math.round(s), 0, steps);
      if (active !== current) {
        current = active;
        if (indexEl) indexEl.textContent = pad(active + 1);
        if (labelEl) labelEl.textContent = cuts[active].dataset.label || "";
      }
      if (bar) bar.style.transform = `scaleX(${progress.toFixed(4)})`;
    });
  }

  /* ---------- Galería horizontal ---------- */
  function initGallery(gallery) {
    const track = gallery.querySelector("[data-gallery-track]");
    if (!track) return;
    const step = (dir) => {
      const item = track.querySelector(".gallery__item");
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      const amount = item ? item.getBoundingClientRect().width + gap : track.clientWidth * 0.8;
      track.scrollBy({ left: dir * amount, behavior: NOI.reduceMotion ? "auto" : "smooth" });
    };
    gallery.querySelector("[data-gallery-prev]")?.addEventListener("click", () => step(-1));
    gallery.querySelector("[data-gallery-next]")?.addEventListener("click", () => step(1));
  }

  /* ---------- Reservas: modal con CoverManager (siempre con una sala seleccionada) ---------- */
  const DEFAULT_SALA = "ristorante";

  function initReserve() {
    const modal = document.querySelector("[data-reserve-modal]");
    if (!modal || typeof modal.showModal !== "function") return; // sin <dialog>: los enlaces abren CoverManager
    const tabs = [...modal.querySelectorAll(".reserve-tab")];
    const frame = modal.querySelector("[data-reserve-frame]");

    const select = (sala) => {
      const tab = tabs.find((t) => t.dataset.sala === sala) || tabs.find((t) => t.dataset.sala === DEFAULT_SALA);
      tabs.forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
      if (frame.getAttribute("src") !== tab.dataset.url) frame.setAttribute("src", tab.dataset.url);
    };

    const open = (sala) => {
      NOI.closeMenu?.();
      select(sala);
      modal.showModal();
      NOI.lockScroll(true);
    };

    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-reserve]");
      if (!trigger || event.metaKey || event.ctrlKey) return;
      event.preventDefault();
      open(trigger.dataset.reserve);
    });
    tabs.forEach((tab) => tab.addEventListener("click", () => select(tab.dataset.sala)));
    modal.querySelector("[data-reserve-close]")?.addEventListener("click", () => modal.close());
    modal.addEventListener("click", (event) => { if (event.target === modal) modal.close(); });
    modal.addEventListener("close", () => NOI.lockScroll(false));
  }

  /* ---------- Pestañas (carta): una sección visible cada vez ---------- */
  function initTabs(list) {
    const tabs = [...list.querySelectorAll('[role="tab"]')];
    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));
    const select = (index, focus) => {
      tabs.forEach((tab, i) => {
        const on = i === index;
        tab.setAttribute("aria-selected", String(on));
        tab.tabIndex = on ? 0 : -1;
        if (panels[i]) panels[i].hidden = !on;
      });
      if (focus) tabs[index].focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(i, false));
      tab.addEventListener("keydown", (event) => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
        if (!step) return;
        event.preventDefault();
        select((i + step + tabs.length) % tabs.length, true);
      });
    });
    select(Math.max(0, tabs.findIndex((t) => t.getAttribute("aria-selected") === "true")), false);
  }

  /* ---------- Hojas (carta / menú degustación) ---------- */
  function initSheets() {
    document.querySelectorAll("[data-sheet-open]").forEach((trigger) => {
      const sheet = document.getElementById(trigger.dataset.sheetOpen);
      if (!sheet || typeof sheet.showModal !== "function") return; // sin <dialog>: sigue el enlace (PDF)
      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        sheet.showModal();
        NOI.lockScroll(true);
      });
    });
    document.querySelectorAll("dialog.sheet").forEach((sheet) => {
      sheet.querySelector("[data-sheet-close]")?.addEventListener("click", () => sheet.close());
      sheet.addEventListener("click", (event) => { if (event.target === sheet) sheet.close(); });
      sheet.addEventListener("close", () => NOI.lockScroll(false));
    });
  }

  /* La primera foto de cada pase entra con fundido cuando está lista */
  function revealWhenLoaded(el) {
    const first = el.querySelector("img.is-active") || el.querySelector("img");
    const show = () => el.classList.add("is-loaded");
    if (!first) { show(); return; }
    const ready = () => (first.decode ? first.decode().catch(() => {}) : Promise.resolve()).then(show);
    if (first.complete && first.naturalWidth) ready();
    else {
      first.addEventListener("load", ready, { once: true });
      first.addEventListener("error", show, { once: true });
    }
  }

  document.querySelectorAll("[data-stage], [data-slides]").forEach(revealWhenLoaded);
  document.querySelectorAll("[data-stage]").forEach(initStage);
  document.querySelectorAll("[data-slides]").forEach(initSlides);
  document.querySelectorAll("[data-cuts]").forEach(initCuts);
  document.querySelectorAll("[data-gallery]").forEach(initGallery);
  document.querySelectorAll("[data-tabs]").forEach(initTabs);
  initSheets();
  initReserve();
})();
