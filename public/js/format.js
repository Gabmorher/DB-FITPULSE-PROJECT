import { getConfiguration } from "./api.js";

const thousandsPattern = /\B(?=(\d{3})+(?!\d))/g;

export function apiDate(value) {
  return new Date(`${value.replace(" ", "T")}Z`);
}

export function money(value) {
  const digits = Math.round(Number(value)).toString();
  return `${digits.replace(thousandsPattern, ".")} COP`;
}

export function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export async function scheduleFormatter() {
  const { timeZone } = await getConfiguration();
  const day = new Intl.DateTimeFormat("es-CO", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const time = new Intl.DateTimeFormat("es-CO", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  });
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const today = dateKey.format(new Date());
  return {
    isToday: (value) => dateKey.format(apiDate(value)) === today,
    day: (value) => capitalize(day.format(apiDate(value))),
    time: (value) => time.format(apiDate(value)),
    hour: (value) => Number(hour.format(apiDate(value))),
    range(start, end) {
      return `${this.day(start)} · ${this.time(start)} – ${this.time(end)}`;
    },
  };
}
