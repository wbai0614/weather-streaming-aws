// public/app.js
const LATEST_URL = "/latest.json";
const AUTO_REFRESH_MS = 120000;
const STALE_MINUTES = 15;

const els = {
  citySelect: document.getElementById("citySelect"),
  refreshBtn: document.getElementById("refreshBtn"),

  kpiTemp: document.getElementById("kpiTemp"),
  kpiHumidity: document.getElementById("kpiHumidity"),
  kpiWind: document.getElementById("kpiWind"),
  kpiCond: document.getElementById("kpiCond"),
  kpiUpdated: document.getElementById("kpiUpdated"),

  kpiColdest: document.getElementById("kpiColdest"),
  kpiWindiest: document.getElementById("kpiWindiest"),

  // NEW: cards so we can hide them
  cardColdest: document.getElementById("cardColdest"),
  cardWindiest: document.getElementById("cardWindiest"),

  kpiTempDelta: document.getElementById("kpiTempDelta"),
  kpiHumidityDelta: document.getElementById("kpiHumidityDelta"),
  kpiWindDelta: document.getElementById("kpiWindDelta"),

  generatedUtc: document.getElementById("generatedUtc"),
  rows: document.getElementById("rows"),

  statusPill: document.getElementById("statusPill"),
  statusText: document.getElementById("statusText"),

  staleBanner: document.getElementById("staleBanner"),
  staleText: document.getElementById("staleText"),
};

let latest = null;
let prevSnapshot = null;

function fmt(n, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Number(n).toFixed(digits);
}

