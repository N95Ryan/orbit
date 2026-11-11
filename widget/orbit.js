// Orbit — daily tech briefing widget for Scriptable
// https://github.com/N95Ryan/orbit

const DATA_URL = "https://raw.githubusercontent.com/N95Ryan/orbit/main/briefings/latest.json";
const CACHE_FILE = "orbit-latest.json";
const REFRESH_MINUTES = 60;

const TOPICS = {
  go: { label: "Go", color: "#00ADD8" },
  rust: { label: "Rust", color: "#CE422B" },
  react: { label: "React", color: "#58C4DC" },
  tanstack: { label: "TanStack", color: "#F59E0B" },
  expo: { label: "Expo", color: "#A78BFA" },
  nextjs: { label: "Next.js", color: "#9CA3AF" },
  astro: { label: "Astro", color: "#FF5D01" },
  supabase: { label: "Supabase", color: "#3ECF8E" },
  bun: { label: "Bun", color: "#F9A8D4" },
  cloudflare: { label: "Cloudflare", color: "#F38020" },
  claude: { label: "Claude", color: "#D97757" },
};

const KINDS = {
  security: { label: "Sécurité", color: "#EF4444" },
  breaking: { label: "Breaking", color: "#F59E0B" },
  release: { label: "Release", color: "#3B82F6" },
  article: { label: "Article", color: "#6B7280" },
};

const ACCENT = new Color("#7C5CFF");
const TEXT = Color.dynamic(new Color("#111111"), new Color("#F5F5F5"));
const BG = Color.dynamic(new Color("#FFFFFF"), new Color("#0B0B0F"));

// ---------- Data ----------

async function loadBriefing() {
  const fm = FileManager.local();
  const path = fm.joinPath(fm.documentsDirectory(), CACHE_FILE);
  try {
    const req = new Request(`${DATA_URL}?t=${Date.now()}`);
    req.timeoutInterval = 10;
    const data = await req.loadJSON();
    if (data.version !== 1) throw new Error(`Unsupported briefing version: ${data.version}`);
    fm.writeString(path, JSON.stringify(data));
    return { data, offline: false };
  } catch (e) {
    if (fm.fileExists(path)) {
      return { data: JSON.parse(fm.readString(path)), offline: true };
    }
    throw e;
  }
}

function formatDate(isoDate) {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString("fr-CA", { weekday: "short", day: "numeric", month: "short" });
}

function topicsOf(data) {
  const seen = [...new Set(data.items.map((i) => i.topic))];
  return seen.map((t) => (TOPICS[t] ? TOPICS[t].label : t));
}

// ---------- Widget ----------

function buildWidget(data, offline) {
  const family = config.widgetFamily || "medium";
  const isSmall = family === "small";

  const w = new ListWidget();
  w.backgroundColor = BG;
  w.setPadding(14, 14, 14, 14);
  w.url = URLScheme.forRunningScript();
  w.refreshAfterDate = new Date(Date.now() + REFRESH_MINUTES * 60 * 1000);

  const header = w.addStack();
  header.centerAlignContent();
  const title = header.addText("ORBIT");
  title.font = Font.heavySystemFont(12);
  title.textColor = ACCENT;
  header.addSpacer();
  const metaText = isSmall
    ? formatDate(data.date)
    : `${formatDate(data.date)} · ${data.readingTime} min${offline ? " · hors ligne" : ""}`;
  const meta = header.addText(metaText);
  meta.font = Font.mediumSystemFont(10);
  meta.textColor = Color.gray();

  w.addSpacer(8);

  const max = isSmall ? 2 : 3;
  const headlines = data.headlines.slice(0, max);
  headlines.forEach((h, i) => {
    const t = w.addText(`• ${h}`);
    t.font = Font.semiboldSystemFont(isSmall ? 12 : 13);
    t.textColor = TEXT;
    t.lineLimit = 2;
    if (i < headlines.length - 1) w.addSpacer(6);
  });

  w.addSpacer();

  if (!isSmall) {
    const footer = w.addText(`${data.items.length} news · ${topicsOf(data).join(", ")}`);
    footer.font = Font.regularSystemFont(10);
    footer.textColor = Color.gray();
    footer.lineLimit = 1;
  }

  return w;
}

