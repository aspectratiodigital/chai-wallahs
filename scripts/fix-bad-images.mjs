import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const GIGS_DIR = path.join(ROOT, "src", "content", "gigs");
const FESTIVALS_DIR = path.join(ROOT, "src", "content", "festivals");
const FALLBACK_REL = "/uploads/events/historical/_fallback-chai-tent.jpg";

// id -> [dir, slug, old image filename to delete]
const FIXES = [
  ["239842540306487", FESTIVALS_DIR, "a-taste-of-shambala"],
  ["1937857276300648", FESTIVALS_DIR, "shambala-festival-2019"],
  ["1777935922313678", FESTIVALS_DIR, "green-man-2019"],
  ["224517914849535", FESTIVALS_DIR, "nass-festival-2019-official"],
  ["664932406912883", FESTIVALS_DIR, "chai-wallahs-shambala-festival-21-08-24-08"],
  ["297038763794382", FESTIVALS_DIR, "chai-wallahs-green-man-14-08-17-08"],
  ["735079153209674", FESTIVALS_DIR, "chai-wallahs-fusion-festival-26-06-29-06"],
  ["461622130525492", FESTIVALS_DIR, "chai-wallahs-at-the-greenman-festival-2012"],
  ["390641197637569", FESTIVALS_DIR, "chai-wallahs-priceless-london-wonderground"],
  ["417000138350824", FESTIVALS_DIR, "chai-wallahs-and-global-local-kendal-calling"],
  ["318090611604621", FESTIVALS_DIR, "chai-wallahs-sunrise-celebration-2012"],
  ["365461393503534", FESTIVALS_DIR, "chai-wallahs-beach-break-live-2012"],
  ["920618841316968", FESTIVALS_DIR, "chai-wallahs-and-diplomats-of-sound-threshold-festival"],
  ["822954164465545", GIGS_DIR, "chai-wallahs-live-dubstep-special-feat-alternative-dubstep-o"],
  ["823134217768188", FESTIVALS_DIR, "chai-wallahs-shambala"],
  ["873940929329989", FESTIVALS_DIR, "chai-wallahs-greenman"],
  ["822365527844975", FESTIVALS_DIR, "chai-wallahs-mannifest"],
  ["875811835793792", FESTIVALS_DIR, "chai-wallahs-secret-garden-party"],
  ["819443218140655", FESTIVALS_DIR, "chai-wallahs-glastonbury-festival"],
  ["892296177498063", FESTIVALS_DIR, "chai-wallahs-beach-break-live"],
  ["930083777043954", FESTIVALS_DIR, "chai-wallahs-sunrise-festival"],
  ["814506651968753", GIGS_DIR, "chai-wallahs-presents-peoples-string-foundation-joe-driscoll"],
  ["997369733621139", GIGS_DIR, "diplomats-of-sound-and-chai-wallahs-presents"],
  ["966726850026820", GIGS_DIR, "chai-wallahs-presents-the-boxettes-yes-sir-boss-dizraeli-par"],
  ["419547868091015", FESTIVALS_DIR, "chai-wallahs-at-shambala-festival-2012"],
  ["825065074240670", GIGS_DIR, "chai-wallahs-and-diplomats-of-sound-presents-coda"],
  ["921802611175331", GIGS_DIR, "chai-wallahs-and-diplomats-of-sound-presents"],
];

let fixed = 0;
for (const [id, dir, slug] of FIXES) {
  const mdPath = path.join(dir, `${slug}.md`);
  if (!fs.existsSync(mdPath)) {
    console.log(`MISSING MD: ${mdPath} (id ${id})`);
    continue;
  }
  let content = fs.readFileSync(mdPath, "utf-8");
  const before = content;
  content = content.replace(
    /^image: ".*"$/m,
    `image: "${FALLBACK_REL}"`
  );
  if (content === before) {
    console.log(`NO IMAGE LINE MATCHED: ${mdPath}`);
    continue;
  }
  fs.writeFileSync(mdPath, content, "utf-8");

  // remove the old (wrong) image file for this slug, if present
  const imgPath = path.join(ROOT, "public", "uploads", "events", "historical", `${slug}.jpg`);
  if (fs.existsSync(imgPath)) {
    fs.unlinkSync(imgPath);
  }
  fixed++;
}

console.log(`Fixed ${fixed} / ${FIXES.length} entries`);
