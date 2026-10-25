import {readFileSync,existsSync,readdirSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';
const root=resolve(process.cwd(),'public');let errors=[];let htmls=[];
function walk(dir){for(const name of readdirSync(dir)){if(name.startsWith('.')||name==='node_modules')continue;const p=join(dir,name);if(statSync(p).isDirectory())walk(p);else if(p.endsWith('.html'))htmls.push(p);}}
walk(root);
for(const p of htmls){const s=readFileSync(p,'utf8');for(const m of s.matchAll(/(?:href|src)="(\/[^"#]*)(?:#[^"]*)?"/g)){const local=resolve(root,'.'+m[1]);if(!existsSync(local)&&!existsSync(join(local,'index.html')))errors.push(`${p}: missing ${m[1]}`);}if(!s.includes('name="viewport"'))errors.push(`${p}: viewport missing`);if((s.match(/<h1[ >]/g)||[]).length!==1)errors.push(`${p}: must have one h1`);}
for(const path of ['assets/InterVariable.woff2','assets/logo-dark.png','assets/brand-symbol.png','downloads/map-your-business-for-ai.pdf'])if(!existsSync(join(root,path)))errors.push(`Missing required asset: ${path}`);
if(errors.length){console.error(errors.join('\n'));process.exit(1);}console.log(`Checked ${htmls.length} pages: local links, required assets, viewport and heading structure passed.`);
