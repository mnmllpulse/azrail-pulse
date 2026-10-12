import type {Env} from '../types';
import {getContainer} from './sandbox';
import {publishWorkspace,workspacePath} from '../lib/workspace-head';
import type {ProjectLease} from '../lib/project-control';
import type {TraceContext} from '../lib/observability-context';

// Read through directory file descriptors, reject links/special files, bound output.
// Generated processes never receive R2 or D1 credentials.
const EXPORT_SCRIPT = String.raw`import os,stat,json,sys
root=sys.argv[1]
files=[]
total=0
def walk(fd,prefix=''):
 global total
 for name in sorted(os.listdir(fd)):
  if name in ('node_modules','.git','.azrail-verify','dist','.next','coverage'): continue
  if name=='.env' or name.startswith('.env.'): raise RuntimeError('Secret-like file requires explicit export')
  st=os.stat(name,dir_fd=fd,follow_symlinks=False)
  if stat.S_ISLNK(st.st_mode): raise RuntimeError('Symbolic links cannot be exported')
  path=prefix+name
  if stat.S_ISDIR(st.st_mode):
   sub=os.open(name,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW,dir_fd=fd)
   try: walk(sub,path+'/')
   finally: os.close(sub)
  elif stat.S_ISREG(st.st_mode):
   if st.st_nlink!=1 or st.st_size>1048576: raise RuntimeError('Link or file size limit')
   child=os.open(name,os.O_RDONLY|os.O_NOFOLLOW,dir_fd=fd)
   with os.fdopen(child,'rb') as f: raw=f.read(1048577)
   total+=len(raw)
   if len(raw)>1048576 or total>2097152 or len(files)>=400: raise RuntimeError('Workspace export limit')
   files.append(dict(path=path,content=raw.decode('utf-8')))
  else: raise RuntimeError('Special files cannot be exported')
fd=os.open(root,os.O_RDONLY|os.O_DIRECTORY|os.O_NOFOLLOW)
try: walk(fd)
finally: os.close(fd)
print(json.dumps(files,separators=(',',':'),ensure_ascii=False))`;

export async function syncWorkspaceFromSandbox(env:Env,project:string,workdir:string,lease:ProjectLease,trace?:TraceContext) {
 if(!/^\/workspace\/runs\/[a-f0-9-]{36}$/.test(workdir))throw Error('Invalid export directory');
 const ns=getContainer(env);if(!ns)throw Error('Sandbox unavailable');
 const {getSandbox}=await import('@cloudflare/sandbox');const box=getSandbox(ns,project);
 const script=btoa(EXPORT_SCRIPT);
 const result=await box.exec(`python3 -c "import base64;exec(base64.b64decode('${script}'))" ${workdir}`,{timeout:15000});
 if(result.exitCode!==0)throw Error('Sandbox export rejected: '+result.stderr.slice(0,1000));
 const files=JSON.parse(result.stdout) as Array<{path:string;content:string}>;
 if(!Array.isArray(files)||files.length>400)throw Error('Invalid export manifest');
 for(const file of files){workspacePath(file.path);if(typeof file.content!=='string')throw Error('Invalid export content');}
 // Publish only after a complete, validated copy. Code rollback never rewinds D1 data.
 await publishWorkspace(env,project,files,lease,trace);
 return {files:files.length};
}
