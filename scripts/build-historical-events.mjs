import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const JSONL = path.join(
  "C:\\Users\\Dylan\\AppData\\Local\\Temp\\claude\\D--Chai-New-Website\\97cab896-a7af-45b7-9222-9e65b4d0f272\\scratchpad",
  "fb-events-data.jsonl"
);
const DOWNLOADS = "C:\\Users\\Dylan\\Downloads";
const IMG_OUT_DIR = path.join(ROOT, "public", "uploads", "events", "historical");
const GIGS_DIR = path.join(ROOT, "src", "content", "gigs");
const FESTIVALS_DIR = path.join(ROOT, "src", "content", "festivals");

const SKIP_IDS = new Set([
  "1707211450310330", // matches kendal-calling-2026
  "1209037474133583", // Where It All Began -> matches where-it-all-began-2027 (leave as-is)
  "985639760994615", // Green Man -> matches greenman-2026 (leave as-is)
  "3749579341841218", // matches nye-where-it-all-begins
  "632298462621281", // matches boomerang-2025
  "1714117829134041", // matches they-say-jump
  "1261999061595769", // matches vookoo-shes-got-brass
  "1016757686464080", // matches jamu
  "2121780498256579", // matches conn3ct-madly
  "174945602671026", // excluded: ticket giveaway promo
  "344879048918931", // excluded: generic season-announcement post
]);

const MONTHS = {
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
};
const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_ABBR = { Monday:"Mon", Tuesday:"Tue", Wednesday:"Wed", Thursday:"Thu", Friday:"Fri", Saturday:"Sat", Sunday:"Sun" };

function parseDateTokens(dateText) {
  const re = /([A-Za-z]+day) (\d{1,2}) ([A-Za-z]+) (\d{4})(?: at (\d{1,2}):(\d{2}))?/g;
  const matches = [...dateText.matchAll(re)];
  return matches.map((m) => ({
    weekday: m[1],
    day: parseInt(m[2], 10),
    month: m[3],
    year: m[4],
    hour: m[5] ? parseInt(m[5], 10) : null,
    minute: m[6] ? parseInt(m[6], 10) : null,
  }));
}

function iso(tok) {
  const mm = MONTHS[tok.month.toLowerCase()];
  const dd = String(tok.day).padStart(2, "0");
  return `${tok.year}-${mm}-${dd}`;
}

function to12h(hour, minute) {
  const period = hour >= 12 ? "pm" : "am";
  let h = hour % 12;
  if (h === 0) h = 12;
  const mm = String(minute).padStart(2, "0");
  return `${h}:${mm}${period}`;
}

function formatTime(tokens) {
  if (tokens.length === 0) return undefined;
  if (tokens.length === 1) {
    const t = tokens[0];
    if (t.hour === null) return undefined;
    return to12h(t.hour, t.minute);
  }
  // multi-day range
  const [start, end] = tokens;
  const startStr = `${DAY_ABBR[start.weekday] || start.weekday.slice(0,3)} ${start.day}`;
  const endStr = `${DAY_ABBR[end.weekday] || end.weekday.slice(0,3)} ${end.day} ${MONTH_ABBR[MONTHS[end.month.toLowerCase()] - 1]}`;
  return `${startStr} – ${endStr}`;
}

function slugify(str) {
  return str
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

function truncate(str, max) {
  if (!str) return "";
  const clean = str.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return cut.slice(0, lastSpace > 40 ? lastSpace : max) + "…";
}

function yamlEscape(str) {
  return String(str).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function main() {
  const raw = fs.readFileSync(JSONL, "utf-8");
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const entries = lines.map((l) => JSON.parse(l));

  fs.mkdirSync(IMG_OUT_DIR, { recursive: true });

  const existingGigSlugs = new Set(
    fs.readdirSync(GIGS_DIR).map((f) => f.replace(/\.md$/, ""))
  );
  const existingFestivalSlugs = new Set(
    fs.readdirSync(FESTIVALS_DIR).map((f) => f.replace(/\.md$/, ""))
  );
  const usedSlugs = new Set([...existingGigSlugs, ...existingFestivalSlugs]);

  let created = 0;
  let skipped = 0;
  const problems = [];

  for (const e of entries) {
    if (SKIP_IDS.has(e.id)) {
      skipped++;
      continue;
    }
    if (e.category !== "gig" && e.category !== "festival") {
      problems.push(`No usable category for id ${e.id} (${e.h1}) — category="${e.category}"`);
      continue;
    }

    const tokens = parseDateTokens(e.dateText || "");
    if (tokens.length === 0) {
      problems.push(`No parseable date for id ${e.id} (${e.h1}) dateText="${e.dateText}"`);
      continue;
    }
    const dateISO = iso(tokens[0]);
    const time = formatTime(tokens);

    let baseSlug = slugify(e.h1);
    if (!baseSlug) baseSlug = `event-${e.id}`;
    let slug = baseSlug;
    if (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${dateISO}`;
    }
    if (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${e.id.slice(-6)}`;
    }
    usedSlugs.add(slug);

    const kind = e.category === "gig" ? "gigs" : "festivals";
    const dir = kind === "gigs" ? GIGS_DIR : FESTIVALS_DIR;

    // Resize + copy image
    const srcImg = path.join(DOWNLOADS, `fb-event-${e.id}.jpg`);
    const destImgRel = `/uploads/events/historical/${slug}.jpg`;
    const destImgAbs = path.join(IMG_OUT_DIR, `${slug}.jpg`);
    if (fs.existsSync(srcImg)) {
      try {
        await sharp(srcImg)
          .resize({ width: 1400, withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toFile(destImgAbs);
      } catch (err) {
        problems.push(`Image resize failed for id ${e.id} (${e.h1}): ${err.message}`);
        continue;
      }
    } else {
      problems.push(`No downloaded photo for id ${e.id} (${e.h1}), expected ${srcImg}`);
      continue;
    }

    const venue = e.venue && e.venue.trim() ? e.venue.trim() : undefined;
    const blurb = truncate(e.description, 200) || e.h1;
    const body = (e.description || "").trim();

    const fmLines = [
      "---",
      `title: "${yamlEscape(e.h1)}"`,
      `date: ${dateISO}`,
    ];
    if (time) fmLines.push(`time: "${yamlEscape(time)}"`);
    if (venue) fmLines.push(`venue: "${yamlEscape(venue)}"`);
    fmLines.push(`blurb: "${yamlEscape(blurb)}"`);
    fmLines.push(`image: "${destImgRel}"`);
    fmLines.push(`draft: false`);
    fmLines.push("---");
    fmLines.push("");
    fmLines.push(body);
    fmLines.push("");

    fs.writeFileSync(path.join(dir, `${slug}.md`), fmLines.join("\n"), "utf-8");
    created++;
  }

  console.log(`Created: ${created}`);
  console.log(`Skipped (already exists / excluded): ${skipped}`);
  console.log(`Problems: ${problems.length}`);
  problems.forEach((p) => console.log(" - " + p));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