function avg(list, key) {
  const vals = list.map(x => x[key]).filter(v => typeof v === "number");
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function minBy(list, key) {
  return list.reduce((min, x) =>
    typeof x[key] === "number" && (min === null || x[key] < min[key]) ? x : min
  , null);
}

function maxBy(list, key) {
  return list.reduce((max, x) =>
    typeof x[key] === "number" && (max === null || x[key] > max[key]) ? x : max
  , null);
}

function setStatus(mode, text) {
  if (!els.statusPill || !els.statusText) return;

  els.statusText.textContent = text;
  const dot = els.statusPill.querySelector(".dot");
  if (!dot) return;

  if (mode === "ok") dot.style.background = "rgba(62, 255, 172, .85)";
  if (mode === "loading") dot.style.background = "rgba(255, 210, 92, .85)";
  if (mode === "error") dot.style.background = "rgba(255, 92, 120, .85)";
}

function parseUtc(iso) {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

function setStaleWarning(generatedUtcIso) {
  const t = parseUtc(generatedUtcIso);
  if (!t) {
    els.staleBanner.classList.add("hidden");
    return;
  }
  const ageMs = Date.now() - t;
  const ageMin = Math.floor(ageMs / 60000);

  if (ageMin >= STALE_MINUTES) {
    els.staleBanner.classList.remove("hidden");
    els.staleText.textContent = `Data may be stale — generated ${ageMin} minutes ago (UTC).`;
  } else {
    els.staleBanner.classList.add("hidden");
  }
}

function tempClass(tempC) {
  if (typeof tempC !== "number") return "";
  if (tempC < 0) return "temp-cold";
  if (tempC < 12) return "temp-mild";
  if (tempC < 25) return "temp-warm";
  return "temp-hot";
}

function deltaText(curr, prev, unit, digits = 1) {
  if (typeof curr !== "number" || typeof prev !== "number") return "—";
  const d = curr - prev;
  const abs = Math.abs(d);
  const arrow = abs < 0.05 ? "→" : (d > 0 ? "↑" : "↓");
  return `${arrow} ${fmt(abs, digits)} ${unit} vs last refresh`;
}

function renderCityOptions(cities) {
  const current = els.citySelect.value;

  els.citySelect.innerHTML = "";

  const allOpt = document.createElement("option");
  allOpt.value = "__ALL__";
  allOpt.textContent = "All cities";
  els.citySelect.appendChild(allOpt);

  for (const c of cities) {
    const opt = document.createElement("option");
    opt.value = c.city;
    opt.textContent = c.city;
    els.citySelect.appendChild(opt);
  }

  els.citySelect.value = current || "__ALL__";
}

function getPrevForSelection(selected) {
  if (!prevSnapshot || !Array.isArray(prevSnapshot.cities)) return null;

  const prevCities = prevSnapshot.cities;

  if (selected === "__ALL__") {
    return {
      temp_c: avg(prevCities, "temp_c"),
      humidity: avg(prevCities, "humidity"),
      wind_mps: avg(prevCities, "wind_mps")
    };
  }

  const prevCity = prevCities.find(x => x.city === selected);
  if (!prevCity) return null;
  return {
    temp_c: prevCity.temp_c,
    humidity: prevCity.humidity,
    wind_mps: prevCity.wind_mps
  };
}

function render() {
  if (!latest || !Array.isArray(latest.cities)) return;

  const cities = [...latest.cities].sort((a, b) => a.city.localeCompare(b.city));
  renderCityOptions(cities);

  const selected = els.citySelect.value;
  const filtered = selected === "__ALL__" ? cities : cities.filter(c => c.city === selected);

  setStaleWarning(latest.generated_utc);

  const tempAvg = avg(filtered, "temp_c");
  const humAvg = avg(filtered, "humidity");
  const windAvg = avg(filtered, "wind_mps");

  els.kpiTemp.innerHTML = `<span class="badge ${tempClass(tempAvg)}">${fmt(tempAvg, 1)} °C</span>`;
  els.kpiHumidity.textContent = `${fmt(humAvg, 0)} %`;
  els.kpiWind.textContent = `${fmt(windAvg, 1)} m/s`;

  if (filtered.length === 1) {
    els.kpiCond.textContent = filtered[0].condition || "—";
    els.kpiUpdated.textContent = filtered[0].ts_utc || "—";
  } else {
    els.kpiCond.textContent = "Multiple cities";
    els.kpiUpdated.textContent = latest.generated_utc || "—";
  }

  // Hide/show Coldest/Windiest cards
  if (selected === "__ALL__" && cities.length > 0) {
    els.cardColdest.classList.remove("hidden");
    els.cardWindiest.classList.remove("hidden");

    const coldest = minBy(cities, "temp_c");
    const windiest = maxBy(cities, "wind_mps");

    els.kpiColdest.textContent = coldest
      ? `${coldest.city} (${fmt(coldest.temp_c, 1)} °C)`
      : "—";

    els.kpiWindiest.textContent = windiest
      ? `${windiest.city} (${fmt(windiest.wind_mps, 1)} m/s)`
      : "—";
  } else {
    els.cardColdest.classList.add("hidden");
    els.cardWindiest.classList.add("hidden");
  }

  const prevForSel = getPrevForSelection(selected);
  els.kpiTempDelta.textContent = prevForSel ? deltaText(tempAvg, prevForSel.temp_c, "°C", 1) : "—";
  els.kpiHumidityDelta.textContent = prevForSel ? deltaText(humAvg, prevForSel.humidity, "%", 0) : "—";
  els.kpiWindDelta.textContent = prevForSel ? deltaText(windAvg, prevForSel.wind_mps, "m/s", 1) : "—";

  els.generatedUtc.textContent = "generated_utc: " + (latest.generated_utc || "—");
  els.rows.innerHTML = "";

  for (const c of filtered) {
    const tr = document.createElement("tr");
    const tclass = tempClass(c.temp_c);

    tr.innerHTML = `
      <td>${c.city ?? "—"}</td>
      <td class="num"><span class="badge ${tclass}">${fmt(c.temp_c, 1)}°</span></td>
      <td class="num">${fmt(c.feels_like_c, 1)}</td>
      <td class="num">${fmt(c.humidity, 0)}</td>
      <td class="num">${fmt(c.wind_mps, 1)}</td>
      <td class="num">${fmt(c.pressure_hpa, 0)}</td>
      <td>${c.condition_detail ?? c.condition ?? "—"}</td>
      <td>${c.ts_utc ?? "—"}</td>
    `;
    els.rows.appendChild(tr);
  }
}

async function loadLatest() {
  try {
    setStatus("loading", "Loading…");
    const url = `${LATEST_URL}?t=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch latest.json (${res.status})`);

    prevSnapshot = latest;
    latest = await res.json();
    render();

    setStatus("ok", "Live");
  } catch (err) {
    console.error(err);
    setStatus("error", "Error");
  }
}

els.refreshBtn.addEventListener("click", loadLatest);
els.citySelect.addEventListener("change", render);

loadLatest();
setInterval(loadLatest, AUTO_REFRESH_MS);
