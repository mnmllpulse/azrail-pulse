import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

describe('Git-connected azrail-pulse deployment', () => {
  it('has an explicit root config targeting the free Worker and only built assets', () => {
    const config = readJson('wrangler.jsonc');
    expect(config.name).toBe('azrail-pulse');
    expect(config.main).toBe('src/unified.free.ts');
    expect(config.assets.directory).toBe('./site');
    expect(config.assets.binding).toBe('ASSETS');
    expect(config.containers).toBeUndefined();
    expect(config.vars.AUTH_MODE).toBe('oidc');
    expect(config.vars.AZRAIL_TOKEN).toBeUndefined();
  });

  it('uses canonical resource identities isolated from existing deployments', () => {
    const model = readJson('config/environments.json');
    const config = readJson('wrangler.jsonc');
    expect(model.environments.pulse.config_file).toBe('wrangler.jsonc');
    expect(config.d1_databases[0]).toEqual(model.environments.pulse.d1);
    for (const name of ['staging', 'production']) {
      const other = model.environments[name];
      expect(config.d1_databases[0].database_id).not.toBe(other.d1.database_id);
      expect(config.kv_namespaces[0].id).not.toBe(other.kv.id);
      expect(config.r2_buckets[0].bucket_name).not.toBe(other.r2.bucket_name);
    }
  });
});
