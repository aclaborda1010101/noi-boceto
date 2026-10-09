/* NOI — widgets: slideshows con cortes, secuencia de cortes al hacer scroll, galería, reservas y carta */
(function () {
  "use strict";

  const NOI = window.NOI;
  if (!NOI) return;

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const pad = (n) => String(n).padStart(2, "0");

  /* ---------- Slideshows: una foto corta a la siguiente ---------- */
  const DEFAULT_INTERVAL = 5200;
  const CUT_MS = 1500;

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
      }, CUT_MS);
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

  /* ---------- Escenario de la home: fotos de las dos salas con cortes variados ---------- */
  const STAGE_CUTS = ["cut-up", "cut-side", "cut-center", "cut-diag", "cut-down", "cut-center-h"];
  const STAGE_CUT_MS = 1600;
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
    let cutCount = 0;
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
      const cut = STAGE_CUTS[cutCount % STAGE_CUTS.length];
      cutCount += 1;
      next.style.setProperty("--cut", NOI.reduceMotion ? "none" : cut);
      next.style.setProperty("--cut-ms", `${STAGE_CUT_MS}ms`);
      prev.classList.remove("is-active", "is-entering");
      prev.classList.add("is-prev");
      next.classList.remove("is-prev");
      next.classList.add("is-active", "is-entering");
      busyUntil = performance.now() + STAGE_CUT_MS;
      setTimeout(() => {
        prev.classList.remove("is-prev");
        next.classList.remove("is-entering");
      }, STAGE_CUT_MS);
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

  /* ---------- Reservas: modal con CoverManager ---------- */
  function initReserve() {
    const modal = document.querySelector("[data-reserve-modal]");
    if (!modal || typeof modal.showModal !== "function") return; // sin <dialog>: los enlaces abren CoverManager
    const tabs = [...modal.querySelectorAll(".reserve-tab")];
    const frame = modal.querySelector("[data-reserve-frame]");
    const choose = modal.querySelector("[data-reserve-choose]");
    const external = modal.querySelector("[data-reserve-external]");

    const select = (sala) => {
      const tab = tabs.find((t) => t.dataset.sala === sala);
      tabs.forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
      if (!tab) {
        frame.hidden = true;
        choose.hidden = false;
        external.hidden = true;
        return;
      }
      if (frame.getAttribute("src") !== tab.dataset.url) frame.setAttribute("src", tab.dataset.url);
      frame.hidden = false;
      choose.hidden = true;
      external.href = tab.dataset.url;
      external.hidden = false;
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

  /* ---------- Carta: sección activa en la navegación ---------- */
  function initCartaNav(nav) {
    const links = [...nav.querySelectorAll("a[href^='#']")];
    const sections = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
    if (!sections.length) return;
    NOI.onScroll(() => {
      const line = window.innerHeight * 0.35;
      let currentId = sections[0].id;
      sections.forEach((sec) => { if (sec.getBoundingClientRect().top < line) currentId = sec.id; });
      links.forEach((a) => a.classList.toggle("is-current", a.getAttribute("href") === `#${currentId}`));
    });
  }

  document.querySelectorAll("[data-stage]").forEach(initStage);
  document.querySelectorAll("[data-slides]").forEach(initSlides);
  document.querySelectorAll("[data-cuts]").forEach(initCuts);
  document.querySelectorAll("[data-gallery]").forEach(initGallery);
  document.querySelectorAll("[data-carta-nav]").forEach(initCartaNav);
  initReserve();
})();
