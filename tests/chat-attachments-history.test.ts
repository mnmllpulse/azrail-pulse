import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const app=readFileSync(new URL('../ui/app.ts',import.meta.url),'utf8');
const history=readFileSync(new URL('../ui/chat-history.ts',import.meta.url),'utf8');

describe('attachments stay visible in chat history',()=>{
  it('uploads each attachment once and shares the id with the image reference',()=>{
    expect(app).toContain('async function uploadedAttachment');
    expect(app).toContain('return file?uploadedAttachment(file):');
  });
  it('adds markdown for attachments to the sent and saved user message',()=>{
    expect(app).toContain('message+await attachmentMarkup(message)');
    expect(app).toContain('const shown=message+await attachmentMarkup(message)');
    expect(app).toContain('message:shown,projectId:project');
    expect(app).toContain('message===sentMarkup.for?message+sentMarkup.text:message');
  });
  it('renders own artifact links in user messages',()=>{
    expect(history).toContain("role==='user'&&/");
    expect(history).toContain('fillMarkdownContent(body,content)');
  });
});
