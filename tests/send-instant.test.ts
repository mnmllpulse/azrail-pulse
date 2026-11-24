import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const app = readFileSync("ui/app.ts", "utf8");
const upload = readFileSync("ui/attachment-upload.ts", "utf8");
const history = readFileSync("ui/chat-history.ts", "utf8");

describe("быстрая отправка", () => {
  it("LLM-планировщик вызывается только для рабочих запросов и с лимитом времени", () => {
    const plan = app.slice(
      app.indexOf("async function chosenPlan"),
      app.indexOf("function noteLocal"),
    );
    expect(plan).toContain("if(!WORK_REQUEST.test(message))return localPlan;");
    expect(plan).toContain("slowPlan(api('/api/plan'");
    expect(app).toMatch(/slowPlan=.*Promise\.race/);
  });
  it("вложения загружаются сразу при добавлении и параллельно при отправке", () => {
    expect(app).toContain("void uploadedAttachment(file).catch(()=>{})");
    expect(app).toContain(
      "await Promise.all(files.map(file=>uploadedAttachment(file)",
    );
  });
  it("загрузка одного файла не дублируется", () => {
    expect(upload).toContain("inFlight");
    expect(upload).toContain("if (running) return running;");
  });
});

describe("сообщение с картинкой", () => {
  it("вложения идут над текстом, текст отдельным абзацем-подписью", () => {
    const block = history.slice(
      history.indexOf("const {text,files}=splitAttachments(content);"),
    );
    expect(block.indexOf("className='message-images'")).toBeLessThan(
      block.indexOf("message('user',text"),
    );
    expect(block.indexOf("className='message-attachments'")).toBeLessThan(
      block.indexOf("message('user',text"),
    );
  });
});
