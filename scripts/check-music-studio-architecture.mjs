import {existsSync,readFileSync} from 'node:fs';
let failed=false;const fail=m=>{console.error('MUSIC STUDIO ARCHITECTURE FAIL:',m);failed=true;};const read=p=>readFileSync(p,'utf8');
if(!existsSync('migrations/023-professional-music-studio.sql'))fail('migration 023 missing');
const migration=read('migrations/023-professional-music-studio.sql'),schema=read('schema.sql'),lib=read('src/lib/music-studio.ts'),route=read('src/unified/studios.ts'),ui=read('ui/studio-modules/music.ts'),media=read('ui/media.ts'),codecs=read('ui/audio-codecs.ts'),drafts=read('src/unified/drafts.ts');
for(const marker of ['CREATE TABLE IF NOT EXISTS music_sessions','wav_artifact_id TEXT','midi_artifact_id TEXT','idx_music_sessions_project','ON DELETE SET NULL']){if(!migration.includes(marker))fail(`migration missing ${marker}`);if(!schema.includes(marker))fail(`schema missing ${marker}`);}
for(const marker of ['MUSIC_GENRES','MUSIC_MOODS','MUSIC_SCALES','MUSIC_TIME_SIGNATURES','MUSIC_PATTERNS','MUSIC_ARRANGEMENTS','MUSIC_SYNTH_PRESETS','parseMusicSessionRequest'])if(!lib.includes(marker))fail(`Music Studio backend contract missing ${marker}`);
for(const marker of ['/api/studio/music/sessions','requireMusicArtifact','INSERT INTO music_sessions','publication.music.session_saved'])if(!route.includes(marker))fail(`Music Studio route missing ${marker}`);
 for(const marker of ['Промпт','Genre','Mood','BPM','Key','Scale','Bars','Time signature','Pattern','Arrangement','Synth preset','>Generate<','Waveform','Piano Roll','Download WAV','Download AIFF','Download FLAC','Download MP3','Download MIDI','Save session','Sessions'])if(!ui.includes(marker))fail(`Music Studio UI missing ${marker}`);
for(const marker of ['composeMusicSession','renderMusicSession','OfflineAudioContext','audio/midi','arrangementLevel','waveformPeaks','timeSignature'])if(!media.includes(marker))fail(`Music engine missing ${marker}`);
if(!codecs.includes("type:'audio/wav'")&&!codecs.includes('audio/wav'))fail('studio WAV writer missing');
if(/env\.AI\.run|@cf\//.test(ui+media))fail('Music Studio local engine must not pretend to use an undocumented cloud music model');
for(const marker of ['bpm:32',"'music-key'","'music-scale'","'music-arrangement'","'music-synth'"])if(!drafts.includes(marker))fail(`Music draft contract missing ${marker}`);
 if(!route.includes("music:'local-wav-aiff-flac-mp3-midi'"))fail('capabilities must truthfully report local WAV, AIFF, FLAC, MP3 and MIDI');
if(!codecs.includes('new Encoder(pcm.channels,pcm.sampleRate,320)'))fail('finished MP3 must be 320 kbps');
if(!read('ui/media.ts').includes('wavFromChannels'))fail('studio WAV must be the 24-bit master');
if(failed)process.exit(1);console.log('MUSIC STUDIO ARCHITECTURE PASS: bounded local composition, arrangement, waveform/piano-roll, WAV/MIDI export and durable project-bound sessions are wired without fake provider claims.');
