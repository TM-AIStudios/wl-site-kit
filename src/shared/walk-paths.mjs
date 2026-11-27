import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_IGNORE = new Set(['node_modules', '.git', 'dist', 'build', '.next']);

/**
 * @param {string} entry - file or directory
 * @param {(abs: string, rel: string) => boolean} filter
 * @param {string} root
 * @returns {Promise<Array<{ abs: string, rel: string }>>}
 */
export async function collectPaths(entry, filter, root) {
  const results = [];
  const absEntry = path.isAbsolute(entry) ? entry : path.join(root, entry);
  const stat = await fs.stat(absEntry).catch(() => null);
  if (!stat) return results;

  if (stat.isFile()) {
    const rel = path.relative(root, absEntry).split(path.sep).join('/');
    if (filter(absEntry, rel)) results.push({ abs: absEntry, rel });
    return results;
  }

  if (stat.isDirectory()) {
    await walkDir(absEntry, root, filter, results);
  }
  return results;
}

/**
 * @param {string} dir
 * @param {string} root
 * @param {(abs: string, rel: string) => boolean} filter
 * @param {Array<{ abs: string, rel: string }>} results
 */
async function walkDir(dir, root, filter, results) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (DEFAULT_IGNORE.has(ent.name)) continue;
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      await walkDir(abs, root, filter, results);
    } else if (ent.isFile()) {
      const rel = path.relative(root, abs).split(path.sep).join('/');
      if (filter(abs, rel)) results.push({ abs, rel });
    }
  }
}