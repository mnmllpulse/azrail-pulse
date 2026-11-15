import { describe, expect, it } from 'vitest';
import { readAssignment } from '../ui/assignment';
import { groundWorkPlan, planWork, type WorkPlan } from '../ui/planner';

const modelPlan = (kind: 'web' | 'image' | 'build'): WorkPlan => ({
  parallel: false,
  parts: [{ ...readAssignment('сделай сайт'), kind, id: 'part-1', text: 'x', wave: 0, dependsOn: [], state: 'waiting' }],
});

describe('модельный план привязан к словам сообщения', () => {
  it('вопрос не превращается в сборку сайта', () => {
    expect(groundWorkPlan('что такое эфект данинга крюгера', modelPlan('web'))).toBeNull();
  });
  it('вопрос о возможности — разговор', () => {
    const q = 'ты сможешь сделать сайт если я пришлю тебе набросок зип файлом';
    expect(readAssignment(q).kind).toBe('talk');
    expect(planWork(q).parts).toHaveLength(0);
    expect(groundWorkPlan(q, modelPlan('web'))).toBeNull();
  });
  it('явная просьба сохраняется', () => {
    expect(groundWorkPlan('сделай сайт музыкального проекта', modelPlan('web'))?.parts).toHaveLength(1);
  });
  it('картинка без просьбы отбрасывается', () => {
    expect(groundWorkPlan('почему небо голубое', modelPlan('image'))).toBeNull();
  });
});

describe("условные фразы и ответ про связи", () => {
  it("«Если нужно создать изображение…» — разговор", async () => {
    const { readAssignment } = await import("../ui/assignment");
    expect(readAssignment("Если нужно создать изображение, нужно использовать отдельные инструменты или сервисы можно подробней пожалуйста").kind).toBe("talk");
    expect(readAssignment("нарисуй кота").kind).toBe("image");
  });
  it("блок связей упоминается только по вопросу о них", async () => {
    const { readFileSync } = await import("node:fs");
    expect(readFileSync("src/agents/answer-agent.ts", "utf8")).toContain("используй только если человек прямо спросил о связях");
  });
});
