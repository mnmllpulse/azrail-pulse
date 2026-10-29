import {expect,it} from 'vitest';
import {resolveCommand,spawnCommand} from '../scripts/lib/run-command.mjs';

it('uses the current Node and npm CLI on Windows without shell parsing',()=>{
 const cli='C:\\Tools with spaces\\node_modules\\npm\\bin\\npm-cli.js';
 const nodePath='C:\\Tools with spaces\\node.exe';
 const command=['npm','run','check','--','a b','x&y'];
 expect(resolveCommand(command,{platform:'win32',nodePath,npmPath:undefined,exists:(p:string)=>p===cli})).toEqual([nodePath,cli,...command.slice(1)]);
});

it('honors npm_execpath and ignores other package manager entrypoints',()=>{
 const env={platform:'win32',nodePath:'C:\\Node\\node.exe',exists:()=>true};
 expect(resolveCommand(['npm','--version'],{...env,npmPath:'D:\\npm\\npm-cli.js'})).toEqual([env.nodePath,'D:\\npm\\npm-cli.js','--version']);
 expect(resolveCommand(['npm','--version'],{...env,npmPath:'D:\\pnpm.cjs'})[1]).toBe('C:\\Node\\node_modules\\npm\\bin\\npm-cli.js');
});

it('preserves Unix npm invocation and exposes missing executable errors',()=>{
 expect(resolveCommand(['npm','test'],{platform:'linux'})).toEqual(['npm','test']);
 const result=spawnCommand(['azrail-missing-executable-for-test'],{encoding:'utf8'});
 expect(result.status).not.toBe(0);expect(result.error?.code).toBe('ENOENT');
});

it('passes literal arguments to Node without invoking a shell',()=>{
 const result=spawnCommand(['node','-e','process.stdout.write(process.argv[1])','a b & c'],{encoding:'utf8'});
 expect(result.status).toBe(0);expect(result.stdout).toBe('a b & c');
});
