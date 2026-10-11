import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Vite's final bundle is the source of truth; never maintain asset names by hand.
export function offlinePlugin() {
  let base;
  return {
    name: 'mini-journal-offline',
    apply: 'build',
    configResolved(config) { base = config.base; },
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const template = readFileSync(new URL('../src/service-worker.js', import.meta.url), 'utf8');
        const files = Object.keys(bundle).sort();
        const hash = createHash('sha256').update(base).update(template);
        for (const name of files) {
          hash.update(name).update(bundle[name].type === 'chunk' ? bundle[name].code : bundle[name].source);
        }
        const assets = files.map((name) => `${base}${name}`);
        const source = template
          .replace('__CACHE_PREFIX__', JSON.stringify(`mini-journal-shell:${base}:`))
          .replace('__CACHE_VERSION__', JSON.stringify(hash.digest('hex').slice(0, 20)))
          .replace('__ASSETS__', JSON.stringify(assets))
          .replace('__BASE__', JSON.stringify(base));
        this.emitFile({ type: 'asset', fileName: 'sw.js', source });
      },
    },
  };
}
