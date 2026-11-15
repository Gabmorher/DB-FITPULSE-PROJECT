import { request, listAll } from "./api.js";
import { errorMessage } from "./messages.js";
import { element, status, setBusy, showAlert } from "./ui.js";
import { money, capitalize, scheduleFormatter } from "./format.js";
import { showResult } from "./modal.js";
import { initializePage } from "./shell.js";

const millisecondsPerMinute = 60000;
const listView = document.querySelector("#class-list-view");
const formView = document.querySelector("#class-form-view");
const form = document.querySelector("#class-form");
const feedback = document.querySelector("#class-feedback");
const saveButton = document.querySelector("#save-class");
let schedule;

function localDateTime(date) {
  const offset = date.getTimezoneOffset() * millisecondsPerMinute;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function classRow(item) {
  const row = element("tr");
  const occupied = item.capacity - item.available_spots;
  row.append(
    element("td", "", item.name),
    element("td", "", capitalize(item.category)),
    element("td", "", item.instructor_name),
    element("td", "", schedule.range(item.starts_at, item.ends_at)),
    element("td", "number-cell", `${occupied}/${item.capacity}`),
    element("td", "number-cell", money(item.price)),
  );
  return row;
}

function renderClasses(classes) {
  document
    .querySelector("#class-rows")
    .replaceChildren(...classes.map(classRow));
  document.querySelector("#class-empty").hidden = classes.length > 0;
  const categories = [...new Set(classes.map((item) => item.category))];
  document
    .querySelector("#category-options")
    .replaceChildren(
      ...categories.map((category) => new Option(capitalize(category))),
    );
}

async function loadClasses() {
  status("loading", "Cargando las clases del catálogo…");
  try {
    schedule ??= await scheduleFormatter();
    renderClasses(await listAll("/classes"));
    status("", "");
  } catch (error) {
    status("error", errorMessage(error));
  }
}

function showForm(visible) {
  listView.hidden = visible;
  formView.hidden = !visible;
  feedback.hidden = true;
  form.reset();
  form.elements.startsAt.min = localDateTime(new Date());
  if (visible) form.elements.name.focus();
}

function scheduleDates() {
  const start = new Date(form.elements.startsAt.value);
  const end = new Date(
    `${form.elements.startsAt.value.slice(0, 10)}T${form.elements.endTime.value}`,
  );
  return { start, end };
}

function checkSchedule() {
  const { start, end } = scheduleDates();
  form.elements.endTime.setCustomValidity(
    end > start ? "" : "La hora de fin debe ser posterior a la hora de inicio.",
  );
}

function classBody() {
  const { start, end } = scheduleDates();
  return {
    name: form.elements.name.value.trim(),
    category: form.elements.category.value.trim(),
    instructorName: form.elements.instructorName.value.trim(),
    description: form.elements.description.value.trim(),
    capacity: Number(form.elements.capacity.value),
    price: Number(form.elements.price.value),
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
  };
}

async function createClass(event) {
  event.preventDefault();
  feedback.hidden = true;
  setBusy(saveButton, true, "Creando clase…");
  try {
    const created = await request("/classes", {
      method: "POST",
      body: classBody(),
    });
    await showResult(
      "success",
      "¡Clase creada con éxito!",
      `${created.name} ya aparece en el catálogo de los clientes.`,
    );
    showForm(false);
    await loadClasses();
  } catch (error) {
    showAlert(feedback, "error", errorMessage(error));
  } finally {
    setBusy(saveButton, false);
  }
}

document
  .querySelector("#open-form")
  .addEventListener("click", () => showForm(true));
document
  .querySelector("#cancel-form")
  .addEventListener("click", () => showForm(false));
form.elements.startsAt.addEventListener("input", checkSchedule);
form.elements.endTime.addEventListener("input", checkSchedule);
form.addEventListener("submit", createClass);
initializePage(loadClasses);
