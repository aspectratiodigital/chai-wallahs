import fs from "node:fs";

const JSONL = "C:\\Users\\Dylan\\AppData\\Local\\Temp\\claude\\D--Chai-New-Website\\97cab896-a7af-45b7-9222-9e65b4d0f272\\scratchpad\\fb-events-data.jsonl";
const lines = fs.readFileSync(JSONL, "utf-8").split("\n").filter(Boolean);
const bad = [];
for (const l of lines) {
  const o = JSON.parse(l);
  if (o.photoStatus === "ok:28004") bad.push(`${o.id} | ${o.h1}`);
}
console.log(bad.length);
bad.forEach((b) => console.log(b));
