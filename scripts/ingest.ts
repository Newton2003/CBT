import fs from "fs-extra";
import path from "node:path";
import crypto from "node:crypto";
import natural from "natural";

type OptionKey = "A" | "B" | "C" | "D";

interface QuestionRecord {
  id: string;
  subject: string;
  topic: string;
  year: number;
  question: string;
  options: Record<OptionKey, string>;
  answer: OptionKey | "";
  explanation: string;
  source: string;
}

interface TopicsBySubject {
  [subject: string]: string[];
}

const RAW_SYLLABUS = path.resolve("syllabus.txt");
const RAW_QUESTIONS = path.resolve("all pastque.txt");
const OUT_DIR = path.resolve("data");
const MIRROR_PATHS = [path.join("src", "data", "questions.json"), path.join("public", "data", "questions.json"), path.join("data", "questions.json")];
const TOPIC_MIRRORS = [path.join("src", "data", "topics.json"), path.join("public", "data", "topics.json"), path.join("data", "topics.json")];

const SAMPLE_LIMIT = (() => {
  const idx = process.argv.indexOf("--sample");
  if (idx >= 0 && process.argv[idx + 1]) return Number(process.argv[idx + 1]);
  return undefined;
})();

const toAscii = (text: string) => text.normalize("NFKD").replace(/[^\x00-\x7f]/g, "").trim();
const normalizeSubject = (raw?: string) => {
  if (!raw) return null;
  const val = raw.toLowerCase().trim();
  if (val.includes("english")) return "Use of English";
  if (val.includes("government")) return "Government";
  if (val.includes("crk") || val.includes("christian")) return "Christian Religious Studies";
  if (val.includes("literature")) return "Literature in English";
  return null;
};

const stripParens = (s: string) => s.replace(/[()\[\]-]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

function topicScore(text: string, topic: string) {
  const q = stripParens(text);
  const t = stripParens(topic);
  if (!q || !t) return 0;
  if (q.includes(t)) return 1;
  return natural.JaroWinklerDistance(q.slice(0, 220), t);
}

function sanitizeRawQuestions(raw: string) {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\\([%$&_])/g, "$1")
    .replace(/^\s*\)\s*$/gm, "")
    .replace(/,\\s*([\]\}])/g, "$1")
    .trim();
}

function extractJsonArrays(raw: string) {
  const arrays: any[] = [];
  let i = 0;
  while (true) {
    const start = raw.indexOf("[", i);
    if (start === -1) break;
    let depth = 0;
    let end = -1;
    for (let j = start; j < raw.length; j++) {
      const ch = raw[j];
      if (ch === "[") depth++;
      else if (ch === "]") {
        depth--;
        if (depth === 0) {
          end = j;
          break;
        }
      }
    }
    if (end === -1) break;
    const chunk = raw.slice(start, end + 1);
    try {
      arrays.push(JSON.parse(chunk));
    } catch (_err) {
      const cleaned = chunk.replace(/^\s*\)\s*$/gm, "").replace(/,\s*\]/g, "]");
      arrays.push(JSON.parse(cleaned));
    }
    i = end + 1;
  }
  return arrays;
}

function flattenTopics(): TopicsBySubject {
  const raw = fs.readJsonSync(RAW_SYLLABUS);
  const topicsBySubject: TopicsBySubject = {};

  for (const entry of raw.syllabi || []) {
    const subject = entry.subject as string;
    const bucket: string[] = [];
    if (entry.sections) {
      for (const s of entry.sections) bucket.push(...(s.topics || []));
    }
    if (entry.parts) {
      for (const p of entry.parts) bucket.push(...(p.topics || []));
    }
    if (entry.genres) {
      for (const g of entry.genres) bucket.push(...(g.topics || []));
    }
    if (entry.topics) bucket.push(...entry.topics);

    const uniq = Array.from(new Set(bucket.map((t: string) => toAscii(t)))).filter(Boolean);
    topicsBySubject[subject] = uniq;
  }
  return topicsBySubject;
}

