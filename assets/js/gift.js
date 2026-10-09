/* NOI — Regala: vista previa del proceso de regalo. No envía ni guarda datos. */
(function () {
  "use strict";

  const form = document.querySelector("[data-gift-form]");
  if (!form) return;

  const MIN_PEOPLE = 1;
  const MAX_PEOPLE = 10;
  const COPY = {
    degustacion: {
      title: "Menú <em>degustación</em>",
      lead: "Una velada en la sala verde de NOI Ristorante con el menú degustación del chef Gianni Pinto. La persona que lo reciba elige el día y reserva cuando quiera.",
      type: "Menú degustación · NOI Ristorante",
    },
    tarjeta: {
      title: "Tarjeta <em>regalo</em>",
      lead: "Un importe para disfrutar en NOI Ristorante o en NOI Bar e Cucina, cuando y como quiera la persona que lo recibe.",
      type: "Tarjeta regalo · NOI",
    },
  };

  const $ = (selector) => document.querySelector(selector);
  const title = $("[data-gift-title]");
  const lead = $("[data-gift-lead]");
  const peopleOut = $("[data-personas]");
  const sum = {
    type: $("[data-sum-type]"),
    detailLabel: $("[data-sum-detail-label]"),
    detail: $("[data-sum-detail]"),
    to: $("[data-sum-to]"),
    total: $("[data-sum-total]"),
  };
  let people = 2;

  const currentType = () => form.querySelector('input[name="tipo"]:checked').value;
  const currentAmount = () => form.querySelector('input[name="importe"]:checked')?.value;

  function render() {
    const type = currentType();
    const copy = COPY[type];
    title.innerHTML = copy.title; // texto fijo definido arriba, sin datos del usuario
    lead.textContent = copy.lead;
    document.querySelectorAll("[data-gift-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.giftPanel !== type;
    });
    sum.type.textContent = copy.type;
    if (type === "degustacion") {
      sum.detailLabel.textContent = "Personas";
      sum.detail.textContent = String(people);
      sum.total.textContent = "Precio por confirmar";
    } else {
      const amount = currentAmount();
      sum.detailLabel.textContent = "Importe";
      sum.detail.textContent = amount ? `${amount} €` : "—";
      sum.total.textContent = amount ? `${amount} €` : "—";
    }
    const to = form.elements.para.value.trim();
    sum.to.textContent = to || "—";
  }

  form.addEventListener("change", render);
  form.addEventListener("input", (event) => {
    if (event.target.matches("[data-gift-message]")) {
      $("[data-gift-count]").textContent = String(event.target.value.length);
    }
    if (event.target.matches("[data-gift-to]")) render();
  });

  form.querySelectorAll("[data-step]").forEach((button) => {
    button.addEventListener("click", () => {
      people = Math.min(MAX_PEOPLE, Math.max(MIN_PEOPLE, people + Number(button.dataset.step)));
      peopleOut.textContent = String(people);
      render();
    });
  });

  form.querySelectorAll("[data-gift-delivery]").forEach((radio) => {
    radio.addEventListener("change", () => {
      $("[data-gift-email-label]").textContent = radio.value === "mano" ? "Tu email" : "Email de quien lo recibe";
    });
  });

  // Vista previa: no hay tienda todavía, así que no se envía nada
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const preview = document.getElementById("gift-preview");
    if (preview && typeof preview.showModal === "function") {
      preview.showModal();
      window.NOI?.lockScroll(true);
    }
  });

  if (location.hash === "#tarjeta") form.querySelector("#tipo-tarjeta").checked = true;
  const fecha = form.elements.fecha;
  if (fecha) fecha.min = new Date().toISOString().slice(0, 10);
  render();
})();
