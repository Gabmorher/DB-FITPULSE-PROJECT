import { getSession, listAll } from "./api.js";
import { errorMessage } from "./messages.js";
import { element, status, loadingState } from "./ui.js";
import { apiDate, scheduleFormatter } from "./format.js";
import { classCard, detail, toggleDescription } from "./class-card.js";
import { initializePage } from "./shell.js";

const statusBadges = {
  reserved: { label: "Confirmada", tone: "positive" },
  attended: { label: "Asistida", tone: "positive" },
  no_show: { label: "No asistió", tone: "negative" },
  pending: { label: "Pendiente de asistencia", tone: "neutral" },
};
const grid = document.querySelector("#reservation-grid");
const tabs = {
  upcoming: document.querySelector("#upcoming-tab"),
  history: document.querySelector("#history-tab"),
};
let schedule;
let reservations = [];
let classesById = new Map();
let activeTab = "upcoming";

function isUpcoming(reservation) {
  return apiDate(reservation.starts_at) > new Date();
}

function badgeFor(reservation) {
  const key =
    reservation.status === "reserved" && !isUpcoming(reservation)
      ? "pending"
      : reservation.status;
  const { label, tone } = statusBadges[key];
  return element("span", `status-badge status-badge-${tone}`, label);
}

function labelFor(reservation) {
  if (!isUpcoming(reservation))
    return element(
      "p",
      "reservation-label",
      schedule.day(reservation.starts_at),
    );
  if (schedule.isToday(reservation.starts_at))
    return element("p", "reservation-label reservation-label-today", "Hoy");
  return element("p", "reservation-label", "Próximamente");
}

function reservationItem(reservation) {
  const scheduledClass = classesById.get(reservation.class_id);
  const wrapper = element("article", "reservation-item");
  const card = classCard(
    {
      name: reservation.class_name,
      category: reservation.category,
      description: scheduledClass?.description || "",
    },
    [
      detail("Día", schedule.day(reservation.starts_at)),
      detail(
        "Hora",
        `${schedule.time(reservation.starts_at)} – ${schedule.time(reservation.ends_at)}`,
      ),
      detail("Instructor", scheduledClass?.instructor_name || "Por confirmar"),
      badgeFor(reservation),
    ],
  );
  wrapper.append(labelFor(reservation), card);
  return wrapper;
}

function emptyMessage() {
  const message = element("p", "empty-state");
  if (activeTab === "history") {
    message.textContent = "Aún no tienes clases en tu historial.";
    return message;
  }
  const link = element("a", "", "reserva una en el catálogo");
  link.href = "/catalog.html";
  message.append("No tienes clases próximas. Puedes ", link, ".");
  return message;
}

function visibleReservations() {
  const upcoming = activeTab === "upcoming";
  return reservations
    .filter((reservation) =>
      upcoming
        ? reservation.status === "reserved" && isUpcoming(reservation)
        : !isUpcoming(reservation),
    )
    .sort((first, second) =>
      upcoming
        ? first.starts_at.localeCompare(second.starts_at)
        : second.starts_at.localeCompare(first.starts_at),
    );
}

function renderReservations() {
  const visible = visibleReservations();
  grid.replaceChildren(
    ...(visible.length ? visible.map(reservationItem) : [emptyMessage()]),
  );
}

function selectTab(name) {
  activeTab = name;
  for (const [key, tab] of Object.entries(tabs))
    tab.setAttribute("aria-selected", String(key === name));
  grid.setAttribute("aria-labelledby", tabs[name].id);
  renderReservations();
}

async function loadReservations() {
  grid.replaceChildren(loadingState("Cargando tus reservas…"));
  status("", "");
  try {
    schedule ??= await scheduleFormatter();
    const userId = getSession().user.id;
    const [userReservations, classes] = await Promise.all([
      listAll(`/users/${userId}/reservations`),
      listAll("/classes"),
    ]);
    reservations = userReservations;
    classesById = new Map(classes.map((item) => [item.id, item]));
    renderReservations();
  } catch (error) {
    grid.replaceChildren();
    status("error", errorMessage(error));
  }
}

tabs.upcoming.addEventListener("click", () => selectTab("upcoming"));
tabs.history.addEventListener("click", () => selectTab("history"));
grid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action=describe]");
  if (button) toggleDescription(button);
});
initializePage(loadReservations);
