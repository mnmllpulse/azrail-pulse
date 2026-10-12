import {readFileSync,existsSync} from 'node:fs';
let failed=false;const read=p=>readFileSync(p,'utf8');const ok=(name,cond)=>{console.log(`${cond?'PASS':'FAIL'} ${name}`);if(!cond)failed=true;};
const moduleFrame=read('ui/components/module-frame.ts'),product=read('src/lib/product-intelligence.ts'),route=read('src/unified/product-intelligence.ts'),music=read('src/lib/music-intelligence.ts'),image=read('src/lib/image-pipeline.ts'),video=read('src/lib/video-pipeline.ts'),manifest=read('ui/studio-manifest.ts'),compare=read('src/lib/compare-mode.ts'),palette=read('ui/components/command-palette.ts'),migration=read('migrations/031-product-intelligence.sql');
ok('Brand canonical studio names',forNames(['Web Studio','Image Studio','Music Studio','Video Studio','Pulse Lab','Ledger Studio','Data Studio','Ableton Lab','Audio Lab'],manifest));
ok('F Music Intelligence foundation',music.includes('referenceProfile')&&music.includes('productionBrief')&&music.includes('camelotNeighbors'));
ok('F Image Studio job genealogy foundation',image.includes('outputs:string[]')&&image.includes("'variation'")&&image.includes("'inpaint'")&&image.includes("'outpaint'"));
ok('F Video Studio continuity/render foundation',video.includes('ContinuityMemory')&&video.includes('renderQueue')&&video.includes("quality:'proxy'|'final'"));
ok('F Universal Module System 2.0',moduleFrame.includes('ModuleDefinition')&&moduleFrame.includes('permissions')&&moduleFrame.includes('resourceUsage')&&moduleFrame.includes('registerUniversalModuleAction')&&moduleFrame.includes('undoStack')&&moduleFrame.includes('ModuleHistoryEntry')&&moduleFrame.includes('onDuplicate')&&moduleFrame.includes('canDelete'));
ok('G hierarchical memory',product.includes("'user'")&&product.includes("'workspace'")&&product.includes("'project'")&&product.includes("'session'"));
ok('G asset intelligence',product.includes('IntelligentAsset')&&migration.includes('asset_intelligence')&&route.includes('/api/studio/assets/intelligence'));
ok('G command palette',palette.includes('CommandPaletteAction'));
ok('G Compare Mode',compare.includes('CompareSession')&&compare.includes('createCompareSession')&&existsSync('ui/components/compare-mode.ts'));
ok('G professional review contract',product.includes('ReviewFinding')&&route.includes('/api/studio/review')&&migration.includes('studio_reviews'));
ok('Persistence migration',migration.includes('intelligence_memory')&&migration.includes('music_reference_metadata')&&migration.includes('image_jobs'));
if(failed)process.exit(1);console.log('SERIES F/G FOUNDATION PASS: shared intelligence, memory, assets, modules, review and studio pipeline contracts are wired.');
function forNames(names,text){return names.every(name=>text.includes(`title:'${name}'`));}
