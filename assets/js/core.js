/* NOI — núcleo: scroll suave, cortina entre páginas, loader, header, menú, revelados y parallax */
(function () {
  "use strict";

  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CURTAIN_MS = 820;
  const LOADER_DRAW_MS = 1900;
  const LOADER_OPEN_MS = 1250;

  const store = {
    get(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } },
    set(key, value) { try { sessionStorage.setItem(key, value); } catch (e) { /* modo privado */ } },
    remove(key) { try { sessionStorage.removeItem(key); } catch (e) { /* modo privado */ } },
  };

  /* ---------- Bucle de scroll compartido ---------- */
  const scrollHandlers = new Set();
  let ticking = false;
  const runScroll = () => {
    ticking = false;
    const y = window.scrollY;
    scrollHandlers.forEach((fn) => fn(y));
  };
  const requestScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(runScroll);
  };
  window.addEventListener("scroll", requestScroll, { passive: true });
  window.addEventListener("resize", requestScroll);

  let lenis = null;
  if (!reduceMotion && typeof window.Lenis === "function") {
    lenis = new window.Lenis({ duration: 1.15, smoothWheel: true });
    const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  const readyCallbacks = [];
  let isReady = false;
  const markReady = () => {
    if (isReady) return;
    isReady = true;
    readyCallbacks.forEach((fn) => fn());
  };

  window.NOI = {
    reduceMotion,
    onScroll(fn) { scrollHandlers.add(fn); requestScroll(); },
    onReady(fn) { if (isReady) fn(); else readyCallbacks.push(fn); },
    scrollTo(target) {
      const offset = target instanceof Element ? -parseFloat(getComputedStyle(target).scrollMarginTop || 0) : 0;
      if (lenis) { lenis.scrollTo(target, { offset }); return; }
      const behavior = reduceMotion ? "auto" : "smooth";
      if (target instanceof Element) target.scrollIntoView({ behavior });
      else window.scrollTo({ top: Number(target) || 0, behavior });
    },
    lockScroll(locked) {
      if (lenis) { locked ? lenis.stop() : lenis.start(); }
      document.body.style.overflow = locked ? "hidden" : "";
    },
  };

  /* ---------- Loader (primera visita a la home) ---------- */
  function runLoader() {
    const loader = document.querySelector("[data-loader].loader");
    store.set("noi-visited", "1");
    if (!loader || !root.classList.contains("js-loader")) return false;
    if (reduceMotion) { loader.classList.add("is-done"); return false; }

    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    fontsReady.then(() => {
      loader.classList.add("is-drawn");
      setTimeout(() => {
        loader.classList.add("is-open");
        markReady();
        setTimeout(() => {
          loader.classList.add("is-done");
          root.classList.remove("js-loader");
        }, LOADER_OPEN_MS);
      }, LOADER_DRAW_MS);
    });
    return true;
  }

  /* ---------- Cortina entre páginas ---------- */
  const curtain = document.querySelector("[data-curtain]");
  const THEME_BY_PAGE = { "ristorante.html": "verde", "bar-e-cucina.html": "rosso" };

  function revealFromCurtain() {
    if (!curtain || !root.classList.contains("js-curtain-in")) return;
    store.remove("noi-curtain");
    requestAnimationFrame(() => requestAnimationFrame(() => {
      curtain.classList.add("is-leaving");
      root.classList.remove("js-curtain-in");
      curtain.addEventListener("transitionend", () => curtain.classList.remove("is-leaving"), { once: true });
    }));
  }

  function pageOf(url) {
    const file = url.pathname.split("/").pop();
    return file === "" ? "index.html" : file;
  }

  function isInternalPage(link) {
    if (link.target === "_blank" || link.hasAttribute("download") || link.hasAttribute("data-reserve")) return false;
    const url = new URL(link.href, location.href);
    if (url.protocol !== location.protocol || url.host !== location.host) return false;
    return /\.html$|\/$/.test(url.pathname);
  }

  function onLinkClick(event) {
    const link = event.target.closest("a[href]");
    if (!link || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!isInternalPage(link)) return;

    const url = new URL(link.href, location.href);
    const samePage = pageOf(url) === pageOf(location);
    if (samePage) {
      const target = url.hash ? document.querySelector(url.hash) : 0;
      if (target === null) return;
      event.preventDefault();
      closeMenu();
      window.NOI.scrollTo(target);
      return;
    }
    if (reduceMotion || !curtain) return;

    event.preventDefault();
    closeMenu();
    const theme = THEME_BY_PAGE[pageOf(url)] || "home";
    curtain.className = `curtain curtain--${theme} is-covering`;
    store.set("noi-curtain", "1");
    setTimeout(() => { window.location.href = url.href; }, CURTAIN_MS);
  }

  window.addEventListener("pageshow", (event) => {
    if (event.persisted && curtain) {
      curtain.classList.remove("is-covering", "is-leaving");
      root.classList.remove("js-curtain-in");
      store.remove("noi-curtain");
    }
  });

  /* ---------- Header ---------- */
  function initHeader() {
    const header = document.querySelector("[data-header]");
    if (!header) return;
    const trigger = document.querySelector("[data-header-trigger]");
    const headerHeight = () => header.offsetHeight;
    window.NOI.onScroll((y) => {
      const limit = trigger ? trigger.offsetTop + trigger.offsetHeight - headerHeight() : 40;
      header.classList.toggle("is-solid", y > limit);
    });
  }

  /* ---------- Menú ---------- */
  const menu = document.querySelector("[data-menu]");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const menuLabel = document.querySelector("[data-menu-label]");

  function setMenu(open) {
    if (!menu || !menuToggle) return;
    if (open) loadNow(menu);
    root.classList.toggle("is-menu-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    if (menuLabel) menuLabel.textContent = open ? "Cerrar" : "Menú";
    menu.inert = !open;
    window.NOI.lockScroll(open);
    if (open) setTimeout(() => menu.querySelector(".menu__link")?.focus({ preventScroll: true }), 400);
  }
  function closeMenu() {
    if (root.classList.contains("is-menu-open")) setMenu(false);
  }
  window.NOI.closeMenu = closeMenu;

  function initMenu() {
    if (!menu || !menuToggle) return;
    menuToggle.addEventListener("click", () => setMenu(!root.classList.contains("is-menu-open")));
    menuToggle.addEventListener("pointerenter", () => loadNow(menu), { once: true });
    menuToggle.addEventListener("focus", () => loadNow(menu), { once: true });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && root.classList.contains("is-menu-open")) {
        setMenu(false);
        menuToggle.focus();
      }
    });
    const images = menu.querySelectorAll(".menu__media img");
    const show = (index) => images.forEach((img, i) => img.classList.toggle("is-active", i === index));
    menu.querySelectorAll("[data-media]").forEach((link) => {
      const index = Number(link.dataset.media);
      link.addEventListener("mouseenter", () => show(index));
      link.addEventListener("focus", () => show(index));
    });
  }

  /* ---------- Revelados al entrar en pantalla ---------- */
  function initReveals() {
    const items = document.querySelectorAll(".reveal, .reveal-img");
    if (!("IntersectionObserver" in window) || reduceMotion) {
      items.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });
    items.forEach((el) => io.observe(el));
  }

  /* ---------- Precarga: las imágenes recortadas con clip-path no disparan el lazy-load nativo ---------- */
  const loadNow = (scope) => scope.querySelectorAll('img[loading="lazy"]').forEach((img) => {
    img.loading = "eager";
    if (img.decode) img.decode().catch(() => { /* se decodificará al mostrarse */ });
  });

  function initWarmup() {
    const blocks = new Set();
    document.querySelectorAll('main img[loading="lazy"], footer img[loading="lazy"]').forEach((img) => {
      const block = img.closest("main > *, footer");
      if (block) blocks.add(block);
    });
    if (!("IntersectionObserver" in window)) { blocks.forEach(loadNow); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        loadNow(entry.target);
        io.unobserve(entry.target);
      });
    }, { rootMargin: "120% 0px" });
    blocks.forEach((block) => io.observe(block));
  }

  /* ---------- Parallax suave ---------- */
  function initParallax() {
    if (reduceMotion) return;
    const items = [...document.querySelectorAll("[data-parallax]")];
    if (!items.length) return;
    window.NOI.onScroll(() => {
      const vh = window.innerHeight;
      items.forEach((el) => {
        const box = el.parentElement.getBoundingClientRect();
        if (box.bottom < -100 || box.top > vh + 100) return;
        const speed = Number(el.dataset.parallax) || 0.12;
        const progress = (box.top + box.height / 2 - vh / 2) / (vh / 2 + box.height / 2);
        el.style.transform = `translate3d(0, ${(-progress * speed * box.height).toFixed(1)}px, 0)`;
      });
    });
  }

  /* ---------- Propuesta activa (boceto): "Inicio" vuelve a la portada que se está enseñando ---------- */
  function initVersion() {
    const current = document.body.dataset.version;
    if (current) store.set("noi-version", current);
    if ((current || store.get("noi-version")) !== "editorial") return;
    document.querySelectorAll('a[href="index.html"]:not(.switcher a)').forEach((a) => a.setAttribute("href", "editorial.html"));
  }

  initVersion();
  document.addEventListener("click", onLinkClick);
  revealFromCurtain();
  initHeader();
  initMenu();
  initReveals();
  initParallax();
  initWarmup();
  if (!runLoader()) markReady();
})();
