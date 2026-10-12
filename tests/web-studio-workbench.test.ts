import {describe,expect,it} from 'vitest';
import {languageForPath} from '../src/lib/web-workbench';

describe('Web Studio workbench',()=>{
 it('maps common web source extensions for syntax display',()=>{
  expect(languageForPath('src/app.tsx')).toBe('typescript');
  expect(languageForPath('public/index.html')).toBe('html');
  expect(languageForPath('styles/app.css')).toBe('css');
  expect(languageForPath('data/config.json')).toBe('json');
 });
 it('falls back to text for unknown source extensions',()=>expect(languageForPath('README.unknown')).toBe('text'));
});