function buildErrorWidget(message) {
  const w = new ListWidget();
  w.backgroundColor = BG;
  w.url = URLScheme.forRunningScript();
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  const title = w.addText("ORBIT");
  title.font = Font.heavySystemFont(12);
  title.textColor = ACCENT;
  w.addSpacer(6);
  const t = w.addText(message);
  t.font = Font.mediumSystemFont(12);
  t.textColor = Color.gray();
  return w;
}

// ---------- Reader ----------

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHTML(data, offline) {
  const cards = data.items
    .map((item) => {
      const topic = TOPICS[item.topic] || { label: item.topic, color: "#888888" };
      const kind = KINDS[item.kind] || KINDS.article;
      return `
      <article class="card">
        <div class="tags">
          <span class="tag" style="--c:${topic.color}">${esc(topic.label)}</span>
          <span class="tag" style="--c:${kind.color}">${esc(kind.label)}</span>
        </div>
        <h2>${esc(item.title)}</h2>
        <p>${esc(item.summary)}</p>
        <p class="why"><strong>Pour toi :</strong> ${esc(item.whyItMatters)}</p>
        <a href="${esc(item.url)}">${esc(item.source)} · ${esc(item.publishedAt)} ↗</a>
      </article>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>
  :root { --bg:#FFFFFF; --fg:#111111; --muted:#6B7280; --card:#F4F4F6; --accent:#7C5CFF; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#0B0B0F; --fg:#F5F5F5; --muted:#9CA3AF; --card:#17171D; }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: calc(env(safe-area-inset-top) + 20px) 18px calc(env(safe-area-inset-bottom) + 32px);
    background: var(--bg); color: var(--fg);
    font: 16px/1.5 -apple-system, system-ui, sans-serif;
  }
  header { margin-bottom: 20px; }
  .brand { color: var(--accent); font-weight: 900; letter-spacing: .12em; font-size: 13px; }
  h1 { margin: 4px 0 2px; font-size: 28px; line-height: 1.2; text-transform: capitalize; }
  .meta { color: var(--muted); font-size: 14px; }
  .card { background: var(--card); border-radius: 16px; padding: 16px; margin-bottom: 14px; }
  .tags { display: flex; gap: 6px; margin-bottom: 8px; }
  .tag {
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em;
    padding: 3px 8px; border-radius: 999px;
    color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent);
  }
  h2 { font-size: 18px; line-height: 1.3; margin: 0 0 8px; }
  p { margin: 0 0 10px; }
  .why { color: var(--muted); font-size: 15px; }
  .why strong { color: var(--fg); }
  a { color: var(--accent); text-decoration: none; font-size: 14px; font-weight: 600; }
</style>
</head>
<body>
  <header>
    <div class="brand">ORBIT</div>
    <h1>${esc(formatDate(data.date))}</h1>
    <div class="meta">${data.items.length} news · ${data.readingTime} min de lecture${offline ? " · hors ligne" : ""}</div>
  </header>
  ${cards}
</body>
</html>`;
}

async function presentReader(data, offline) {
  const wv = new WebView();
  wv.shouldAllowRequest = (req) => {
    if (req.url.startsWith("http")) {
      Safari.open(req.url);
      return false;
    }
    return true;
  };
  await wv.loadHTML(buildHTML(data, offline));
  await wv.present(true);
}

// ---------- Main ----------

try {
  const { data, offline } = await loadBriefing();
  if (config.runsInWidget) {
    Script.setWidget(buildWidget(data, offline));
  } else {
    await presentReader(data, offline);
  }
} catch (e) {
  if (config.runsInWidget) {
    Script.setWidget(buildErrorWidget("Briefing indisponible"));
  } else {
    const alert = new Alert();
    alert.title = "Orbit";
    alert.message = `Impossible de charger le briefing.\n${e.message || e}`;
    alert.addAction("OK");
    await alert.present();
  }
}

Script.complete();
