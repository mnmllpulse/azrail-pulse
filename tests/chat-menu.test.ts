import {afterEach,describe,expect,it,vi} from 'vitest';
import {Window} from 'happy-dom';
import {createChatHistory} from '../ui/chat-history';
import {createChatMenu} from '../ui/chat-menu';

let win:Window|undefined;
afterEach(()=>{vi.unstubAllGlobals();win?.close();win=undefined;});

const setup=(signedIn=true)=>{
  win=new Window({url:'https://azrail.example/'});
  const doc=win.document;
  vi.stubGlobal('document',doc);vi.stubGlobal('window',win);vi.stubGlobal('location',win.location);
  doc.body.innerHTML='<div class="chat-row"><button id="anchor">⋯</button></div>';
  const history=createChatHistory(undefined);
  history.setScope('test');
  const thread=history.create();
  history.rename(thread.id,'Первый');
  const api=vi.fn(async()=>({}));
  const notice=vi.fn(),syncChatUI=vi.fn(),openChat=vi.fn(),newChat=vi.fn();
  let project='';
  const setProject=vi.fn((id:string)=>{project=id;});
  const menu=createChatMenu({chatHistory:history,api,signedIn:()=>signedIn,notice,syncChatUI,openChat,newChat,getProject:()=>project,setProject});
  const open=()=>{menu.open(thread.id,doc.getElementById('anchor') as unknown as HTMLElement);return Array.from(doc.querySelectorAll<HTMLButtonElement>('.chat-menu-item'));};
  const click=(label:string)=>open().find(b=>b.textContent===label)!.click();
  return {history,thread,api,notice,syncChatUI,openChat,newChat,setProject,open,click,doc};
};

describe('chat menu',()=>{
  it('lists all seven actions',()=>{
    const t=setup();
    expect(t.open().map(b=>b.textContent)).toEqual(['Переименовать чат','Удалить чат','Архивировать чат','Поделиться чатом','Закрепить чат','Добавить в проект','Добавить на главный экран']);
    expect(t.doc.querySelectorAll('.chat-menu')).toHaveLength(1);
    t.open();
    expect(t.doc.querySelectorAll('.chat-menu')).toHaveLength(1);
  });
  it('renames, trims, persists on the server and rejects empty titles',async()=>{
    const t=setup();
    vi.stubGlobal('window',Object.assign(win!,{prompt:()=>'  Новое   имя  '}));
    t.click('Переименовать чат');
    expect(t.history.list()[0].title).toBe('Новое имя');
    expect(t.api).toHaveBeenCalledWith('/api/conversations',expect.objectContaining({method:'PATCH',body:expect.stringContaining('Новое имя')}));
    vi.stubGlobal('window',Object.assign(win!,{prompt:()=>'   '}));
    t.click('Переименовать чат');
    expect(t.notice).toHaveBeenCalledWith('Название не может быть пустым.',true);
    expect(t.history.list()[0].title).toBe('Новое имя');
  });
  it('does not call the server when not signed in',()=>{
    const t=setup(false);
    t.click('Закрепить чат');
    expect(t.history.list()[0].pinned).toBe(true);
    expect(t.api).not.toHaveBeenCalled();
  });
  it('archives and unarchives with a notice',()=>{
    const t=setup();
    t.click('Архивировать чат');
    expect(t.history.list()[0].archived).toBe(true);
    expect(t.notice).toHaveBeenLastCalledWith('Чат в архиве.');
    t.click('Разархивировать чат');
    expect(t.notice).toHaveBeenLastCalledWith('Чат возвращён из архива.');
  });
  it('deletes only after confirmation',async()=>{
    const t=setup();
    vi.stubGlobal('window',Object.assign(win!,{confirm:()=>false}));
    t.click('Удалить чат');
    await new Promise(r=>setTimeout(r,0));
    expect(t.history.list()).toHaveLength(1);
    vi.stubGlobal('window',Object.assign(win!,{confirm:()=>true}));
    t.click('Удалить чат');
    await new Promise(r=>setTimeout(r,0));
    expect(t.history.list()).toHaveLength(0);
    expect(t.api).toHaveBeenCalledWith(expect.stringContaining('/api/chat?conversationId='),{method:'DELETE'});
    expect(t.newChat).toHaveBeenCalled();
    expect(t.notice).toHaveBeenLastCalledWith('Чат удалён.');
  });
  it('binds the current chat to a project and updates the device project',()=>{
    const t=setup();
    vi.stubGlobal('window',Object.assign(win!,{prompt:()=>' proj-1 '}));
    t.click('Добавить в проект');
    expect(t.history.list()[0].projectId).toBe('proj-1');
    expect(t.setProject).toHaveBeenCalledWith('proj-1');
    expect(t.notice).toHaveBeenLastCalledWith('Чат добавлен в проект.');
  });
  it('closing removes the menu',()=>{
    const t=setup();
    t.open();
    const menuApi=createChatMenu({chatHistory:t.history,api:t.api,signedIn:()=>true,notice:t.notice,syncChatUI:t.syncChatUI,openChat:t.openChat,newChat:t.newChat,getProject:()=>'',setProject:t.setProject});
    menuApi.close();
    expect(t.doc.querySelectorAll('.chat-menu')).toHaveLength(0);
  });
});
