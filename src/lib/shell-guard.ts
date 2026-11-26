/**
 * Защита от опасных команд. Это не песочница: главная защита — «Разрешить» владельца, который видит команду целиком.
 * Правила дублируются в scripts/local-agent/azrail-agent.mjs (агент проверяет сам); тест сверяет обе копии.
 */
export const SHELL_MAX = 1000;

export const SHELL_BLOCKED: ReadonlyArray<{ re: RegExp; why: string }> = [
  { re: /\b(sudo|su|doas|runas)\b/i, why: "повышение прав" },
  { re: /\brm\s+(-[a-z]*\s+)*-[a-z]*[rf][a-z]*\s+(--\s+)?(\/|~|\$home|\*|\.\.|[a-z]:[\\/])/i, why: "рекурсивное удаление вне проекта" },
  { re: /\b(rmdir|rd|del|erase)\b[^|&;]*\s\/[sq]\b/i, why: "массовое удаление" },
  { re: /\b(format|mkfs(\.\w+)?|diskpart|fdisk|dd)\b\s*[^|&;]*(\bof=|\/dev\/|[a-z]:)/i, why: "работа с диском" },
  { re: /\b(shutdown|reboot|halt|poweroff|init\s+0)\b/i, why: "выключение компьютера" },
  { re: /(curl|wget|iwr|invoke-webrequest|irm|invoke-restmethod)\b[^|;&]*\|\s*(sh|bash|zsh|iex|invoke-expression|powershell|pwsh|cmd)\b/i, why: "запуск скачанного кода" },
  { re: /\b(iex|invoke-expression)\b/i, why: "выполнение строки как кода" },
  { re: /\b(powershell|pwsh)\b[^|;&]*-(e|enc|encodedcommand)\b/i, why: "скрытая команда" },
  { re: /\breg(\.exe)?\s+(delete|add|import)\b/i, why: "изменение реестра" },
  { re: /\bgit\s+push\b[^|;&]*(--force\b|--force-with-lease\b|\s-f\b)/i, why: "принудительная отправка в git" },
  { re: /\bchmod\s+(-[a-z]+\s+)*[0-7]*777\b|\bchown\s+-R\b/i, why: "массовая смена прав" },
  { re: /(\.env\b|\.dev\.vars|\.ssh|\.gnupg|\.aws|id_rsa|id_ed25519|\.pem\b|\.kdbx|\.azrail-agent|\.azrail-roots|\.azrail-browser)/i, why: "секреты и ключи" },
  { re: /\b(printenv|export\s+-p|get-childitem\s+env:|gci\s+env:)|(^|[|&;]\s*)(env|set)\s*($|[|&;])/i, why: "вывод переменных окружения" },
  { re: /\b(nc|ncat|netcat|telnet|ssh|scp|sftp|ftp)\b/i, why: "сетевое соединение в обход AZRAIL" },
  { re: /:\(\)\s*\{/, why: "fork-бомба" },
  { re: /[\0-\x08\x0b\x0c\x0e-\x1f]/, why: "управляющие символы" },
];

export function shellProblem(command: unknown): string | null {
  if (typeof command !== "string") return "Команда должна быть строкой.";
  const text = command.trim();
  if (!text) return "Пустая команда.";
  if (text.length > SHELL_MAX) return `Команда длиннее ${SHELL_MAX} символов.`;
  for (const rule of SHELL_BLOCKED) if (rule.re.test(text)) return `Команда заблокирована: ${rule.why}.`;
  return null;
}
