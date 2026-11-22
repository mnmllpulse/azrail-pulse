export type LocalCommand='save-zip'|'save-file'|'restore-file'|'run-tests'|'blocked-commands'|'blocked-deploy';

const rules:Array<[LocalCommand,RegExp]>=[
 ['save-zip',/^скачай(?:те)?\s+(?:этот\s+|текущий\s+)?архив[.!?]?$/iu],
 ['save-file',/^скачай(?:те)?\s+(?:этот\s+|текущий\s+)?файл[.!?]?$/iu],
 ['restore-file',/^верни\s+файл[.!?]?$/iu],
 ['run-tests',/^(?:запусти|выполни|прогони)\s+тесты[.!?]?$/iu],
 ['blocked-commands',/^(?:запусти|выполни|прогони)\s+(?:npm|сборку|сервер|dev|команд\p{L}*)[.!?]?$/iu],
 ['blocked-deploy',/^(?:выложи|задеплой|сделай\s+push|отправь\s+в\s+github)[.!?]?$/iu],
];

export function localCommandOf(message:string):LocalCommand|null{
 for(const [kind,pattern] of rules)if(pattern.test(message))return kind;
 return null;
}

export const blockedReply:Record<'blocked-commands'|'blocked-deploy',string>={
 'blocked-commands':'Произвольные команды закрыты пробным лимитом. В настройках можно включить только прогон тестов, не больше 3 раз.',
 'blocked-deploy':'Выкладка из чата закрыта. Пробный лимит на неё — ноль, токен GitHub её не запускает.',
};
