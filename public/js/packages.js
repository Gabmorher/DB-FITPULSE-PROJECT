import { request, listAll } from "./api.js";
import { errorMessage } from "./messages.js";
import { element, status, setBusy, loadingState } from "./ui.js";
import { money } from "./format.js";
import { showResult } from "./modal.js";
import { initializePage } from "./shell.js";

const list = document.querySelector("#package-list");
let packages = [];

function classCount(quantity) {
  return `${quantity} ${quantity === 1 ? "clase" : "clases"}`;
}

function packageCard(item) {
  const card = element("article", "package-card");
  const buyButton = element("button", "button", "Comprar paquete");
  buyButton.type = "button";
  buyButton.dataset.packageId = item.id;
  card.append(
    element("h2", "", item.name),
    buyButton,
    element("p", "", `Precio: ${money(item.price)}`),
    element(
      "p",
      "",
      `Detalles: ${classCount(item.class_quantity)} · ${item.description}`,
    ),
  );
  return card;
}

async function loadPackages() {
  list.replaceChildren(loadingState("Cargando paquetes…"));
  status("", "");
  try {
    packages = await listAll("/packages");
    list.replaceChildren(
      ...(packages.length
        ? packages.map(packageCard)
        : [
            element(
              "p",
              "empty-state",
              "Por ahora no hay paquetes disponibles.",
            ),
          ]),
    );
  } catch (error) {
    list.replaceChildren();
    status("error", errorMessage(error));
  }
}

async function buy(button) {
  const item = packages.find(
    (value) => value.id === Number(button.dataset.packageId),
  );
  setBusy(button, true, "Procesando compra…");
  try {
    const purchase = await request("/purchases", {
      method: "POST",
      body: { packageId: item.id },
    });
    await showResult(
      "success",
      "¡Compra exitosa!",
      `Compraste el ${item.name} con ${classCount(item.class_quantity)} por ${money(purchase.paid_price)}.`,
    );
  } catch (error) {
    await showResult(
      "error",
      "No pudimos completar tu compra",
      errorMessage(error),
    );
  } finally {
    setBusy(button, false);
  }
}

list.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-package-id]");
  if (button && !button.disabled) buy(button);
});
initializePage(loadPackages);
