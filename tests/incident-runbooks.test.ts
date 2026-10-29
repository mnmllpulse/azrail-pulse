import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const text = readFileSync('docs/runbooks/INCIDENTS_RU.md', 'utf8');

describe('incident runbook', () => {
  it.each([
    'Падение провайдера',
    'D1',
    'R2',
    'Сбой OIDC',
    'Скомпрометированный ключ',
    'Аномалия счёта',
    'Плохой выклад',
    'Блокировка пользователя',
    'Затор задач',
    'Восстановление данных',
  ])('has the %s section', (heading) => {
    expect(text).toContain(`## ${heading}`);
  });

  it('keeps production restore and deploy closed', () => {
    expect(text).toContain('azrail-db');
    expect(text).toContain('npm run deploy');
    expect(text).toContain('disabled=1');
    expect(text).toContain('503');
    expect(text).toContain('15 минут');
    expect(text).not.toMatch(/sk-|xi-api-key|oauth_token/i);
  });
});
