import { readdirSync, statSync } from "fs";
import { join } from "path";

export function readDirAll(path: string) {
  const items = readdirSync(path);
  const results: string[] = [];
  for (const item of items) {
    const itemPath = join(path, item);
    if (statSync(itemPath).isDirectory()) {
      results.push(...readDirAll(itemPath));
    } else {
      results.push(itemPath);
    }
  }
  return results;
}