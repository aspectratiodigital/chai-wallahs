import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "src", "content", "festivals");

const MONTH_ABBR = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// Researched (see conversation) gate/opening times for the recurring named
// festivals; "default" covers one-off/small/undocumented back-catalogue
// entries per the explicit "doesn't have to be perfectly accurate" brief.
const OPENING_TIMES = [
  { match: /shambala/i, time: "12:00pm" },
  { match: /green ?man|greenman/i, time: "10:00am" },
  { match: /kendal calling/i, time: "9:00am" },
  { match: /nass/i, time: "9:00am" },
  { match: /secret garden party|where it all began/i, time: "9:00am" },
  { match: /glastonbury/i, time: "8:00am" },
  { match: /boomerang/i, time: "2:00pm" },
  { match: /body.?(and|&).?soul/i, time: "9:00am" },
];
const DEFAULT_OPENING_TIME = "12:00pm";

// Festival "families" known to run a consistent multi-day span, used only
// for entries that don't already state an explicit end date. Rolls the
// start date forward to the family's usual last day.
const SPAN_FAMILIES = [
  { match: /shambala/i, endWeekday: 0 }, // Sunday
  { match: /green ?man|greenman/i, endWeekday: 0 },
  { match: /kendal calling/i, endWeekday: 0 },
  { match: /nass/i, endWeekday: 0 },
  { match: /secret garden party/i, endWeekday: 0 },
  { match: /glastonbury/i, endWeekday: 0 },
];

function findOpeningTime(title) {
  for (const { match, time } of OPENING_TIMES) {
    if (match.test(title)) return time;
  }
  return DEFAULT_OPENING_TIME;
}

function parseExplicitEndDate(timeStr, startDate) {
  // Trailing "<day> <MonAbbr>" e.g. "...Sun 3 Aug" or "...Sun 29 Jun"
  const m = timeStr.match(/(\d{1,2})\s+([A-Za-z]{3})\s*$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const monKey = m[2].toLowerCase();
  if (!(monKey in MONTH_ABBR)) return null;
  const month = MONTH_ABBR[monKey];
  let year = startDate.getUTCFullYear();
  // Handle a Dec -> Jan rollover, not currently present but safe to guard.
  if (month < startDate.getUTCMonth()) year += 1;
  return new Date(Date.UTC(year, month, day));
}

function rollForwardToWeekday(startDate, targetWeekday) {
  const d = new Date(startDate);
  while (d.getUTCDay() !== targetWeekday) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".md"));
let withEndDate = 0;
let openingOnly = 0;

for (const file of files) {
  const filePath = path.join(DIR, file);
  let content = fs.readFileSync(filePath, "utf-8");

  const titleMatch = content.match(/^title: "(.*)"$/m);
  const dateMatch = content.match(/^date: (\d{4}-\d{2}-\d{2})$/m);
  const timeMatch = content.match(/^time: "(.*)"$/m);
  if (!titleMatch || !dateMatch) {
    console.log(`SKIP (missing title/date): ${file}`);
    continue;
  }
  const title = titleMatch[1];
  const startDate = new Date(`${dateMatch[1]}T00:00:00Z`);

  let endDate = null;
  if (timeMatch) {
    endDate = parseExplicitEndDate(timeMatch[1], startDate);
  }
  if (!endDate) {
    const family = SPAN_FAMILIES.find((f) => f.match.test(title));
    if (family) {
      const candidate = rollForwardToWeekday(startDate, family.endWeekday);
      // Only treat as multi-day if it actually rolled forward (not already
      // on/after the target weekday at 0 distance) and stays within a
      // sane festival-length window.
      const diffDays = (candidate - startDate) / 86400000;
      if (diffDays > 0 && diffDays <= 5) {
        endDate = candidate;
      }
    }
  }

  const openingTime = findOpeningTime(title);

  // Remove the old `time:` line (fully superseded by openingTime for
  // festivals) and insert endDate + openingTime right after `date:`.
  content = content.replace(/^time: ".*"\n/m, "");
  const insertion = endDate
    ? `endDate: ${isoDate(endDate)}\nopeningTime: "${openingTime}"\n`
    : `openingTime: "${openingTime}"\n`;
  content = content.replace(/^(date: \d{4}-\d{2}-\d{2}\n)/m, `$1${insertion}`);

  fs.writeFileSync(filePath, content, "utf-8");
  if (endDate) withEndDate++;
  else openingOnly++;
}

console.log(`Processed ${files.length} festival files.`);
console.log(`  with endDate (multi-day range): ${withEndDate}`);
console.log(`  opening time only (single day): ${openingOnly}`);
