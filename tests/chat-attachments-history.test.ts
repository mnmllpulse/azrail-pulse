import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const app=readFileSync(new URL('../ui/app.ts',import.meta.url),'utf8');
const uploads=readFileSync(new URL('../ui/attachment-upload.ts',import.meta.url),'utf8');
const history=readFileSync(new URL('../ui/chat-history.ts',import.meta.url),'utf8');

describe('attachments stay visible in chat history',()=>{
  it('uploads each attachment once; the image reference is a separate shrunk copy cached per file',()=>{
    expect(uploads).toContain('function uploadedAttachment');
    expect(uploads).toMatch(/const known = shrunkReferences\.get\(file\);\s*if \(known\) return known;/);
    expect(uploads).toContain('shrunkReferences.set(file, saved.id)');
    expect(app).toContain('createAttachmentUploads(');
  });
  it('adds markdown for attachments to the sent and saved user message',()=>{
    expect(app).toContain('message+await attachmentMarkup(message)');
    expect(app).toContain('const shown=message+await attachmentMarkup(message)');
    expect(app).toContain('message:shown,projectId:project');
    expect(app).toContain('message===sentMarkup.for?message+sentMarkup.text:message');
  });
  it('renders own artifact links in user messages as compact chips',()=>{
    expect(history).toContain("role==='user'&&splitAttachments(content).files.length");
    expect(history).toContain('attachmentChip(doc,file)');
  });
});
