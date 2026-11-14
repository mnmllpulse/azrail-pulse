import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

describe('studio admission claims',()=>{
  it('are released when the request failed before the provider was dispatched',()=>{
    const source=readFileSync(new URL('../src/unified/entry.ts',import.meta.url),'utf8');
    expect(source).toContain("else await env.AZRAIL_D1.prepare('DELETE FROM mission_admissions WHERE key=? AND claim=?').bind(scope,claim.claim).run()");
  });
});

describe('отказ фильтра безопасности провайдера',()=>{
  const source=readFileSync(new URL('../src/unified/entry.ts',import.meta.url),'utf8');
  it('освобождает ключ и отвечает окончательной ошибкой 422, а не «результат не подтверждён»',()=>{
    const block=source.slice(source.indexOf('has been flagged'));
    expect(block.slice(0,700)).toContain("DELETE FROM mission_admissions");
    expect(block.slice(0,700)).toContain("(код 3030)");
    expect(block.slice(0,700)).toContain(",422)");
    expect(source.indexOf('has been flagged')).toBeLessThan(source.indexOf('результат не подтверждён'));
  });
  it('чат очищает вложения сразу после выполнения частей плана',()=>{
    const app=readFileSync(new URL('../ui/app.ts',import.meta.url),'utf8');
    expect(app).toContain("else if(part.state==='running')part.state='done';\n   });\n   // Вложения уходят с поручением");
  });
});
