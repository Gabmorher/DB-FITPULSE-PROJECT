import {
  getSession,
  request,
  listAll,
  getConfiguration,
  errorMessage,
} from "./api.js";
import {
  initialize,
  element,
  icon,
  number,
  dateLabel,
  businessToday,
  status,
  showData,
} from "./app.js";

let attended = [];
let activeLoad;
let today;
let timeZone;

function weekStart(value) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

function classDate(value) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(`${value.replace(" ", "T")}Z`));
  const fields = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${fields.year}-${fields.month}-${fields.day}`;
}

function empty(parent, title, description) {
  const node = element("div", "empty");
  node.append(element("strong", "", title), element("p", "", description));
  parent.replaceChildren(node);
}

function renderActivity() {
  const parent = document.querySelector("#activity-chart");
  if (!attended.length) {
    empty(
      parent,
      "Tu primera asistencia inicia el recorrido.",
      "Las clases aparecerán cuando el administrador confirme tu asistencia.",
    );
    return;
  }
  const weeks = Number(document.querySelector("#weeks-filter").value);
  const cursor = new Date(`${weekStart(today)}T12:00:00Z`);
  cursor.setUTCDate(cursor.getUTCDate() - (weeks - 1) * 7);
  const values = [];
  for (let index = 0; index < weeks; index++) {
    const date = cursor.toISOString().slice(0, 10);
    values.push({
      date,
      total: attended.filter(
        (item) => weekStart(classDate(item.starts_at)) === date,
      ).length,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  const maximum = Math.max(1, ...values.map((value) => value.total));
  const chart = element("div", "weekly-chart");
  chart.setAttribute("role", "img");
  chart.setAttribute(
    "aria-label",
    values
      .map(
        (value) => `Semana del ${dateLabel(value.date)}: ${value.total} clases`,
      )
      .join(". "),
  );
  const labels = element("div", "chart-labels");
  for (const value of values) {
    const column = element("div", "chart-column");
    const bar = element("div", "chart-bar");
    bar.style.height = `${Math.max(3, (value.total / maximum) * 125)}px`;
    column.append(element("span", "chart-count", number(value.total)), bar);
    chart.append(column);
    labels.append(element("span", "", dateLabel(value.date)));
  }
  parent.replaceChildren(chart, labels);
}

function renderCategories(totals) {
  const parent = document.querySelector("#category-list");
  const categories = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  if (!categories.length) {
    empty(
      parent,
      "Aún no hay categorías registradas.",
      "Se calculan a partir de tus clases asistidas.",
    );
    return;
  }
  const maximum = Math.max(...categories.map(([, total]) => total));
  parent.replaceChildren();
  for (const [name, total] of categories) {
    const row = element("div");
    const top = element("div", "category-top");
    top.append(
      element("span", "", name),
      element(
        "strong",
        "",
        `${number(total)} ${total === 1 ? "clase" : "clases"}`,
      ),
    );
    const track = element("div", "category-track");
    track.setAttribute("aria-hidden", "true");
    const fill = element("div", "category-fill");
    fill.style.width = `${(total / maximum) * 100}%`;
    track.append(fill);
    row.append(top, track);
    parent.append(row);
  }
}

function renderClasses(values, selector, future) {
  const parent = document.querySelector(selector);
  parent.replaceChildren();
  if (!values.length) {
    empty(
      parent,
      future ? "Sin próximas reservas." : "Tu historial está por comenzar.",
      future
        ? "Cuando reserves una clase futura, la verás aquí."
        : "Aquí encontrarás tus clases con asistencia confirmada.",
    );
    return;
  }
  for (const item of values.slice(0, future ? 3 : 5)) {
    const row = element("div", "history-row");
    const date = classDate(item.starts_at);
    const symbol = element("span", future ? "upcoming-date" : "class-symbol");
    if (future) {
      symbol.append(
        element("strong", "", new Date(`${date}T12:00:00Z`).getUTCDate()),
        element("span", "", dateLabel(date, { day: undefined })),
      );
    } else symbol.innerHTML = icon("pulse");
    const info = element("div", "history-info");
    info.append(
      element("strong", "", item.class_name),
      element(
        "span",
        "",
        `${item.category} · ${dateLabel(date, { year: "numeric" })}`,
      ),
    );
    row.append(symbol, info);
    if (!future) row.append(element("span", "badge", "Asistida"));
    parent.append(row);
  }
}

function clear() {
  activeLoad?.abort();
  attended = [];
  for (const selector of [
    "#total-attended",
    "#weekly-streak",
    "#category-count",
  ])
    document.querySelector(selector).textContent = "—";
  for (const selector of [
    "#activity-chart",
    "#category-list",
    "#attended-list",
    "#upcoming-list",
  ])
    document.querySelector(selector).replaceChildren();
  document.querySelector("#retry-button").hidden = true;
}

async function load() {
  activeLoad?.abort();
  const session = getSession();
  if (!session) {
    showData(false);
    return;
  }
  document.querySelector("#guest-state").hidden = true;
  activeLoad = new AbortController();
  const signal = activeLoad.signal;
  const refresh = document.querySelector("#refresh-button");
  refresh.disabled = true;
  document.querySelector("#retry-button").hidden = true;
  status("loading", "Cargando tu progreso y tus clases…");
  document.querySelector("#page-data").setAttribute("aria-busy", "true");
  try {
    ({ timeZone } = await getConfiguration());
    today = await businessToday();
    const route = `/users/${session.user.id}`;
    const [progress, past, reserved] = await Promise.all([
      request(`${route}/progress`, { signal }),
      listAll(`${route}/reservations?status=attended`, signal),
      listAll(`${route}/reservations?status=reserved`, signal),
    ]);
    if (signal.aborted || session.accessToken !== getSession()?.accessToken)
      return;
    attended = past;
    document.querySelector("#total-attended").textContent = number(
      progress.totalAttended,
    );
    document.querySelector("#weekly-streak").textContent = number(
      progress.weeklyStreak,
    );
    document.querySelector("#category-count").textContent = number(
      Object.keys(progress.categoryTotals).length,
    );
    renderActivity();
    renderCategories(progress.categoryTotals);
    renderClasses(
      [...past].sort((a, b) => b.starts_at.localeCompare(a.starts_at)),
      "#attended-list",
      false,
    );
    const upcoming = reserved
      .filter(
        (item) => new Date(`${item.starts_at.replace(" ", "T")}Z`) > new Date(),
      )
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    renderClasses(upcoming, "#upcoming-list", true);
    showData(true);
    status("success", "Tu progreso está actualizado.");
  } catch (error) {
    if (error.name !== "AbortError") {
      status("error", errorMessage(error));
      document.querySelector("#retry-button").hidden = !getSession();
    }
  } finally {
    if (activeLoad?.signal === signal) {
      refresh.disabled = false;
      document.querySelector("#page-data").setAttribute("aria-busy", "false");
    }
  }
}

document
  .querySelector("#weeks-filter")
  .addEventListener("change", renderActivity);
for (const selector of ["#refresh-button", "#retry-button"])
  document.querySelector(selector).addEventListener("click", load);
initialize(load, clear).catch((error) => status("error", errorMessage(error)));
businessToday()
  .then((date) => {
    document.querySelector("#today-label").textContent = dateLabel(date, {
      year: "numeric",
    });
  })
  .catch(() => {});
