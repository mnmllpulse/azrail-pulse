import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { win32 } from 'node:path';

// Windows cannot execute npm.cmd with shell:false. Run npm's JS entrypoint
// with the current Node binary instead, preserving argument boundaries.
export function resolveCommand(command, {
  platform = process.platform,
  nodePath = process.execPath,
  npmPath = process.env.npm_execpath,
  exists = existsSync,
} = {}) {
  const [bin, ...args] = command;
  if (bin === 'node') return [nodePath, ...args];
  if (bin !== 'npm' || platform !== 'win32') return [...command];
  const candidates = [npmPath, win32.join(win32.dirname(nodePath), 'node_modules', 'npm', 'bin', 'npm-cli.js')];
  const cli = candidates.find(path => path && /(?:^|[\\/])npm-cli\.js$/i.test(path) && exists(path));
  return cli ? [nodePath, cli, ...args] : [...command];
}

export function spawnCommand(command, options = {}) {
  const [bin, ...args] = resolveCommand(command);
  return spawnSync(bin, args, { ...options, shell: false });
}