function matchTopic(subject: string, questionText: string, providedTopic: string | undefined, topicsBySubject: TopicsBySubject) {
  const topics = topicsBySubject[subject] || [];
  if (!topics.length) return null;
  const hay = `${providedTopic || ""} ${questionText}`;
  let best = { topic: "", score: 0 };
  for (const t of topics) {
    const score = topicScore(hay, t);
    if (score > best.score) best = { topic: t, score };
  }
  const threshold = 0.65;
  return best.score >= threshold ? best.topic : null;
}

function normalizeOptions(opts: any): Record<OptionKey, string> {
  const normalized: Record<OptionKey, string> = { A: "", B: "", C: "", D: "" };
  if (!opts || typeof opts !== "object") return normalized;
  for (const key of Object.keys(opts)) {
    const k = key.toUpperCase();
    if (["A", "B", "C", "D"].includes(k)) {
      normalized[k as OptionKey] = toAscii(String(opts[key] || ""));
    }
  }
  return normalized;
}

function makeExplanation(answer: string) {
  if (!answer) return "Review the options and concept; the correct answer best satisfies the question's requirement.";
  return `Option ${answer} is correct because it aligns most closely with the key concept being tested.`;
}

function hashId(subject: string, year: number, question: string) {
  return crypto.createHash("sha1").update(`${subject}-${year}-${question}`).digest("hex").slice(0, 12);
}

function cleanQuestions(rawArrays: any[], topicsBySubject: TopicsBySubject): QuestionRecord[] {
  const dataset: QuestionRecord[] = [];
  let dropped = 0;

  for (const arr of rawArrays) {
    if (!Array.isArray(arr)) continue;
    for (const raw of arr) {
      const subject = normalizeSubject(raw.subject);
      if (!subject) {
        dropped++;
        continue;
      }
      const question = toAscii(String(raw.question || ""));
      if (!question) {
        dropped++;
        continue;
      }
      const year = Number(raw.year || 0) || 0;
      const options = normalizeOptions(raw.options);
      const answerRaw = String(raw.answer || "").trim().toUpperCase();
      const answer: OptionKey | "" = ["A", "B", "C", "D"].includes(answerRaw) ? (answerRaw as OptionKey) : "";
      const providedTopic = raw.topic ? toAscii(String(raw.topic)) : undefined;
      const topic = matchTopic(subject, question, providedTopic, topicsBySubject);
      if (!topic) {
        dropped++;
        continue;
      }
      const explanationText = raw.explanation && String(raw.explanation).trim() ? toAscii(String(raw.explanation)) : makeExplanation(answer);
      const id = hashId(subject, year, question);
      dataset.push({
        id,
        subject,
        topic,
        year,
        question,
        options,
        answer,
        explanation: explanationText,
        source: toAscii(String(raw.source || "all pastque"))
      });
      if (SAMPLE_LIMIT && dataset.length >= SAMPLE_LIMIT) return dataset;
    }
  }

  if (dropped) console.log(`Dropped ${dropped} records that were missing data or out of syllabus.`);
  return dataset;
}

async function saveMirrors(filePath: string, data: any) {
  const targets = filePath.endsWith("topics.json") ? TOPIC_MIRRORS : MIRROR_PATHS;
  for (const dest of targets) {
    const target = path.resolve(dest);
    await fs.ensureDir(path.dirname(target));
    await fs.writeJson(target, data, { spaces: 2 });
  }
}

async function main() {
  console.log("Reading syllabus...");
  const topicsBySubject = flattenTopics();
  await fs.ensureDir(OUT_DIR);
  await saveMirrors(path.join(OUT_DIR, "topics.json"), topicsBySubject);

  console.log("Reading question bank...");
  const raw = sanitizeRawQuestions(await fs.readFile(RAW_QUESTIONS, "utf8"));
  const arrays = extractJsonArrays(raw);
  console.log(`Found ${arrays.length} question batches.`);

  console.log("Cleaning and aligning to syllabus...");
  const dataset = cleanQuestions(arrays, topicsBySubject);
  console.log(`Kept ${dataset.length} questions after filtering to syllabus${SAMPLE_LIMIT ? " (sample)" : ""}.`);

  console.log("Writing datasets...");
  await saveMirrors(path.join(OUT_DIR, "questions.json"), dataset);
  console.log("Done. Files written to data/, src/data/, and public/data/.");
}

main().catch((err) => {
  console.error("Ingestion failed", err);
  process.exit(1);
});
