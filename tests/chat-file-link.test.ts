import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {pictureReply} from '../ui/planner';

describe('file results survive in chat history',()=>{
  const thing={type:'file' as const,url:'/api/studio/artifacts/0a4363db-cbb0-47c8-ba45-526c5f3e0456',title:'с-текстом-тест.pdf'};
  it('pictureReply keeps a markdown link for built files',()=>{
    const reply=pictureReply([{ready:'Файл «с-текстом-тест.pdf» в чате.',thing}]);
    expect(reply).toContain('[с-текстом-тест.pdf](/api/studio/artifacts/0a4363db-cbb0-47c8-ba45-526c5f3e0456)');
  });
  it('ignores file links outside own artifacts',()=>{
    expect(pictureReply([{ready:'x',thing:{...thing,url:'https://evil.example/a.pdf'}}])).toBe('');
  });
  it('markdown renderer turns own artifact links into download buttons only',()=>{
    const source=readFileSync(new URL('../ui/chat-markdown.ts',import.meta.url),'utf8');
    expect(source).toContain('appendFile(parent, title');
    expect(source).toContain("const path = safeChatPicture(found[3] ?? '')");
  });
});
