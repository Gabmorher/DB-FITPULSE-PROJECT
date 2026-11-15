import {
  getSession,
  setSession,
  request,
  getConfiguration,
  errorMessage,
} from "./api.js";

const icons = {
  pulse: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
  chart: '<path d="M4 19V5m0 14h16M8 15l4-5 4 2 4-7"/>',
  record:
    '<path d="M8 5h8v5a4 4 0 0 1-8 0V5Zm0 1H5v3a3 3 0 0 0 3 3m8-6h3v3a3 3 0 0 1-3 3M12 14v5m-4 0h8"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  refresh:
    '<path d="M20 7v5h-5M4 17v-5h5m-4-3a8 8 0 0 1 13-3l2 3M4 15l2 3a8 8 0 0 0 13-3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="m14 5 5 5M5 19l4-1L20 7a2 2 0 0 0-4-4L5 14v5Z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7m4-7v7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  logout: '<path d="M10 4H5v16h5m5-12 4 4-4 4m-6-4h10"/>',
  calendar:
    '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4m8-4v4M4 10h16"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};

export function icon(name) {
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.chart}</svg>`;
}

export function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function number(value, maximumFractionDigits = 3) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits }).format(
    value,
  );
}

export async function businessToday() {
  const { timeZone } = await getConfiguration();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

export function dateLabel(value, options = {}) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    ...options,
  }).format(new Date(`${value.slice(0, 10)}T12:00:00Z`));
}

export function status(kind, message) {
  const panel = document.querySelector("#page-status");
  panel.className = `notice notice-${kind}`;
  panel.textContent = message;
  panel.hidden = !message;
}

export function setBusy(button, busy, label = "Guardando…") {
  if (busy) {
    button.dataset.label = button.textContent;
    button.textContent = label;
  } else {
    button.textContent = button.dataset.label;
  }
  button.disabled = busy;
}

export function showData(show) {
  document.querySelector("#page-data").hidden = !show;
  document.querySelector("#guest-state").hidden = show;
}

function mountShell() {
  const page = document.body.dataset.page;
  document.querySelector("#sidebar").innerHTML = `
    <a class="brand" href="/progress.html" aria-label="FitPulse, mi progreso"><span class="brand-mark">${icon("pulse")}</span>FitPulse<span class="brand-dot">.</span></a>
    <p class="nav-caption">TU ESPACIO</p>
    <nav aria-label="Navegación principal">
      <a href="/progress.html" ${page === "progress" ? 'aria-current="page"' : ""}>${icon("chart")}<span>Mi progreso</span></a>
      <a href="/personal-records.html" ${page === "records" ? 'aria-current="page"' : ""}>${icon("record")}<span>Mis marcas</span></a>
    </nav>
    <div class="sidebar-note"><span class="note-line"></span><p>Un registro hoy.<br>Una nueva meta mañana.</p><a href="/personal-records.html">Registra tu avance ${icon("arrow")}</a></div>
    <div class="account"><span class="avatar" id="user-avatar">FP</span><div><strong id="user-name">Tu espacio personal</strong><span id="user-role">Inicia sesión para continuar</span></div></div>
    <button class="logout" id="logout-button" type="button" hidden>${icon("logout")} Cerrar sesión</button>`;
  document.querySelectorAll("[data-icon]").forEach((node) => {
    node.innerHTML = icon(node.dataset.icon);
  });
  document.querySelector("#auth-dialog").innerHTML = `
    <form id="auth-form" class="dialog-form">
      <button class="icon-button dialog-close" type="button" data-close aria-label="Cerrar ventana">${icon("close")}</button>
      <span class="eyebrow">BIENVENIDO A FITPULSE</span>
      <h2 id="auth-heading">Tu próximo avance<br>empieza aquí.</h2>
      <p class="muted">Accede a tu progreso y a tus marcas personales.</p>
      <div class="tab-list" role="group" aria-label="Tipo de acceso"><button type="button" id="login-tab" aria-pressed="true">Iniciar sesión</button><button type="button" id="register-tab" aria-pressed="false">Crear cuenta</button></div>
      <label id="name-field" hidden>Nombre<input name="name" autocomplete="name" maxlength="45"></label>
      <label>Correo electrónico<input name="email" type="email" autocomplete="username" maxlength="254" required placeholder="tu@correo.com"></label>
      <label>Contraseña<input name="password" type="password" autocomplete="current-password" minlength="8" maxlength="200" required placeholder="Mínimo 8 caracteres"></label>
      <p id="auth-error" class="form-error" role="alert" hidden></p>
      <button class="button button-primary" type="submit" id="auth-submit">Entrar a mi espacio</button>
      <p class="form-footnote">Tu información pertenece a tu cuenta.</p>
    </form>`;
}

function updateAccount() {
  const session = getSession();
  const name = session?.user.name || "Tu espacio personal";
  document.querySelector("#user-name").textContent = name;
  document.querySelector("#user-avatar").textContent = session
    ? name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "FP";
  document.querySelector("#user-role").textContent = session
    ? session.user.role === "admin"
      ? "Cuenta de administrador"
      : "Cuenta de cliente"
    : "Inicia sesión para continuar";
  document.querySelector("#logout-button").hidden = !session;
  document.querySelector("#refresh-button").hidden = !session;
  document.querySelectorAll("[data-sign-in]").forEach((button) => {
    button.hidden = Boolean(session);
  });
}

export async function initialize(load, clear) {
  mountShell();
  const dialog = document.querySelector("#auth-dialog");
  const form = document.querySelector("#auth-form");
  let registration = false;
  const switchMode = (value) => {
    registration = value;
    document.querySelector("#name-field").hidden = !value;
    form.elements.name.required = value;
    form.elements.password.autocomplete = value
      ? "new-password"
      : "current-password";
    document.querySelector("#login-tab").setAttribute("aria-pressed", !value);
    document.querySelector("#register-tab").setAttribute("aria-pressed", value);
    document.querySelector("#auth-submit").textContent = value
      ? "Crear mi cuenta"
      : "Entrar a mi espacio";
    document.querySelector("#auth-error").hidden = true;
  };
  document
    .querySelector("#login-tab")
    .addEventListener("click", () => switchMode(false));
  document
    .querySelector("#register-tab")
    .addEventListener("click", () => switchMode(true));
  dialog
    .querySelector("[data-close]")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    form.elements.password.value = "";
  });
  document
    .querySelectorAll("[data-sign-in]")
    .forEach((button) =>
      button.addEventListener("click", () => dialog.showModal()),
    );
  document.querySelector("#logout-button").addEventListener("click", () => {
    setSession(null);
    status("success", "Cerraste sesión correctamente.");
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const button = document.querySelector("#auth-submit");
    const errorPanel = document.querySelector("#auth-error");
    setBusy(
      button,
      true,
      registration ? "Creando tu cuenta…" : "Iniciando sesión…",
    );
    errorPanel.hidden = true;
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    try {
      if (registration)
        await request("/users", {
          method: "POST",
          public: true,
          body: { name: form.elements.name.value.trim(), email, password },
        });
      const session = await request("/sessions", {
        method: "POST",
        public: true,
        body: { email, password },
      });
      form.elements.password.value = "";
      dialog.close();
      setSession(session);
    } catch (error) {
      errorPanel.textContent = errorMessage(error);
      errorPanel.hidden = false;
    } finally {
      setBusy(button, false);
    }
  });
  window.addEventListener("sessionchange", () => {
    updateAccount();
    if (getSession()) load();
    else {
      clear();
      showData(false);
      status(
        "error",
        "La sesión terminó. Inicia sesión para consultar tu información.",
      );
    }
  });
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    updateAccount();
    if (getSession()) load();
    else {
      clear();
      showData(false);
      status("", "");
    }
  });
  updateAccount();
  const session = getSession();
  if (!session) {
    clear();
    showData(false);
    return;
  }
  try {
    const user = await request(`/users/${session.user.id}`);
    if (getSession()?.accessToken !== session.accessToken) return;
    sessionStorage.setItem(
      "fitpulse.session",
      JSON.stringify({ accessToken: session.accessToken, user }),
    );
    updateAccount();
    await load();
  } catch (error) {
    clear();
    showData(false);
    status("error", errorMessage(error));
  }
}
