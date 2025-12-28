const LATEST_URL = "./latest.json"; // CloudFront serves from /latest.json if you upload to public/

const els = {
  citySelect: document.getElementById("citySelect"),
  refreshBtn: document.getElementById("refreshBtn"),
  kpiTemp: document.getElementById("kpiTemp"),
  kpiHumidity: document.getElementById("kpiHumidity"),
  kpiWind: document.getElementById("kpiWind"),
  kpiCond: document.getElementById("kpiCond"),
  kpiUpdated: document.getElementById("kpiUpdated"),
  generatedUtc: document.getElementById("generatedUtc"),
  rows: document.getElementById("rows"),
};

let latest = null;

function fmt(n, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Number(n).toFixed(digits);
}

function setOptions(cities) {
  const cur = els.citySelect.value;
  els.citySelect.innerHTML = "";

  const all = document.createElement("option");
  all.value = "__ALL__";
  all.textContent = "All cities";
  els.citySelect.appendChild(all);

  for (const c of cities) {
    const opt = document.createElement("option");
    opt.value = c.city;
    opt.textContent = c.city;
    els.citySelect.appendChild(opt);
  }

  els.citySelect.value = cur || "__ALL__";
}

function render() {
  if (!latest || !Array.isArray(latest.cities)) return;

  const cities = latest.cities.slice().sort((a, b) => a.city.localeCompare(b.city));
  setOptions(cities);

  const selected = els.citySelect.value;
  const filtered = selected === "__ALL__" ? cities : cities.filter(x => x.city === selected);

  // KPIs: if All cities, show averages across filtered list
  const avg = (key) => {
    const vals = filtered.map(x => x[key]).filter(v => typeof v === "number");
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  els.kpiTemp.textContent = `${fmt(avg("temp_c"), 1)} °C`;
  els.kpiHumidity.textContent = `${fmt(avg("humidity"), 0)} %`;
  els.kpiWind.textContent = `${fmt(avg("wind_mps"), 1)} m/s`;

  // Condition: if single city show its condition, else show "Mixed"
  if (filtered.length === 1) {
    els.kpiCond.textContent = `${filtered[0].condition || "—"}`;
    els.kpiUpdated.textContent = filtered[0].ts_utc || "—";
  } else {
    els.kpiCond.textContent = "Multiple cities";
    els.kpiUpdated.textContent = latest.generated_utc || "—";
  }

  els.generatedUtc.textContent = `generated_utc: ${latest.generated_utc || "—"}`;

  // Table rows
  els.rows.innerHTML = "";
  for (const c of filtered) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.city ?? "—"}</td>
      <td>${fmt(c.temp_c, 1)}</td>
      <td>${fmt(c.feels_like_c, 1)}</td>
      <td>${fmt(c.humidity, 0)}</td>
      <td>${fmt(c.wind_mps, 1)}</td>
      <td>${fmt(c.pressure_hpa, 0)}</td>
      <td>${(c.condition_detail ?? c.condition ?? "—")}</td>
      <td>${c.ts_utc ?? "—"}</td>
    `;
    els.rows.appendChild(tr);
  }
}

async function loadLatest() {
  // cache-bust so CloudFront/browser fetches the newest file
  const url = `${LATEST_URL}?t=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch latest.json (${res.status})`);
  latest = await res.json();
  render();
}

els.refreshBtn.addEventListener("click", () => {
  loadLatest().catch(err => alert(err.message));
});
els.citySelect.addEventListener("change", render);

// initial load + auto refresh every 2 minutes
loadLatest().catch(err => {
  console.error(err);
  alert("Could not load latest.json. Make sure it exists in your CloudFront/S3 public path.");
});
setInterval(() => loadLatest().catch(() => {}), 120000);
