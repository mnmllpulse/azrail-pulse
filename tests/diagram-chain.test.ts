import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {diagramLines,diagramModel} from '../ui/diagram';
import {pictureReply} from '../ui/planner';

describe('схема из цепочки',()=>{
  it('режет цепочку на узлы и убирает команду',()=>{
    const model=diagramModel('Сделай схему: Идея -> Код -> Тест -> Выпуск');
    expect(model.nodes).toEqual(['Идея','Код','Тест','Выпуск']);
    expect(model.edges).toEqual([['Идея','Код'],['Код','Тест'],['Тест','Выпуск']]);
  });
  it('понимает стрелку-символ и несколько строк',()=>{
    const model=diagramModel('Нарисуй схему входа: Клиент → Сервер\nСервер → База');
    expect(model.nodes).toEqual(['Клиент','Сервер','База']);
    expect(model.edges).toHaveLength(2);
  });
  it('без стрелок берёт перечисление',()=>{
    expect(diagramModel('Нарисуй схему: вход, проверка, выдача').nodes.length).toBe(3);
  });
  it('схема попадает в сохраняемый ответ и рисуется из истории',()=>{
    const lines=diagramLines(diagramModel('Идея -> Код'));
    const reply=pictureReply([{ready:'Схема в чате.',thing:{type:'diagram',title:'Схема',lines}}]);
    expect(reply).toContain('```diagram\nИдея -> Код\n```');
    const markdown=readFileSync(new URL('../ui/chat-markdown.ts',import.meta.url),'utf8');
    expect(markdown).toContain("=== 'diagram'");
  });
});
