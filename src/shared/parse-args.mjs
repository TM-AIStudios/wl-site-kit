/**
 * Minimal flag parser: --key value, --key=value, --flag, positional rest.
 * @param {string[]} argv
 */
export function parseArgs(argv) {
  const flags = /** @type {Record<string, string | boolean | string[]>} */ ({});
  /** @type {string[]} */
  const positionals = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--') {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }
    const eq = arg.indexOf('=');
    if (eq !== -1) {
      const key = arg.slice(2, eq);
      const val = arg.slice(eq + 1);
      if (key === 'css' || key === 'copy' || key === 'html' || key === 'routes') {
        const list = /** @type {string[]} */ (flags[key] ?? []);
        list.push(val);
        flags[key] = list;
      } else {
        flags[key] = val;
      }
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    const multi = key === 'css' || key === 'copy' || key === 'html' || key === 'routes';
    if (next == null || next.startsWith('--')) {
      if (multi) {
        const list = /** @type {string[]} */ (flags[key] ?? []);
        flags[key] = list;
      } else {
        flags[key] = true;
      }
    } else {
      if (multi) {
        const list = /** @type {string[]} */ (flags[key] ?? []);
        list.push(next);
        flags[key] = list;
        i++;
        while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
          list.push(argv[++i]);
        }
      } else {
        flags[key] = next;
        i++;
      }
    }
  }
  return { flags, positionals };
}