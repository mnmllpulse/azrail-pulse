import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const text = readFileSync('docs/runbooks/THREAT_MODEL_RU.md', 'utf8');

describe('threat model', () => {
  it.each([
    'Обзор входа',
    'Обзор прав',
    'Изоляция арендаторов',
    'Секреты',
    'API',
    'Песочница',
    'Зависимости',
    'Конфигурация Cloudflare',
    'R2',
    'D1',
    'CORS и CSP',
    'Активы',
    'Действующие лица',
    'Границы доверия',
    'Поверхности атаки',
    'Смягчения',
    'Остаточные риски',
  ])('has the %s section', (heading) => {
    expect(text).toContain(`## ${heading}`);
  });

  it('keeps the live review closed', () => {
    expect(text).toContain('BLOCKER 17');
    expect(text).toContain('policy.cors_wildcard');
    expect(text).toContain('d1.schema.resource_owners');
    expect(text).toContain('production_approved');
    expect(text).toContain('не открывался');
    expect(text).toContain('5f783b96-4e5e-451a-98f1-c045a6a4fd2f');
    expect(text).not.toMatch(/sk-|xi-api-key|oauth_token|BEGIN PRIVATE KEY/i);
  });
});
