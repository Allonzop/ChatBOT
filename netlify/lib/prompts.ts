/**
 * Chargement des prompts Markdown. Les fichiers sont lus une fois au
 * démarrage de la fonction et gardés en mémoire. Changer une niche ou un
 * ton ne demande que de modifier `prompts/base.md` ou `prompts/tasks/<cle>.md`.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_TASK_KEY = "libre";

let promptsDir: string | undefined;
let basePrompt: string | undefined;
const taskPrompts = new Map<string, string>();

function candidateRoots(): string[] {
  const roots: string[] = [];
  const here = (() => {
    try {
      return dirname(fileURLToPath(import.meta.url));
    } catch {
      return process.cwd();
    }
  })();
  // Remonte depuis le fichier compilé jusqu'à trouver un dossier `prompts`.
  let dir = here;
  for (let i = 0; i < 6; i += 1) {
    roots.push(dir);
    dir = dirname(dir);
  }
  if (process.env.LAMBDA_TASK_ROOT) roots.push(process.env.LAMBDA_TASK_ROOT);
  roots.push(process.cwd());
  return roots;
}

function findPromptsDir(): string {
  if (promptsDir) return promptsDir;
  const override = process.env.PROMPTS_DIR;
  if (override && existsSync(join(override, "base.md"))) {
    promptsDir = resolve(override);
    return promptsDir;
  }
  for (const root of candidateRoots()) {
    const candidate = join(root, "prompts");
    if (existsSync(join(candidate, "base.md"))) {
      promptsDir = candidate;
      return candidate;
    }
  }
  throw new Error("Dossier prompts introuvable (prompts/base.md). Vérifie included_files dans netlify.toml.");
}

function loadAll(): void {
  if (basePrompt !== undefined) return;
  const dir = findPromptsDir();
  basePrompt = readFileSync(join(dir, "base.md"), "utf8").trim();
  const tasksDir = join(dir, "tasks");
  for (const file of readdirSync(tasksDir)) {
    if (!file.endsWith(".md")) continue;
    const key = file.slice(0, -3);
    taskPrompts.set(key, readFileSync(join(tasksDir, file), "utf8").trim());
  }
  if (!taskPrompts.has(DEFAULT_TASK_KEY)) {
    throw new Error(`Prompt de tâche par défaut manquant : prompts/tasks/${DEFAULT_TASK_KEY}.md`);
  }
}

export function taskKeys(): string[] {
  loadAll();
  return [...taskPrompts.keys()].sort();
}

export function isTaskKey(key: unknown): key is string {
  loadAll();
  return typeof key === "string" && taskPrompts.has(key);
}

/**
 * Bloc 1 du prompt système : base + tâche. Stable d'un appel à l'autre,
 * sans date ni identifiant, pour être mis en cache côté Anthropic.
 */
export function stableSystemBlock(taskKey: string): string {
  loadAll();
  const task = taskPrompts.get(taskKey) ?? taskPrompts.get(DEFAULT_TASK_KEY)!;
  return `${basePrompt}\n\n---\n\n${task}`;
}
