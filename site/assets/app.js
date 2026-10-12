(()=>{const modules={"src/lib/music-intelligence":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.camelotFor = camelotFor;
exports.camelotNeighbors = camelotNeighbors;
exports.buildEnergyScore = buildEnergyScore;
exports.referenceProfile = referenceProfile;
exports.productionBrief = productionBrief;
exports.chordTendencies = chordTendencies;
exports.manualSlices = manualSlices;
exports.autoStructure = autoStructure;
exports.musicLearningCoach = musicLearningCoach;
exports.buildCompositionPlan = buildCompositionPlan;
exports.reviewRenderIteration = reviewRenderIteration;
const CAMELOT_MINOR = { 'G#': '1A', 'D#': '2A', 'A#': '3A', 'F': '4A', 'C': '5A', 'G': '6A', 'D': '7A', 'A': '8A', 'E': '9A', 'B': '10A', 'F#': '11A', 'C#': '12A' };
const CAMELOT_MAJOR = { 'B': '1B', 'F#': '2B', 'C#': '3B', 'G#': '4B', 'D#': '5B', 'A#': '6B', 'F': '7B', 'C': '8B', 'G': '9B', 'D': '10B', 'A': '11B', 'E': '12B' };
const PITCHES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function camelotFor(root, mode) { return (mode === 'minor' ? CAMELOT_MINOR : CAMELOT_MAJOR)[root] ?? null; }
function camelotNeighbors(code) {
    const match = /^(\d{1,2})([AB])$/.exec(code);
    if (!match)
        return [];
    const n = Number(match[1]), side = match[2];
    if (n < 1 || n > 12)
        return [];
    const prev = n === 1 ? 12 : n - 1, next = n === 12 ? 1 : n + 1, other = side === 'A' ? 'B' : 'A';
    return [code, `${prev}${side}`, `${next}${side}`, `${n}${other}`];
}
function buildEnergyScore(metrics) {
    const values = [];
    if (Number.isFinite(metrics.integratedLufs))
        values.push(Math.max(0, Math.min(1, ((metrics.integratedLufs ?? -24) + 24) / 18)));
    if (Number.isFinite(metrics.onsetDensity))
        values.push(Math.max(0, Math.min(1, (metrics.onsetDensity ?? 0) / 8)));
    if (Number.isFinite(metrics.bassEnergy))
        values.push(Math.max(0, Math.min(1, metrics.bassEnergy ?? 0)));
    if (Number.isFinite(metrics.spectralCentroid))
        values.push(Math.max(0, Math.min(1, (metrics.spectralCentroid ?? 0) / 6000)));
    if (Number.isFinite(metrics.crestFactor))
        values.push(1 - Math.max(0, Math.min(1, (metrics.crestFactor ?? 12) / 24)) * .35);
    return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length * 100) : null;
}
function referenceProfile(analyses) {
    const bpm = analyses.map(a => a.metrics.bpm).filter((v) => Number.isFinite(v)), camelot = analyses.map(a => a.camelot).filter((v) => !!v), lufs = analyses.map(a => a.metrics.integratedLufs).filter((v) => Number.isFinite(v));
    const sectionBars = analyses.flatMap(a => a.sections.map(s => s.bars).filter((v) => Number.isFinite(v)));
    const counts = new Map();
    for (const key of camelot)
        counts.set(key, (counts.get(key) ?? 0) + 1);
    const commonCamelot = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key);
    return { tracks: analyses.length, bpmRange: bpm.length ? [Math.min(...bpm), Math.max(...bpm)] : null, bpmMedian: bpm.length ? [...bpm].sort((a, b) => a - b)[Math.floor(bpm.length / 2)] : null, camelot: [...new Set(camelot)], commonCamelot, lufsRange: lufs.length ? [Math.min(...lufs), Math.max(...lufs)] : null, typicalSectionBars: sectionBars.length ? Math.round(sectionBars.reduce((a, b) => a + b, 0) / sectionBars.length) : null };
}
function productionBrief(analysis) {
    const energy = buildEnergyScore(analysis.metrics), tempo = Number.isFinite(analysis.metrics.bpm) ? `${analysis.metrics.bpm} BPM` : 'Measure BPM from audio', key = analysis.metrics.keyRoot && analysis.metrics.mode ? `${analysis.metrics.keyRoot} ${analysis.metrics.mode}${analysis.camelot ? ` / Camelot ${analysis.camelot}` : ''}` : 'Measure key from audio';
    return { tempo, key, structure: analysis.sections.map(s => `${s.label}: ${s.bars ?? '?'} bars`).join('; ') || 'Define arrangement from original composition goals', energy: energy === null ? 'Measure from audio before setting target' : `${energy}/100 measured profile`, mixTarget: Number.isFinite(analysis.metrics.integratedLufs) ? `Reference loudness ${analysis.metrics.integratedLufs} LUFS; do not copy source content` : 'Set after measured render', doNotCopy: ['melodies', 'vocals', 'signature samples', 'exact arrangement'] };
}
function chordTendencies(profile, limit = 6) {
    if (!profile || profile.length !== 12 || !profile.some(Number.isFinite))
        return [];
    const values = profile.map(v => Number.isFinite(v) && v > 0 ? v : 0), sum = values.reduce((a, b) => a + b, 0);
    if (sum <= 0)
        return [];
    const normalized = values.map(v => v / sum), out = [];
    for (let root = 0; root < 12; root++)
        for (const mode of ['major', 'minor']) {
            const third = (root + (mode === 'major' ? 4 : 3)) % 12, fifth = (root + 7) % 12, triad = normalized[root] * .46 + normalized[third] * .30 + normalized[fifth] * .24, nonTriad = normalized.reduce((acc, v, i) => i === root || i === third || i === fifth ? acc : acc + v, 0), score = Math.max(0, Math.min(1, triad * (1 - nonTriad * .25) * 3));
            out.push({ label: `${PITCHES[root]} ${mode}`, root: PITCHES[root], mode, score: Math.round(score * 1000) / 1000 });
        }
    return out.sort((a, b) => b.score - a.score).slice(0, Math.max(1, Math.min(12, limit)));
}
function manualSlices(durationSeconds, bpm, barsPerSlice = 16) {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0)
        return [];
    const sliceSeconds = Number.isFinite(bpm) && bpm > 0 ? Math.max(1, barsPerSlice * 4 * 60 / bpm) : Math.max(10, Math.min(30, durationSeconds / 8));
    const out = [];
    let i = 0;
    for (let start = 0; start < durationSeconds - 1e-6; start += sliceSeconds) {
        const end = Math.min(durationSeconds, start + sliceSeconds);
        out.push({ id: `manual-${i + 1}`, label: `Part ${i + 1}`, kind: 'custom', startSeconds: start, endSeconds: end, bars: Number.isFinite(bpm) && bpm > 0 ? Math.max(1, Math.round((end - start) * bpm / 240)) : undefined, confidence: 1, method: 'manual-bars' });
        i++;
    }
    return out;
}
function autoStructure(windows, durationSeconds, bpm) {
    if (!windows.length || !Number.isFinite(durationSeconds) || durationSeconds <= 0)
        return [];
    const measured = windows.map(w => w.energy).filter((v) => Number.isFinite(v));
    if (!measured.length)
        return manualSlices(durationSeconds, bpm, 16).map((s, i, a) => ({ ...s, kind: i === 0 ? 'intro' : i === a.length - 1 ? 'outro' : 'custom', label: i === 0 ? 'Intro' : i === a.length - 1 ? 'Outro' : s.label, method: 'timed-fallback', confidence: .35 }));
    const sorted = [...measured].sort((a, b) => a - b), low = sorted[Math.floor((sorted.length - 1) * .3)], high = sorted[Math.floor((sorted.length - 1) * .72)];
    const raw = windows.map((w, i) => { const prev = i ? w.energy : null, next = i + 1 < windows.length ? windows[i + 1].energy : null; let kind = 'groove'; if (i === 0)
        kind = 'intro';
    else if (i === windows.length - 1)
        kind = 'outro';
    else if (w.energy !== null && w.energy >= high)
        kind = 'drop';
    else if (w.energy !== null && w.energy <= low)
        kind = 'breakdown';
    else if (w.energy !== null && prev !== null && next !== null && next - w.energy >= 9 && w.energy - prev >= -3)
        kind = 'build';
    else if (w.energy !== null && prev !== null && w.energy - prev >= 12)
        kind = 'pre-drop';
    else if (i > windows.length * .62)
        kind = 'bridge'; const labels = { intro: 'Intro', groove: 'Groove', build: 'Build', breakdown: 'Breakdown', 'pre-drop': 'Pre-drop', drop: 'Drop', bridge: 'Bridge', outro: 'Outro', custom: 'Part' }; return { id: `auto-${i + 1}`, label: labels[kind], kind, startSeconds: w.startSeconds, endSeconds: w.endSeconds, bars: Number.isFinite(bpm) && bpm > 0 ? Math.max(1, Math.round((w.endSeconds - w.startSeconds) * bpm / 240)) : undefined, metrics: w.metrics, confidence: .58, method: 'measured-window-energy-heuristic' }; });
    const merged = [];
    for (const part of raw) {
        const last = merged[merged.length - 1];
        if (last && last.kind === part.kind && Math.abs(last.endSeconds - part.startSeconds) < .05) {
            last.endSeconds = part.endSeconds;
            last.bars = (last.bars ?? 0) + (part.bars ?? 0);
            last.confidence = Math.min(last.confidence ?? .58, part.confidence ?? .58);
        }
        else
            merged.push({ ...part, id: `segment-${merged.length + 1}` });
    }
    return merged;
}
function musicLearningCoach(previous, next) {
    const deltas = [];
    const push = (metric, a, b, unit) => { deltas.push({ metric, before: Number.isFinite(a) ? a : null, after: Number.isFinite(b) ? b : null, delta: Number.isFinite(a) && Number.isFinite(b) ? b - a : null, unit }); };
    push('LUFS', previous.metrics.integratedLufs, next.metrics.integratedLufs, 'LU');
    push('True peak', previous.metrics.truePeakDb, next.metrics.truePeakDb, 'dB');
    push('Stereo width', previous.metrics.stereoWidth, next.metrics.stereoWidth, '%');
    push('Crest factor', previous.metrics.crestFactor, next.metrics.crestFactor, 'dB');
    push('Spectral centroid', previous.metrics.spectralCentroid, next.metrics.spectralCentroid, 'Hz');
    const recommendations = [];
    if (Number.isFinite(next.metrics.truePeakDb) && next.metrics.truePeakDb > -1)
        recommendations.push('Оставить больше true-peak headroom перед финальным master.');
    if (Number.isFinite(next.metrics.integratedLufs) && next.metrics.integratedLufs > -6)
        recommendations.push('Проверить динамику: loudness очень высокий для диагностического reference-профиля.');
    if (Number.isFinite(next.metrics.correlation) && next.metrics.correlation < 0)
        recommendations.push('Проверить mono compatibility: корреляция уходит ниже нуля.');
    if (previous.sections.length && next.sections.length && next.sections.some(s => s.kind === 'breakdown' && (s.bars ?? 0) > 32))
        recommendations.push('Проверить длину breakdown: сегмент превышает 32 bars.');
    if (!recommendations.length)
        recommendations.push('Существенных инженерных красных флагов по доступным измерениям не обнаружено; проверьте музыкальное решение на слух и в контексте arrangement.');
    return { from: previous.fileName, to: next.fileName, deltas, recommendations: recommendations.slice(0, 3), note: 'Coach использует только измеренные метрики и структурные эвристики; он не присваивает субъективную оценку художественного качества.' };
}
function buildCompositionPlan(analysis) {
    const mode = analysis.metrics.mode ?? 'minor', progression = mode === 'minor' ? ['i', 'VI', 'III', 'VII'] : ['I', 'V', 'vi', 'IV'];
    const energy = buildEnergyScore(analysis.metrics), sections = analysis.sections.length ? analysis.sections : [{ id: 'plan-1', label: 'Intro', kind: 'intro', startSeconds: 0, endSeconds: 0, bars: 16 }, { id: 'plan-2', label: 'Groove', kind: 'groove', startSeconds: 0, endSeconds: 0, bars: 32 }, { id: 'plan-3', label: 'Breakdown', kind: 'breakdown', startSeconds: 0, endSeconds: 0, bars: 16 }, { id: 'plan-4', label: 'Drop', kind: 'drop', startSeconds: 0, endSeconds: 0, bars: 32 }, { id: 'plan-5', label: 'Outro', kind: 'outro', startSeconds: 0, endSeconds: 0, bars: 16 }];
    return { sourceTrack: analysis.fileName, tempo: analysis.metrics.bpm, key: analysis.metrics.keyRoot && analysis.metrics.mode ? `${analysis.metrics.keyRoot} ${analysis.metrics.mode}` : null, camelot: analysis.camelot, chordProgression: progression, arrangement: sections.map(section => ({ section: section.label, bars: Number.isFinite(section.bars) ? section.bars : null, energy: section.metrics ? buildEnergyScore(section.metrics) : energy })), parts: { bass: ['Root-focused original MIDI pattern', 'Vary octave/rhythm by section energy'], arp: ['Use scale degrees from the new progression', 'Change register and gate across sections'], lead: ['Create a new motif; do not reproduce reference melody'], pads: ['Voice the plan progression with independent inversions'], drums: ['Four-on-the-floor foundation where genre-appropriate', 'Vary percussion density with measured energy curve'], fx: ['Independent risers/noise/impacts around structural transitions'], transitions: ['Create transitions at section boundaries, not copied from source'], automation: ['Filter/level movement follows section energy', 'Keep automation values original to the new project'] }, originalityGuard: ['Do not copy melodies', 'Do not copy vocals', 'Do not reuse signature samples', 'Do not reproduce exact reference arrangement'], method: 'feature-abstraction-to-original-composition-plan' };
}
function reviewRenderIteration(analysis, target = {}) {
    const checks = [], actions = [];
    const push = (code, ok, measured, targetText, action) => { checks.push({ code, status: ok ? 'pass' : 'review', measured, target: targetText, ...(!ok && action ? { action } : {}) }); if (!ok && action)
        actions.push(action); };
    const bpm = analysis.metrics.bpm;
    if (Number.isFinite(target.bpm) && Number.isFinite(bpm))
        push('tempo', Math.abs(bpm - target.bpm) <= 1, `${bpm.toFixed(1)} BPM`, `${target.bpm.toFixed(1)} BPM`, 'Re-check transient grid or rerender with the target tempo.');
    if (target.keyRoot && target.mode && analysis.metrics.keyRoot && analysis.metrics.mode)
        push('key', analysis.metrics.keyRoot === target.keyRoot && analysis.metrics.mode === target.mode, `${analysis.metrics.keyRoot} ${analysis.metrics.mode}`, `${target.keyRoot} ${target.mode}`, 'Review tonal center before the next render; do not force a key label when confidence is low.');
    const peak = analysis.metrics.truePeakDb;
    if (Number.isFinite(peak))
        push('true_peak', peak <= -1, `${peak.toFixed(2)} dBTP`, '≤ -1.00 dBTP', 'Lower render/master gain before the next iteration.');
    const lufs = analysis.metrics.integratedLufs;
    if (Number.isFinite(target.targetLufs) && Number.isFinite(lufs))
        push('loudness', Math.abs(lufs - target.targetLufs) <= 1.5, `${lufs.toFixed(1)} LUFS`, `${target.targetLufs.toFixed(1)} LUFS ±1.5`, 'Adjust gain/dynamics toward the explicit project target, not toward a reference by copying its master.');
    const corr = analysis.metrics.correlation;
    if (Number.isFinite(corr))
        push('mono_compatibility', corr >= 0, `${corr.toFixed(2)} correlation`, '≥ 0', 'Reduce phase-opposed stereo processing and verify in mono.');
    const width = analysis.metrics.stereoWidth;
    if (Number.isFinite(width))
        push('stereo_width', width <= 100, `${width.toFixed(1)}%`, '≤ 100% diagnostic range', 'Review extreme stereo width before the next render.');
    if (!checks.length)
        actions.push('Analyze a real rendered audio file before evaluating the iteration.');
    if (!actions.length)
        actions.push('No measured engineering blocker found; continue with listening review and the next creative iteration.');
    return { passed: checks.length > 0 && checks.every(c => c.status === 'pass'), checks, nextActions: [...new Set(actions)].slice(0, 6), method: 'measured-render-review' };
}

},
"ui/ableton-lab":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderAbletonReport = renderAbletonReport;
exports.renderAbletonHistory = renderAbletonHistory;
const media_1 = require("./media");
const el = (tag, className = '', text = '') => { const node = document.createElement(tag); if (className)
    node.className = className; if (text)
    node.textContent = text; return node; };
const fmt = (v, digits = 2) => typeof v === 'number' && Number.isFinite(v) ? String(Math.round(v * 10 ** digits) / 10 ** digits) : '—';
const yesNo = (value) => value === null ? '—' : value ? 'Да' : 'Нет';
const safe = (s) => s?.trim() || '—';
function metric(label, value, note = '') { const card = el('div', 'ableton-metric'); card.append(el('small', '', label), el('strong', '', value)); if (note)
    card.append(el('span', '', note)); return card; }
function section(title, subtitle = '') { const node = el('section', 'ableton-section'), head = el('div', 'section-heading'); head.append(el('h3', '', title)); if (subtitle)
    head.append(el('span', '', subtitle)); node.append(head); return node; }
function table(headers, rows) { const wrap = el('div', 'table-wrap'), t = el('table'), thead = el('thead'), hr = el('tr'); headers.forEach(h => hr.append(el('th', '', h))); thead.append(hr); t.append(thead); const body = el('tbody'); rows.forEach(values => { const r = el('tr'); values.forEach(v => r.append(el('td', '', v))); body.append(r); }); t.append(body); wrap.append(t); return wrap; }
function issueList(title, items) { const box = el('div', 'ableton-check'), head = el('div', 'ableton-check-head'); head.append(el('strong', '', title), el('span', items.length ? 'warn' : 'ok', String(items.length))); box.append(head); if (!items.length) {
    box.append(el('p', 'muted', 'Не обнаружено по доступным метаданным ALS.'));
    return box;
} const ul = el('ul'); for (const item of items.slice(0, 80)) {
    const li = el('li');
    const prefix = [item.track, item.device].filter(Boolean).join(' · ');
    li.textContent = `${prefix ? prefix + ': ' : ''}${item.detail}${item.heuristic ? ' (эвристика)' : ''}`;
    ul.append(li);
} box.append(ul); if (items.length > 80)
    box.append(el('p', 'muted', `Показано 80 из ${items.length}. Полный список есть в JSON report.`)); return box; }
function renderAbletonReport(host, report, fileName = 'Ableton Live Set') {
    host.replaceChildren();
    const shell = el('div', 'ableton-report');
    const head = el('div', 'ableton-report-head');
    const headText = el('div');
    headText.append(el('small', '', 'ABLETON LIVE SET ANALYSIS'), el('strong', '', fileName));
    head.append(headText, el('span', 'runtime-chip', report.saved ? 'Сохранено в проекте' : 'Только анализ'));
    shell.append(head);
    const grid = el('div', 'ableton-metric-grid');
    grid.append(metric('BPM', fmt(report.bpm, 2)), metric('Time signature', safe(report.timeSignature)), metric('Scenes', String(report.sceneCount)), metric('Tracks', String(report.trackCount), `${report.groups} groups`), metric('Clips', String(report.summary.clips)), metric('Devices', String(report.summary.devices), `${report.summary.plugins} plugins`), metric('Automation', String(report.summary.automationEnvelopes), 'envelopes'), metric('Samples', String(report.summary.samples)), metric('Issues', String(report.summary.issues), report.summary.issues ? 'review suggested' : 'no explicit blockers'));
    shell.append(grid);
    const tracks = section('Tracks', 'Clips · Devices · Plugins · Automation · Routing');
    tracks.append(table(['Track', 'Type', 'Group', 'Clips', 'Devices', 'Plugins', 'Automation', 'Frozen', 'Volume', 'Pan'], report.tracks.map(t => [t.name, t.type, t.groupId === null ? '—' : String(t.groupId), String(t.clipCount), String(t.deviceCount), String(t.pluginCount), String(t.automationEnvelopeCount), t.frozen ? 'Да' : 'Нет', fmt(t.volume, 3), fmt(t.pan, 3)])));
    shell.append(tracks);
    const devices = section('Devices & Plugins', 'Per-track chains');
    const deviceGrid = el('div', 'ableton-device-grid');
    for (const track of report.tracks.filter(t => t.devices.length).slice(0, 120)) {
        const card = el('article', 'ableton-device-card');
        card.append(el('strong', '', track.name), el('small', '', `${track.devices.length} devices · ${track.pluginCount} plugins`));
        const list = el('div', 'ableton-device-list');
        for (const d of track.devices.slice(0, 40)) {
            const row = el('div', 'ableton-device-row');
            row.append(el('span', '', d.name), el('small', '', `${d.plugin ? 'PLUGIN · ' : ''}${d.active === false ? 'OFF · ' : ''}${d.cpuHeavy ? 'CPU? · ' : ''}${d.type}`));
            list.append(row);
        }
        card.append(list);
        deviceGrid.append(card);
    }
    if (!deviceGrid.children.length)
        deviceGrid.append(el('p', 'muted', 'Device chains не найдены в распознанных контейнерах.'));
    devices.append(deviceGrid);
    shell.append(devices);
    const routing = section('Routing & Sidechain', 'Resolvable topology from stored ALS metadata');
    routing.append(table(['Track', 'Routing', 'Target'], report.tracks.flatMap(t => t.routing.map(r => [t.name, r.kind, r.target]))));
    if (report.checks.sidechainTopology.length)
        routing.append(table(['Track', 'Device', 'Source', 'Enabled'], report.checks.sidechainTopology.map(s => [s.track, s.device, safe(s.source), yesNo(s.enabled)])));
    else
        routing.append(el('p', 'muted', 'Явные sidechain-узлы не найдены.'));
    shell.append(routing);
    const media = section('Samples & Missing media', 'FileRef inventory; local filesystem is not probed');
    media.append(table(['Sample', 'Path', 'Refs', 'Status'], report.samples.slice(0, 500).map(s => [s.name, safe(s.path), String(s.references), s.missing ? 'Missing / unavailable' : 'Referenced'])));
    if (report.samples.length > 500)
        media.append(el('p', 'muted', `Показано 500 из ${report.samples.length} sample references.`));
    shell.append(media);
    const master = section('Master chain', 'Stored devices on Master/Main track');
    if (report.masterChain.length)
        master.append(table(['Device', 'Type', 'Plugin', 'Active', 'CPU heuristic'], report.masterChain.map(d => [d.name, d.type, d.plugin ? 'Да' : 'Нет', yesNo(d.active), d.cpuHeavy ? 'Проверить' : '—'])));
    else
        master.append(el('p', 'muted', 'Master chain devices не найдены в распознанном контейнере.'));
    shell.append(master);
    const checks = section('Project checks', 'Missing media/plugins + topology + performance heuristics');
    const checkGrid = el('div', 'ableton-check-grid');
    checkGrid.append(issueList('Missing plugins', report.checks.missingPlugins), issueList('Missing samples', report.checks.missingSamples), issueList('Duplicated processing', report.checks.duplicatedProcessing), issueList('Routing loops', report.checks.routingLoops), issueList('Gain staging warnings', report.checks.gainStagingWarnings), issueList('CPU-heavy devices', report.checks.cpuHeavyDevices), issueList('Frozen tracks', report.checks.frozenTracks), issueList('Inactive devices', report.checks.inactiveDevices));
    checks.append(checkGrid);
    const sidechain = el('div', 'ableton-check');
    const sideHead = el('div', 'ableton-check-head');
    sideHead.append(el('strong', '', 'Sidechain topology'), el('span', report.checks.sidechainTopology.length ? 'live' : 'ok', String(report.checks.sidechainTopology.length)));
    sidechain.append(sideHead);
    if (report.checks.sidechainTopology.length)
        sidechain.append(table(['Track', 'Device', 'Source'], report.checks.sidechainTopology.map(s => [s.track, s.device, safe(s.source)])));
    else
        sidechain.append(el('p', 'muted', 'Явные sidechain connections не обнаружены.'));
    checks.append(sidechain);
    shell.append(checks);
    const notes = section('Analysis boundary', 'What the ALS file can and cannot prove');
    const ul = el('ul', 'ableton-boundary');
    for (const note of report.analysisBoundary)
        ul.append(el('li', '', note));
    for (const warning of report.warnings)
        ul.append(el('li', 'warning-note', warning));
    if (report.reportTruncated)
        ul.append(el('li', 'warning-note', 'Сохранённая history-копия отчёта была компактирована; текущий live report содержит больше деталей.'));
    notes.append(ul);
    shell.append(notes);
    const actions = el('div', 'toolbar');
    const json = el('button', '', 'Export Report JSON');
    json.type = 'button';
    json.onclick = () => (0, media_1.download)(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }), 'azrail-ableton-analysis.json');
    actions.append(json);
    if (report.sourceArtifactId) {
        const source = el('button', '', 'Download source ALS');
        source.type = 'button';
        source.dataset.artifactId = report.sourceArtifactId;
        actions.append(source);
    }
    shell.append(actions);
    host.append(shell);
    return { sourceButton: actions.querySelector('button[data-artifact-id]') };
}
async function renderAbletonHistory(context) {
    const host = context.controls.querySelector('#ableton-history');
    if (!host)
        return;
    if (!context.account) {
        host.innerHTML = '<p class="muted">Войдите, чтобы видеть сохранённые ALS analyses.</p>';
        return;
    }
    const query = context.projectId ? `?projectId=${encodeURIComponent(context.projectId)}` : '';
    const response = await context.api('/api/studio/als/reports' + query);
    host.replaceChildren();
    if (!response.items.length) {
        host.append(el('p', 'muted', 'Сохранённых ALS analyses пока нет.'));
        return;
    }
    for (const item of response.items) {
        const card = el('article', 'ableton-history-card'), body = el('div');
        body.append(el('strong', '', item.fileName), el('small', '', `${item.trackCount} tracks · ${item.sceneCount} scenes · ${item.issueCount} issues`), el('span', 'muted', `${new Date(item.createdAt).toLocaleString()}${item.abletonVersion ? ' · ' + item.abletonVersion : ''}`));
        const actions = el('div', 'ableton-history-actions');
        const load = el('button', '', 'Open report');
        load.type = 'button';
        load.onclick = () => { const rendered = renderAbletonReport(context.result, { ...item.report, reportTruncated: item.reportTruncated }, item.fileName); if (rendered.sourceButton && item.sourceArtifactId)
            rendered.sourceButton.onclick = () => context.blobAPI(`/api/studio/artifacts/${item.sourceArtifactId}`).then(blob => (0, media_1.download)(blob, item.fileName)).catch(context.failure); };
        actions.append(load);
        if (item.sourceArtifactId) {
            const source = el('button', '', 'ALS');
            source.type = 'button';
            source.onclick = () => context.blobAPI(`/api/studio/artifacts/${item.sourceArtifactId}`).then(blob => (0, media_1.download)(blob, item.fileName)).catch(context.failure);
            actions.append(source);
        }
        card.append(body, actions);
        host.append(card);
    }
}

},
"ui/app":function(module,exports,require){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mission_view_1 = require("./mission-view");
const studio_draft_1 = require("./studio-draft");
const navigation_1 = require("./navigation");
const studio_registry_1 = require("./studio-registry");
const event_stream_1 = require("./event-stream");
const projects_1 = require("./projects");
const attachment_manager_1 = require("./attachment-manager");
const suggestions_1 = require("./components/suggestions");
const studio_toolbar_1 = require("./components/studio-toolbar");
const studio_state_1 = require("./components/studio-state");
const smart_empty_1 = require("./components/smart-empty");
const module_frame_1 = require("./components/module-frame");
const error_recovery_1 = require("./components/error-recovery");
const voice_input_1 = require("./components/voice-input");
const command_palette_1 = require("./components/command-palette");
const metatron_lab_1 = require("./metatron-lab");
const universal_compare_1 = require("./components/universal-compare");
const $ = (id) => document.getElementById(id);
const local = !/^https?:$/.test(location.protocol);
let account = null, project = '', mission = '', pollTimer = 0, epoch = 0, studioEpoch = 0, mediaCleanup = () => { }, lastBlob = null;
let draftCleanup = () => { }, studioChromeCleanup = () => { }, pollFailures = 0, missionSubmitting = false, studioRun = 0;
let preferredModel = '';
let stopEventStream = () => { }, streamProject = '';
let activeStudioModule = null, activeStudioContext = null;
let metatronCleanup = () => { };
// Токен-вход: единственный способ войти без регистрации OAuth-приложения у
// провайдера OIDC. Один и тот же заголовок Authorization принимает и общий
// bootstrap-секрет AZRAIL_TOKEN (роль admin, см. lib/auth.ts), и выданный
// администратором персональный ключ az_... (lib/accounts.ts) — выбор формата
// токена не касается интерфейса. Хранится только в sessionStorage текущей
// вкладки: closeTab = выход, как и у остальных локальных черновиков здесь.
let authToken = '', oidcConfigured = true;
const prompt = $('prompt');
const composer = $('composer'), missionPanel = $('mission-panel');
const composerHome = document.createComment('composer-home'), missionHome = document.createComment('mission-home');
composer.before(composerHome);
missionPanel.before(missionHome);
const navigation = (0, navigation_1.createNavigation)(renderRoute);
let attachmentRefs = [], pending = null;
const attachmentManager = (0, attachment_manager_1.createAttachmentManager)({ root: $('attachment-manager'), input: $('attachments'), getProjectId: () => project, api, failure, onChange: refs => { attachmentRefs = refs; $('attachment-names').textContent = refs.length ? `${refs.length} файл(ов) готово` : ''; } });
function clearAttachments() { attachmentRefs = []; attachmentManager.clear(); $('attachment-names').textContent = ''; }
try {
    pending = JSON.parse(sessionStorage.getItem('pulse.pending') ?? 'null');
    project = sessionStorage.getItem('pulse.project') ?? '';
    mission = sessionStorage.getItem('pulse.mission') ?? '';
    authToken = sessionStorage.getItem('pulse.token') ?? '';
    preferredModel = sessionStorage.getItem('pulse.preferredModel') ?? '';
}
catch { }
function remember() { try {
    if (pending)
        sessionStorage.setItem('pulse.pending', JSON.stringify(pending));
    else
        sessionStorage.removeItem('pulse.pending');
    sessionStorage.setItem('pulse.project', project);
    sessionStorage.setItem('pulse.mission', mission);
}
catch { } }
function setPreferredModel(model) { preferredModel = model; try {
    if (model)
        sessionStorage.setItem('pulse.preferredModel', model);
    else
        sessionStorage.removeItem('pulse.preferredModel');
}
catch { } }
let noticeTimer = 0;
function notice(message, persist = false) { clearTimeout(noticeTimer); $('notice-text').textContent = message; $('notice').hidden = false; if (!persist)
    noticeTimer = window.setTimeout(() => { $('notice').hidden = true; }, 6500); }
$('notice-close').onclick = () => { clearTimeout(noticeTimer); $('notice').hidden = true; };
function failure(e) { notice(e instanceof Error ? e.message : String(e), true); }
class APIError extends Error {
    status;
    code;
    body;
    constructor(message, status, code, body) {
        super(message);
        this.status = status;
        this.code = code;
        this.body = body;
    }
}
async function api(path, options = {}) {
    if (local)
        throw Error('Этот файл показывает интерфейс и локальные студии. Для AI и проектов откройте развёрнутое приложение.');
    const headers = new Headers(options.headers);
    if (typeof options.body === 'string' && !headers.has('Content-Type'))
        headers.set('Content-Type', 'application/json');
    if (authToken && !headers.has('Authorization'))
        headers.set('Authorization', 'Bearer ' + authToken);
    const r = await fetch(path, { ...options, credentials: 'same-origin', headers, signal: options.signal ?? AbortSignal.timeout(90000) });
    if (r.status === 204)
        return null;
    if (r.status === 401 && authToken) {
        authToken = '';
        try {
            sessionStorage.removeItem('pulse.token');
        }
        catch { }
        account = null;
    }
    const text = await r.text();
    let body;
    try {
        body = JSON.parse(text);
    }
    catch { }
    if (!r.ok)
        throw new APIError(typeof body?.error === 'string' ? body.error : `Сервис вернул ошибку ${r.status}. Повторите позже.`, r.status, body?.code, body);
    if (body === undefined)
        throw Error('Сервис вернул неполный ответ. Статус операции требует проверки.');
    return body;
}
async function blobAPI(path) { const headers = new Headers(); if (authToken)
    headers.set('Authorization', 'Bearer ' + authToken); const r = await fetch(path, { credentials: 'same-origin', headers, signal: AbortSignal.timeout(90000) }); if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new APIError(j.error ?? 'Не удалось скачать файл.', r.status);
} return r.blob(); }
function bind(id, fn) { $(id).onclick = () => Promise.resolve().then(fn).catch(failure); }
function dialog(title, html) { $('dialog-title').textContent = title; const content = $('dialog-content'); content.innerHTML = html; $('dialog').showModal(); return content; }
async function openAssetIntelligence() {
    if (!account)
        throw Error('Войдите, чтобы открыть Asset Intelligence Library.');
    const root = dialog('Asset Intelligence Library', '<p class="muted">Загрузка…</p>');
    const query = project ? `?projectId=${encodeURIComponent(project)}` : '';
    const response = await api('/api/studio/assets/intelligence' + query);
    root.replaceChildren();
    if (!response.items.length) {
        root.textContent = 'Артефактов пока нет.';
        return;
    }
    const summary = document.createElement('p');
    summary.className = 'context-note';
    summary.textContent = 'Единая библиотека: metadata · tags · project links · version lineage · analysis · usage history. Embedding остаётся evidence-backed: пустой embeddingRef не выдаётся за семантический индекс.';
    root.append(summary);
    const list = document.createElement('div');
    list.className = 'cards';
    for (const item of response.items.slice(0, 120)) {
        const card = document.createElement('article');
        card.className = 'card';
        const h = document.createElement('h3');
        h.textContent = item.name;
        const meta = document.createElement('p');
        meta.className = 'muted';
        meta.textContent = `${item.kind ?? 'unclassified'} · ${item.mime} · ${Math.max(1, Math.ceil(item.bytes / 1024))} KB${item.studioId ? ` · ${item.studioId}` : ''}`;
        const tags = document.createElement('p');
        tags.textContent = (item.tags ?? []).join(' · ') || 'Без тегов';
        const evidence = document.createElement('small');
        evidence.textContent = `projects: ${(item.projectLinks ?? []).join(', ') || '—'} · version of: ${item.versionOf ?? '—'} · usage: ${item.usageCount} · embedding: ${item.embeddingRef ?? 'not indexed'}`;
        card.append(h, meta, tags, evidence);
        const detail = { metadata: item.metadata ?? {}, analysis: item.analysis ?? {}, usageHistory: (item.usageHistory ?? []).slice(-12) };
        if (Object.keys(detail.metadata).length || Object.keys(detail.analysis).length || detail.usageHistory.length) {
            const pre = document.createElement('pre');
            pre.textContent = JSON.stringify(detail, null, 2);
            card.append(pre);
        }
        list.append(card);
    }
    root.append(list);
}
async function openGlobalMemory() {
    if (!account)
        throw Error('Войдите, чтобы открыть Global Memory.');
    const query = project ? `&projectId=${encodeURIComponent(project)}` : '';
    const root = dialog('Global Project Memory', '<p class="muted">Загрузка…</p>');
    const response = await api(`/api/studio/intelligence/memory?scope=all${query}`);
    root.replaceChildren();
    const note = document.createElement('p');
    note.className = 'context-note';
    note.textContent = 'AZRAIL Memory → User → Workspace → Project → Music/Image/Video → Agent → Session. Каждая запись показывает why stored, scope, TTL, source и confidence.';
    root.append(note);
    if (!response.items.length) {
        root.append(document.createTextNode('Память пока пуста.'));
        return;
    }
    const scopes = response.hierarchy ?? ['user', 'workspace', 'project', 'music', 'image', 'video', 'agent', 'session'];
    for (const scope of scopes) {
        const items = response.items.filter(item => item.scope === scope);
        if (!items.length)
            continue;
        const section = document.createElement('section');
        section.className = 'card';
        const title = document.createElement('h3');
        title.textContent = scope.toUpperCase();
        section.append(title);
        for (const item of items.slice(0, 40)) {
            const row = document.createElement('article');
            row.className = 'memory-row';
            const head = document.createElement('strong');
            head.textContent = item.key;
            const policy = document.createElement('small');
            const ttl = item.expiresAt ? Math.max(0, Math.ceil((item.expiresAt - Date.now()) / 86400000)) + 'd' : 'persistent';
            policy.textContent = `source: ${item.source} · confidence: ${Math.round(item.confidence * 100)}% · TTL: ${ttl} · why: ${item.whyStored}`;
            const pre = document.createElement('pre');
            pre.textContent = JSON.stringify(item.value, null, 2);
            row.append(head, policy, pre);
            if (account.role !== 'viewer') {
                const del = document.createElement('button');
                del.type = 'button';
                del.className = 'text-button';
                del.textContent = 'Forget';
                del.onclick = () => api(`/api/studio/intelligence/memory?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' }).then(() => openGlobalMemory()).catch(failure);
                row.append(del);
            }
            section.append(row);
        }
        root.append(section);
    }
}
async function openSystemHistory() {
    if (!account)
        throw Error('Войдите, чтобы открыть System History.');
    if (!project)
        throw Error('Сначала выберите проект.');
    const root = dialog('System History / Undo', '<p class="muted">Загрузка…</p>');
    const response = await api(`/api/studio/system/history?projectId=${encodeURIComponent(project)}`);
    root.replaceChildren();
    const note = document.createElement('p');
    note.className = 'context-note';
    note.textContent = 'История — immutable evidence. Event-level Undo по умолчанию fail-closed; восстановление выполняется только через доказанный Project Version / subsystem snapshot flow и создаёт новую revision.';
    const versions = document.createElement('button');
    versions.type = 'button';
    versions.className = 'text-button';
    versions.textContent = 'Open Project Version History';
    versions.onclick = () => { $('dialog').close(); $('project-history').click(); };
    root.append(note, versions);
    const list = document.createElement('div');
    list.className = 'cards';
    for (const item of response.items.slice(0, 160)) {
        const card = document.createElement('article');
        card.className = 'card';
        const h = document.createElement('strong');
        h.textContent = item.summary;
        const meta = document.createElement('small');
        meta.textContent = `${item.domain} · ${item.source} · ${new Date(item.createdAt).toLocaleString()}`;
        const undo = document.createElement('p');
        undo.className = 'muted';
        undo.textContent = item.undoable ? `UNDO AVAILABLE: ${item.undoHint ?? ''}` : `NO AUTO-UNDO: ${item.undoHint ?? ''}`;
        card.append(h, meta, undo);
        list.append(card);
    }
    if (!response.items.length)
        list.append(document.createTextNode('История пока пуста.'));
    root.append(list);
}
async function openSystemReadiness() {
    if (!account)
        throw Error('Войдите, чтобы открыть Series G readiness.');
    const root = dialog('Series G · Browser QA / Real E2E', '<p class="muted">Загрузка…</p>');
    const r = await api('/api/studio/system/readiness');
    root.replaceChildren();
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(r, null, 2);
    const note = document.createElement('p');
    note.className = 'context-note';
    note.textContent = r.browserQA?.realBrowserConfigured ? 'Browser binding configured; live proof всё равно требует deployed authenticated target.' : 'Real browser binding не настроен: static preview QA не считается real-browser PASS.';
    root.append(note, pre);
}
async function loadSystemSuggestions(context) {
    if (local || !account)
        return [];
    try {
        const r = await api('/api/studio/system/suggestions', { method: 'POST', body: JSON.stringify({ ...context, projectId: project || context.projectId }) });
        return r.items ?? [];
    }
    catch {
        return [];
    }
}
async function openCompareCenter() {
    if (!account)
        throw Error('Войдите, чтобы открыть Compare Mode.');
    await (0, universal_compare_1.openUniversalCompareCenter)({ api, blobAPI, dialog, notice, projectId: project, studioId: activeStudioContext?.meta.id });
}
async function startProfessionalReviewMission() {
    const context = activeStudioContext;
    if (!context?.startMission)
        throw Error('Откройте Studio с активным mission workflow.');
    await context.startMission(`Проведи Professional Review текущего результата в ${context.meta.title}. Используй только доступные evidence/измерения и не придумывай PASS. Классифицируй findings строго как Critical, Major, Minor или Improvement. Для каждого finding укажи code, message, target и safeAutoFix=true только если исправление локальное, обратимое и не требует deploy/push/внешней мутации. Сохрани структурированный review через существующий /api/studio/review для текущего project/studio, если этот внутренний маршрут доступен агенту. Ничего не исправляй до отдельного выбора пользователя.`);
}
async function startSafeReviewRepair(item, mode) {
    const context = activeStudioContext;
    if (!context?.startMission || context.meta.id !== item.studioId)
        throw Error(`Откройте ${(0, studio_registry_1.studioById)(item.studioId)?.title ?? item.studioId}, затем повторите действие.`);
    const candidates = item.findings.filter(f => f.safeAutoFix === true && (mode === 'all' || f.severity === 'critical'));
    if (!candidates.length)
        throw Error(mode === 'critical' ? 'В этом review нет Critical findings с доказанным safeAutoFix=true. Нужна ручная проверка.' : 'В этом review нет findings с доказанным safeAutoFix=true.');
    const lines = candidates.map((f, i) => `${i + 1}. [${f.severity.toUpperCase()}] ${f.code ?? 'review'}${f.target ? ` · ${f.target}` : ''}: ${f.message}`).join('\n');
    await context.startMission(`Professional Review remediation для ${context.meta.title}. Исправь ТОЛЬКО перечисленные findings, где review уже зафиксировал safeAutoFix=true:\n${lines}\nГраницы: только локальные обратимые изменения; не делать deploy, push, PR, remote migration или внешние действия. Перед каждой правкой проверь, что precondition всё ещё актуален. После изменений запусти релевантные локальные проверки и не объявляй проблему исправленной без evidence. Если любой finding больше не безопасен — остановись и пометь его manual review required.`);
}
async function openReviewHistory() {
    if (!account)
        throw Error('Войдите, чтобы открыть Professional Review.');
    const studioId = activeStudioContext?.meta.id ?? '', query = new URLSearchParams();
    if (project)
        query.set('projectId', project);
    if (studioId)
        query.set('studioId', studioId);
    const root = dialog('Professional Review', '<p class="muted">Загрузка…</p>');
    const response = await api('/api/studio/review?' + query.toString());
    root.replaceChildren();
    const intro = document.createElement('p');
    intro.className = 'context-note';
    intro.textContent = 'Review не равен автоприменению. Fix critical / Fix all safe запускают только findings с safeAutoFix=true; остальные остаются manual review required.';
    root.append(intro);
    const run = document.createElement('button');
    run.type = 'button';
    run.className = 'primary';
    run.textContent = 'Запустить Professional Review';
    run.disabled = !activeStudioContext?.startMission;
    run.onclick = () => startProfessionalReviewMission().then(() => { $('dialog').close(); }).catch(failure);
    root.append(run);
    if (!response.items.length) {
        const empty = document.createElement('p');
        empty.textContent = 'Сохранённых reviews пока нет.';
        root.append(empty);
        return;
    }
    const list = document.createElement('div');
    list.className = 'cards';
    for (const item of response.items) {
        const card = document.createElement('article');
        card.className = 'card';
        const h = document.createElement('h3');
        h.textContent = `${(0, studio_registry_1.studioById)(item.studioId)?.title ?? item.studioId} · ${item.subjectType}`;
        const meta = document.createElement('p');
        meta.className = 'muted';
        meta.textContent = `Critical ${item.counts.critical} · Major ${item.counts.major} · Minor ${item.counts.minor} · Improvement ${item.counts.improvement} · ${new Date(item.createdAt).toLocaleString()}`;
        const ul = document.createElement('ul');
        for (const finding of item.findings.slice(0, 20)) {
            const li = document.createElement('li');
            li.textContent = `${finding.severity.toUpperCase()}${finding.safeAutoFix ? ' · SAFE FIX' : ''}: ${finding.message}`;
            ul.append(li);
        }
        const actions = document.createElement('div');
        actions.className = 'toolbar';
        const critical = document.createElement('button');
        critical.type = 'button';
        critical.textContent = 'Fix critical';
        critical.disabled = !item.findings.some(f => f.severity === 'critical' && f.safeAutoFix === true) || activeStudioContext?.meta.id !== item.studioId;
        critical.title = critical.disabled ? 'Доступно только в исходной Studio и только для Critical findings с safeAutoFix=true.' : 'Запустить безопасный локальный repair mission';
        critical.onclick = () => startSafeReviewRepair(item, 'critical').then(() => { $('dialog').close(); }).catch(failure);
        const safe = document.createElement('button');
        safe.type = 'button';
        safe.textContent = 'Fix all safe issues';
        safe.disabled = !item.findings.some(f => f.safeAutoFix === true) || activeStudioContext?.meta.id !== item.studioId;
        safe.onclick = () => startSafeReviewRepair(item, 'all').then(() => { $('dialog').close(); }).catch(failure);
        const manual = document.createElement('button');
        manual.type = 'button';
        manual.textContent = 'Review manually';
        const details = document.createElement('pre');
        details.hidden = true;
        details.textContent = JSON.stringify(item.findings, null, 2);
        manual.onclick = () => { details.hidden = !details.hidden; manual.textContent = details.hidden ? 'Review manually' : 'Hide manual review'; };
        actions.append(critical, safe, manual);
        card.append(h, meta, ul, actions, details);
        list.append(card);
    }
    root.append(list);
}
bind('close-dialog', () => $('dialog').close());
function cleanupMedia() { const cleanup = mediaCleanup; mediaCleanup = () => { }; cleanup(); }
function leaveStudio() { studioEpoch++; studioRun++; if (activeStudioModule && activeStudioContext)
    activeStudioModule.cleanup?.(activeStudioContext); activeStudioModule = null; activeStudioContext = null; draftCleanup(); draftCleanup = () => { }; studioChromeCleanup(); studioChromeCleanup = () => { }; cleanupMedia(); lastBlob = null; composerHome.after(composer); missionHome.after(missionPanel); $('studio-work').hidden = true; $('studio-toolbar').replaceChildren(); $('studio-suggestions').replaceChildren(); $('studio-controls').replaceChildren(); $('studio-result').replaceChildren(); $('studio-result').removeAttribute('aria-busy'); }
function renderRoute(route, initial) {
    leaveStudio();
    metatronCleanup();
    metatronCleanup = () => { };
    const id = route.page === 'studio' ? 'studio-page' : route.page;
    document.querySelectorAll('.view').forEach(el => el.hidden = el.id !== id);
    const nav = route.page === 'studio' ? 'studios' : route.page;
    document.querySelectorAll('.nav').forEach(el => { const active = el.getAttribute('data-view') === nav; el.classList.toggle('active', active); if (active)
        el.setAttribute('aria-current', 'page');
    else
        el.removeAttribute('aria-current'); });
    if (route.page === 'studio')
        void renderStudio(route.studio).catch(failure);
    if (route.page === 'projects')
        loadProjects().catch(failure);
    if (route.page === 'connections')
        loadConnections().catch(failure);
    if (route.page === 'metatron')
        metatronCleanup = (0, metatron_lab_1.mountMetatronLab)({ root: $('metatron-page'), api, local, account, getProjectId: () => project, getMissionId: () => mission, setMissionId: id => { mission = id; remember(); }, notice, failure });
    const title = route.page === 'studio' ? (0, studio_registry_1.studioById)(route.studio).title : route.page === 'create' ? 'Создать' : route.page === 'projects' ? 'Проекты' : route.page === 'studios' ? 'Студии' : route.page === 'metatron' ? 'Metatron Lab' : route.page === 'connections' ? 'Connections' : 'Страница не найдена';
    document.title = `${title} · AZRAIL MNMLL PULSE OS`;
    if (!initial) {
        document.querySelector(`#${id} h1`)?.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: 'instant' });
    }
}
function view(id) { navigation.navigate({ page: id }); }
navigation.link(document.querySelector('[data-home]'), { page: 'create' });
document.querySelectorAll('[data-view]').forEach(el => navigation.link(el, { page: el.dataset.view }));
navigation.link($('close-studio'), { page: 'studios' });
navigation.link($('connections'), { page: 'connections' });
document.querySelectorAll('[data-prompt]').forEach(el => el.onclick = () => { prompt.value = el.dataset.prompt; prompt.focus(); });
document.addEventListener('azrail:open-studio', (event) => { const id = event.detail?.studio; if (id && (0, studio_registry_1.studioById)(id))
    navigation.navigate({ page: 'studio', studio: id }); });
const chatSuggestionBar = (0, suggestions_1.mountSuggestionBar)($('chat-suggestions'), { surface: 'chat', projectId: project || undefined, lastUserMessage: prompt.value }, item => { prompt.value = item.prompt; prompt.dispatchEvent(new Event('input', { bubbles: true })); prompt.focus(); });
prompt.addEventListener('input', () => chatSuggestionBar.update({ surface: 'chat', projectId: project || undefined, lastUserMessage: prompt.value }));
bind('attach', () => { if (!project) {
    project = crypto.randomUUID();
    remember();
} $('attachments').click(); });
bind('account', async () => {
    if (!account) {
        if (local)
            throw Error('Вход доступен после развёртывания приложения.');
        if (oidcConfigured) {
            location.assign('/auth/login');
            return;
        }
        // Без OIDC — единственный путь входа, уже реализованный на сервере
        // (lib/auth.ts, timing-safe сравнение, fail-closed без секрета):
        // общий AZRAIL_TOKEN или персональный ключ az_..., выданный
        // администратором через /api/admin/accounts.
        dialog('Вход по токену', '<p>OIDC не настроен на этом развёртывании — регистрация внешнего OAuth-приложения не требуется. Введите токен доступа.</p><label for="login-token">Токен</label><input id="login-token" type="password" autocomplete="off" spellcheck="false"><button id="login-save" class="primary">Войти</button>');
        $('login-token').focus();
        bind('login-save', async () => {
            const value = $('login-token').value.trim();
            if (!value)
                throw Error('Введите токен.');
            authToken = value;
            try {
                sessionStorage.setItem('pulse.token', authToken);
            }
            catch { }
            try {
                const me = await api('/api/me');
                account = me.account;
            }
            catch (e) {
                authToken = '';
                try {
                    sessionStorage.removeItem('pulse.token');
                }
                catch { }
                ;
                throw e;
            }
            $('dialog').close();
            $('account').textContent = account.name;
            await refreshMode();
            if (mission) {
                $('mission-panel').hidden = false;
                await poll(++epoch);
            }
            notice('Вход выполнен.');
        });
        return;
    }
    dialog('Ваш аккаунт', '<p id="account-name"></p><p id="account-id"></p><button id="logout">Выйти</button>');
    $('account-name').textContent = account.name;
    $('account-id').textContent = account.id;
    bind('logout', async () => {
        const wasToken = !!authToken;
        if (wasToken) {
            authToken = '';
            try {
                sessionStorage.removeItem('pulse.token');
            }
            catch { }
        }
        else
            await api('/auth/logout', { method: 'POST' });
        for (const key of ['pulse.pending', 'pulse.project', 'pulse.mission', 'pulse.image.pending'])
            sessionStorage.removeItem(key);
        location.reload();
    });
});
async function refreshAccount() {
    if (local) {
        $('local-notice').textContent = 'Локальный просмотр · WAV/MIDI, аудиоанализ и CSV доступны на устройстве. Для AI и проектов нужен вход в развёрнутое приложение.';
        $('local-notice').hidden = false;
        $('mode').textContent = 'AI подключается после развёртывания';
        return;
    }
    const a = await api('/auth/status');
    account = a.account;
    oidcConfigured = !!a.configured;
    if (!account && authToken) {
        try {
            const me = await api('/api/me');
            account = me.account;
        }
        catch {
            authToken = '';
            try {
                sessionStorage.removeItem('pulse.token');
            }
            catch { }
        }
    }
    if (account) {
        $('account').textContent = account.name;
        await refreshMode();
        ensureEventStream();
        if (mission) {
            $('mission-panel').hidden = false;
            await poll(++epoch);
        }
    }
    else if (!oidcConfigured)
        notice('OIDC не настроен. Войдите по токену через кнопку «Аккаунт» — регистрация внешнего приложения не нужна.');
}
async function refreshMode() { const r = await api('/api/routing-settings'); $('mode').textContent = r.policy.allowThirdPartyModels ? 'Сторонние модели включены' : 'Сторонние модели выключены'; return r; }
bind('settings', async () => {
    if (!account)
        throw Error('Войдите, чтобы посмотреть режим и лимиты.');
    const r = await refreshMode();
    dialog('Режим и лимиты', '<label><input type="checkbox" id="third-party"> Сторонние AI-модели</label><label for="budget">Месячный лимит платных моделей, USD</label><input id="budget" type="number" min="0" step="1"><p id="budget-info"></p><p>OFF блокирует сторонние модели. На Workers Paid даже собственные модели могут расходовать деньги сверх квоты. R2 и Sandbox учитываются отдельно.</p><button id="save-mode" class="primary">Сохранить</button><button id="catalog">Каталог моделей</button><button id="open-connections">Connections ↗</button>');
    $('third-party').checked = r.policy.allowThirdPartyModels;
    $('budget').value = String(r.policy.monthlyBudgetUsd);
    $('budget-info').textContent = `Учтено и зарезервировано: $${r.committedUsd.toFixed(4)}. План: ${r.workersPlan}.`;
    $('save-mode').disabled = !account.operator;
    if (!account.operator)
        $('budget-info').textContent += ' Изменения доступны оператору платформы.';
    bind('save-mode', async () => { await api('/api/admin/routing-settings', { method: 'POST', body: JSON.stringify({ allowThirdPartyModels: $('third-party').checked, monthlyBudgetUsd: Number($('budget').value) }) }); await refreshMode(); notice('Настройки сохранены на сервере.'); });
    bind('catalog', async () => { const cat = await api('/api/model-catalog'); const pre = document.createElement('pre'); pre.textContent = JSON.stringify(cat, null, 2); $('dialog-content').append(pre); });
    bind('open-connections', () => { $('dialog').close(); navigation.navigate({ page: 'connections' }); });
});
function ensureEventStream() {
    if (local || !account || !project) {
        stopEventStream();
        stopEventStream = () => { };
        streamProject = '';
        return;
    }
    if (streamProject === project)
        return;
    stopEventStream();
    streamProject = project;
    stopEventStream = (0, event_stream_1.createProjectEventClient)({ api, projectId: project, onEvent: (event) => {
            if (event.missionId && event.missionId === mission && !document.hidden) {
                clearTimeout(pollTimer);
                pollTimer = window.setTimeout(() => void poll(epoch), 120);
            }
        } });
}
bind('about', () => dialog('AZRAIL × MNMLL PULSE', '<p>Мультиагентное ядро AZRAIL и творческие инструменты PULSE в одном приложении. У каждого модуля студий своя страница.</p><p>Текст и голос → миссия → файлы проекта → проверка. Результат не получает статус готовности к публикации без успешной проверки кода.</p><p>Музыка здесь — локальный procedural synthesis. Video Studio использует AI только для Scene Builder, а preview/WebM рендерит локально через Canvas + MediaRecorder. Cloudflare Stream/Veo не выдаются за подключённые, пока binding не настроен и не проверен.</p>'));
async function runMission() {
    if (missionSubmitting)
        return;
    if (!account)
        throw Error('Войдите в аккаунт, чтобы запустить AZRAIL.');
    if (account.role === 'viewer')
        throw Error('Ваш аккаунт разрешает только просмотр.');
    const message = prompt.value.trim();
    if (!message)
        return;
    if (attachmentManager.hasPending())
        throw Error('Дождитесь окончания загрузки вложений.');
    if (attachmentManager.hasFailed())
        throw Error('Есть вложения с ошибкой. Повторите загрузку или удалите их.');
    if (!pending) {
        project = project || crypto.randomUUID();
        pending = { key: crypto.randomUUID(), body: JSON.stringify({ message, projectId: project, maxIterations: 8, attachments: attachmentRefs, ...(preferredModel ? { preferredModel } : {}) }) };
    }
    remember();
    missionSubmitting = true;
    $('submit').disabled = true;
    try {
        const r = await api('/api/mission', { method: 'POST', headers: { 'Idempotency-Key': pending.key }, body: pending.body });
        mission = r.missionId;
        pending = null;
        remember();
        $('mission-panel').hidden = false;
        ensureEventStream();
        await poll(++epoch);
    }
    catch (e) {
        // A definite admission rejection is editable. Network errors, 5xx and an
        // in-flight 409 retain the exact request/key: its delivery is uncertain.
        if (e instanceof APIError && ([400, 401, 403, 404, 405, 413, 415, 422, 429].includes(e.status) || e.code === 'project_busy')) {
            pending = null;
            remember();
        }
        throw e;
    }
    finally {
        missionSubmitting = false;
        $('submit').disabled = false;
    }
}
$('composer').onsubmit = e => { e.preventDefault(); runMission().catch(failure); };
async function poll(version = epoch) {
    clearTimeout(pollTimer);
    if (!mission || document.hidden)
        return;
    try {
        const r = await api(`/api/mission?missionId=${encodeURIComponent(mission)}`);
        if (version !== epoch)
            return;
        pollFailures = 0;
        const state = (0, mission_view_1.renderMission)(document, r, !!account?.operator);
        if (state.active)
            pollTimer = window.setTimeout(() => void poll(version), 3000);
    }
    catch (e) {
        if (version !== epoch)
            return;
        pollFailures++;
        $('mission-connection').textContent = e instanceof APIError && e.status === 401 ? 'Сессия завершена. Войдите снова, чтобы продолжить просмотр.' : 'Связь прервана. Задача может продолжать работу на сервере. Повторная отправка не выполняется.';
        if (!(e instanceof APIError && [401, 403, 404].includes(e.status)) && pollFailures < 6)
            pollTimer = window.setTimeout(() => void poll(version), Math.min(30000, 3000 * 2 ** pollFailures));
    }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden)
    poll().catch(failure);
else
    clearTimeout(pollTimer); });
bind('resume', () => poll(++epoch));
bind('cancel', async () => { if (mission) {
    await api('/api/mission/cancel', { method: 'POST', body: JSON.stringify({ missionId: mission, projectId: project }) });
    await poll(++epoch);
} });
bind('export-project', async () => { if (!project)
    throw Error('Выберите проект.'); const { download } = await Promise.resolve().then(() => __importStar(require('./media'))); download(await blobAPI(`/api/studio/project-zip?projectId=${encodeURIComponent(project)}`), 'azrail-project.zip'); });
bind('recover', async () => { if (!mission)
    throw Error('Выберите миссию.'); const r = await api('/api/mission/recover', { method: 'POST', body: JSON.stringify({ projectId: project, missionId: mission }) }); notice(r.resumed ? 'Миссия возобновлена.' : r.reason); await poll(++epoch); });
bind('permit-sandbox', async () => { if (!account?.operator)
    throw Error('Разрешение Sandbox выдаёт оператор платформы.'); const c = await api('/api/studio/capabilities'); if (!c.sandbox)
    throw Error('Sandbox отсутствует в этом профиле. Нужен Paid-профиль Cloudflare.'); await api('/api/admin/permissions', { method: 'POST', body: JSON.stringify({ projectId: project, capability: 'sandbox', enabled: true }) }); notice('Sandbox разрешён для этого проекта. Его использование тарифицируется отдельно.'); });
function openProjectFromCenter(item) {
    if (pending && project !== item.id) {
        notice('Предыдущая отправка требует проверки. Повторите её перед сменой проекта.', true);
        return;
    }
    if (project !== item.id)
        clearAttachments();
    project = item.id;
    mission = item.missionId ?? '';
    remember();
    ensureEventStream();
    const studio = item.studioId && (0, studio_registry_1.studioById)(item.studioId) ? item.studioId : null;
    if (studio)
        navigation.navigate({ page: 'studio', studio });
    else
        view('create');
    $('mission-panel').hidden = !mission;
    if (mission)
        poll(++epoch).catch(failure);
    prompt.focus();
}
async function loadProjects() {
    await (0, projects_1.renderProjectCenter)({ account, local, selectedProjectId: project, api, blobAPI, onOpen: openProjectFromCenter, notice, failure, dialog, closeDialog: () => $('dialog').close() });
}
for (const studio of studio_registry_1.studios) {
    const el = document.createElement('a');
    el.className = 'card';
    el.dataset.studio = studio.id;
    el.dataset.icon = studio.icon;
    const small = document.createElement('small'), h = document.createElement('h3'), p = document.createElement('p'), action = document.createElement('span');
    small.textContent = studio.type;
    h.textContent = studio.title;
    p.textContent = studio.description;
    action.className = 'card-action';
    action.textContent = studio.action + ' ↗';
    el.append(small, h, p, action);
    navigation.link(el, { page: 'studio', studio: studio.id });
    $('studio-list').append(el);
}
function studioContext(meta, token, runToken, signal) {
    if (!meta)
        throw Error('Студия не найдена.');
    return {
        meta, controls: $('studio-controls'), result: $('studio-result'), account, projectId: project, composer, missionPanel, api, blobAPI, notice, failure, signal, currentProjectId: () => project, startMission: async (message) => { prompt.value = message; await runMission(); }, dialog, closeDialog: () => $('dialog').close(),
        current: () => token === studioEpoch && runToken === studioRun,
        mountDraft: (server, options) => { draftCleanup(); draftCleanup = (0, studio_draft_1.mountStudioDraft)($('studio-controls'), meta.id, api, server, options); },
        setMediaCleanup: (cleanup) => { mediaCleanup = cleanup; }, setLastBlob: (blob) => { lastBlob = blob; },
    };
}
async function renderStudio(id) {
    const meta = (0, studio_registry_1.studioById)(id);
    if (!meta)
        return;
    const token = ++studioEpoch, state = (0, studio_state_1.createStudioStateController)('IDLE');
    state.set('READY');
    $('studio-work').hidden = false;
    $('studio-title').textContent = meta.title;
    $('studio-description').textContent = meta.description;
    $('studio-type').textContent = meta.type;
    const controls = $('studio-controls'), result = $('studio-result');
    controls.replaceChildren();
    result.replaceChildren();
    const module = await (0, studio_registry_1.loadStudioModule)(id);
    if (token !== studioEpoch)
        return;
    const mountContext = studioContext(meta, token, studioRun);
    activeStudioModule = module;
    activeStudioContext = mountContext;
    await module.mount(mountContext);
    if (token !== studioEpoch)
        return;
    const run = controls.querySelector('#studio-run');
    if (module.run && !run)
        throw Error(`Studio ${id} did not mount #studio-run.`);
    if (run)
        run.textContent = module.action + ' ↗';
    const readOnly = account?.role === 'viewer' && module.capabilities.includes('cloud-write');
    if (run && (module.cloud && !account || readOnly)) {
        run.disabled = true;
        const info = document.createElement('p');
        info.className = 'context-note';
        info.textContent = readOnly ? 'Ваш аккаунт разрешает только просмотр.' : 'Для этого инструмента войдите в развёрнутое приложение.';
        controls.append(info);
    }
    const modulePermissions = ['module.view'];
    if (!account || account.role !== 'viewer') {
        modulePermissions.push('module.configure');
        if (module.run)
            modulePermissions.push('module.execute');
    }
    if (account?.operator || account?.role === 'admin')
        modulePermissions.push('module.manage');
    let moduleRuns = 0, lastModuleRunMs = 0;
    const moduleFrame = (0, module_frame_1.mountModuleFrameActions)(controls, id, {
        definition: { id, type: meta.type, title: `${meta.title} · Module`, status: 'idle', capabilities: [...meta.capabilities], permissions: modulePermissions, resourceUsage: { runs: 0, last_ms: 0 } },
        permissions: modulePermissions,
        onRetry: run ? () => run.click() : undefined,
        shortcuts: run ? [{ id: 'run', label: 'Run module', keys: 'Alt+Enter', permission: 'module.execute', run: () => { if (!run.disabled)
                    run.click(); } }] : [],
        persistKey: `azrail.module.${id}.${project || 'local'}`,
    });
    const suggestionContext = { surface: id, projectId: project || undefined, activeModel: preferredModel || 'AUTO', capabilities: meta.capabilities, hasResult: false };
    const suggestion = (0, suggestions_1.mountSuggestionBar)($('studio-suggestions'), suggestionContext, (item) => {
        const field = controls.querySelector('#studio-text');
        if (field) {
            field.value = item.prompt;
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.focus();
            notice(`Подсказка добавлена: ${item.label}`);
            return;
        }
        if (mountContext.startMission)
            void mountContext.startMission(item.prompt).catch(failure);
    });
    void loadSystemSuggestions(suggestionContext).then(items => { if (token === studioEpoch && items.length)
        suggestion.update({ ...suggestionContext, remoteSuggestions: items }); });
    const toolbar = (0, studio_toolbar_1.mountStudioToolbar)({ host: $('studio-toolbar'), meta, state, run, stop: () => { if (['RUNNING', 'PAUSED'].includes(state.get())) {
            state.set('CANCELLING');
            cleanupMedia();
            state.set('READY');
            notice('Операция остановлена.');
        } }, openHistory: () => { const button = $('project-history'); if (project && account)
            button.click();
        else
            notice('История проекта появится после выбора сохранённого проекта.'); }, openCompare: () => { void openCompareCenter().catch(failure); }, openReview: () => { void openReviewHistory().catch(failure); }, openHelp: () => $('shortcuts').click(), loadModels: account && meta.capabilities.includes('mission') ? async () => { const catalog = await api('/api/model-catalog'); return catalog.models ?? []; } : undefined, getPreferredModel: () => preferredModel, setPreferredModel: model => { setPreferredModel(model); suggestion.update({ surface: id, projectId: project || undefined, activeModel: model || 'AUTO', capabilities: meta.capabilities, hasResult: !!result.textContent?.trim() }); notice(model ? `Модель закреплена: ${model}` : 'AUTO router включён.'); } });
    studioChromeCleanup = () => { toolbar.destroy(); suggestion.destroy(); moduleFrame.destroy(); };
    (0, smart_empty_1.renderSmartEmptyState)(result, meta);
    if (!module.run || !run)
        return;
    toolbar.setRunEnabled(!run.disabled);
    run.hidden = true;
    run.onclick = () => Promise.resolve().then(async () => {
        if (run.disabled)
            return;
        run.disabled = true;
        toolbar.setRunEnabled(false);
        state.set('RUNNING');
        moduleFrame.clearError();
        moduleFrame.setStatus('loading');
        const moduleStarted = performance.now();
        moduleRuns++;
        moduleFrame.setResourceUsage({ runs: moduleRuns, last_ms: lastModuleRunMs });
        const runToken = ++studioRun, current = () => token === studioEpoch && runToken === studioRun;
        const abort = new AbortController();
        cleanupMedia();
        mediaCleanup = () => abort.abort();
        lastBlob = null;
        result.textContent = module.pendingLabel ?? 'Выполняю…';
        result.setAttribute('aria-busy', 'true');
        moduleFrame.setStatus('running');
        const runContext = studioContext(meta, token, runToken, abort.signal);
        activeStudioContext = runContext;
        try {
            await module.run(runContext);
            if (current()) {
                state.set('COMPLETED');
                moduleFrame.setStatus('success');
                moduleFrame.recordHistory('Run completed');
            }
        }
        catch (error) {
            if (current()) {
                if (abort.signal.aborted) {
                    if (state.get() !== 'READY')
                        state.set('READY');
                    moduleFrame.setStatus('idle');
                    moduleFrame.recordHistory('Run cancelled');
                    result.textContent = 'Операция остановлена. Параметры сохранены.';
                    return;
                }
                state.set('FAILED');
                moduleFrame.setError(error, () => run.click());
                (0, error_recovery_1.renderRecoveryError)(result, error, { retry: () => run.click(), restore: () => { draftCleanup(); void renderStudio(id); }, openLogs: () => { if (project && mission) {
                        missionPanel.hidden = false;
                        return poll(++epoch);
                    } notice('Логи миссии появятся после запуска задачи.'); }, report: () => { prompt.value = `Проверь ошибку в ${meta.title}: ${error instanceof Error ? error.message : String(error)}`; navigation.navigate({ page: 'create' }); prompt.focus(); } });
                throw error;
            }
        }
        finally {
            lastModuleRunMs = Math.max(0, Math.round(performance.now() - moduleStarted));
            moduleFrame.setResourceUsage({ runs: moduleRuns, last_ms: lastModuleRunMs });
            run.disabled = false;
            toolbar.setRunEnabled(true);
            if (current())
                result.setAttribute('aria-busy', 'false');
            suggestion.update({ surface: id, projectId: project || undefined, activeModel: preferredModel || 'AUTO', capabilities: meta.capabilities, hasResult: true });
        }
    }).catch(failure);
}
const voiceInput = (0, voice_input_1.mountVoiceInput)({ button: $('voice'), prompt, api, canUse: () => !!account, notice, failure });
const commandPalette = (0, command_palette_1.mountCommandPalette)(() => [
    { id: 'open-create', label: 'Open Chat / Создать', keywords: ['chat', 'create'], run: () => navigation.navigate({ page: 'create' }) },
    { id: 'open-projects', label: 'Open Projects', keywords: ['projects', 'project'], run: () => navigation.navigate({ page: 'projects' }) },
    { id: 'open-metatron', label: 'Open Metatron Lab', keywords: ['metatron', 'agents', 'mission graph', 'operations'], run: () => navigation.navigate({ page: 'metatron' }) },
    { id: 'open-connections', label: 'Open Connections', keywords: ['connectors', 'integrations'], run: () => navigation.navigate({ page: 'connections' }) },
    ...studio_registry_1.studios.map(meta => ({ id: `studio-${meta.id}`, label: `Open ${meta.title}`, keywords: [meta.description, meta.id], run: () => navigation.navigate({ page: 'studio', studio: meta.id }) })),
    { id: 'run-mission', label: 'Run mission / Отправить запрос', keywords: ['run', 'mission'], disabled: () => !prompt.value.trim(), run: () => composer.dispatchEvent(new Event('submit', { cancelable: true })) },
    { id: 'stop-mission', label: 'Stop mission', keywords: ['cancel', 'abort'], disabled: () => !mission, run: () => $('cancel').click() },
    { id: 'history', label: 'Open project history', keywords: ['history', 'versions'], disabled: () => !project || !account, run: () => $('project-history').click() },
    { id: 'asset-library', label: 'Open Asset Intelligence Library', keywords: ['assets', 'library', 'images', 'audio', 'documents'], disabled: () => !account, run: () => openAssetIntelligence().catch(failure) },
    { id: 'global-memory', label: 'Open Global Memory', keywords: ['memory', 'context', 'knowledge', 'ttl', 'scope'], disabled: () => !account, run: () => openGlobalMemory().catch(failure) },
    { id: 'system-history', label: 'Open System History / Undo', keywords: ['history', 'undo', 'events', 'tasks'], disabled: () => !project || !account, run: () => openSystemHistory().catch(failure) },
    { id: 'series-g-readiness', label: 'Open Browser QA / Real E2E readiness', keywords: ['browser', 'qa', 'e2e', 'series g'], disabled: () => !account, run: () => openSystemReadiness().catch(failure) },
    { id: 'compare-mode', label: 'Open Compare Mode · A | B', keywords: ['compare', 'a b', 'versions', 'before after'], disabled: () => !account, run: () => openCompareCenter().catch(failure) },
    { id: 'professional-review', label: 'Open Professional Review', keywords: ['review', 'quality', 'critical', 'major', 'minor', 'safe fix'], disabled: () => !account, run: () => openReviewHistory().catch(failure) },
    { id: 'shortcuts', label: 'Open shortcuts', keywords: ['help', 'keyboard'], run: () => $('shortcuts').click() },
]);
navigation.render(true);
refreshAccount().then(() => { if (!local && account)
    navigation.render(true); }).catch(failure);
// Avoid keeping a previous large export reachable after leaving its studio.
window.addEventListener('pagehide', () => { stopEventStream(); draftCleanup(); cleanupMedia(); voiceInput.destroy(); commandPalette.destroy(); lastBlob = null; });
void lastBlob;
bind('shortcuts', () => dialog('Горячие клавиши', '<p>Ctrl / ⌘ + K — Command Palette.</p><p>Ctrl / ⌘ + Enter — отправить запрос.</p><p>Alt + 1 — создать; Alt + 2 — проекты; Alt + 3 — студии.</p><p>В Studio: ↶ / ↷ управляет историей черновика; Stop отменяет текущую локальную/сетевую операцию через AbortController.</p><p>Escape — закрыть окно.</p>'));
document.addEventListener('keydown', e => { if (e.defaultPrevented || e.isComposing)
    return; if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && document.activeElement === prompt) {
    e.preventDefault();
    $('composer').dispatchEvent(new Event('submit', { cancelable: true }));
} if (e.altKey && ['1', '2', '3'].includes(e.key)) {
    e.preventDefault();
    view(['create', 'projects', 'studios'][Number(e.key) - 1]);
} });
async function loadConnections() {
    const host = $('connections-page');
    if (local) {
        host.replaceChildren(document.createTextNode('Connections доступны в развёрнутом приложении.'));
        return;
    }
    if (!account) {
        const p = document.createElement('p');
        p.className = 'context-note';
        p.textContent = 'Войдите, чтобы управлять подключениями вашего аккаунта.';
        host.replaceChildren(p);
        return;
    }
    const { renderConnections } = await Promise.resolve().then(() => __importStar(require('./connectors')));
    await renderConnections(host, api, { role: account.role });
}
if (new URLSearchParams(location.search).get('connected') === '1') {
    notice('Сервис подключён. Откройте Подключения и проверьте соединение.');
    history.replaceState(null, '', location.pathname + location.hash);
}
bind('project-design', async () => { if (!project || !account)
    throw Error('Откройте свой проект.'); const path = '/api/studio/design-contract?projectId=' + encodeURIComponent(project), r = await api(path); dialog('Design Contract', '<p>Контракт задаёт типографику, сетку, breakpoints, component density и обязательные UI states до генерации кода.</p><label for="design-accent">Акцент</label><input id="design-accent" type="color"><label for="design-font">Характер шрифта</label><select id="design-font"><option value="sans-serif">Прямой гротеск</option><option value="serif">С засечками</option><option value="monospace">Моноширинный</option></select><label for="design-density">Плотность компонентов</label><select id="design-density"><option value="compact">Compact</option><option value="comfortable">Comfortable</option><option value="spacious">Spacious</option></select><label for="design-gutter">Grid gutter, px</label><input id="design-gutter" type="number" min="8" max="48"><label for="design-max-width">Max content width, px</label><input id="design-max-width" type="number" min="960" max="1920"><label for="design-action">Основное действие</label><input id="design-action" maxlength="60"><p class="muted">Responsive contract: 390 / 768 / 1024 / 1440. Empty state — guided, error state — recoverable.</p><button id="design-save" class="primary">Сохранить контракт</button>'); $('design-accent').value = r.contract.accent; $('design-font').value = r.contract.fontFamily; $('design-density').value = r.contract.components?.density ?? 'comfortable'; $('design-gutter').value = String(r.contract.grid?.gutter ?? 24); $('design-max-width').value = String(r.contract.grid?.maxWidth ?? 1440); $('design-action').value = r.contract.primaryAction; bind('design-save', async () => { await api(path, { method: 'PUT', body: JSON.stringify({ baseRevision: r.revision, contract: { ...r.contract, version: 2, accent: $('design-accent').value, fontFamily: $('design-font').value, primaryAction: $('design-action').value, grid: { ...r.contract.grid, gutter: Number($('design-gutter').value), maxWidth: Number($('design-max-width').value) }, components: { ...r.contract.components, density: $('design-density').value } } }) }); $('dialog').close(); notice('Design Contract сохранён. Следующие UI-правки обязаны учитывать сетку, breakpoints и состояния.'); }); });
bind('project-history', async () => {
    if (!project || !account)
        throw Error('Откройте свой проект.');
    dialog('История версий', '<div id="version-list" class="cards"></div><div id="version-restore"></div>');
    const list = $('version-list');
    const r = await api(`/api/projects/${encodeURIComponent(project)}/versions`);
    if (!r.data.length) {
        list.textContent = 'У этого проекта пока нет сохранённых версий.';
        return;
    }
    for (const v of r.data) {
        const card = document.createElement('div');
        card.className = 'card';
        const h = document.createElement('h3');
        h.textContent = `Версия ${v.versionNumber}`;
        const meta = document.createElement('p');
        meta.className = 'muted';
        meta.textContent = `${new Date(v.createdAt).toLocaleString()} · ${v.createdByAgent ?? '—'}`;
        const summary = document.createElement('p');
        summary.textContent = v.summary ?? 'Без описания.';
        card.append(h, meta, summary);
        if (account.role !== 'viewer') {
            const btn = document.createElement('button');
            btn.textContent = 'Восстановить';
            btn.onclick = () => {
                if (btn.disabled)
                    return;
                btn.disabled = true;
                api(`/api/projects/${encodeURIComponent(project)}/versions/${encodeURIComponent(v.id)}/restore`, { method: 'POST' })
                    .then((res) => {
                    const out = $('version-restore');
                    out.replaceChildren();
                    if (res.warning) {
                        const w = document.createElement('p');
                        w.className = 'muted';
                        w.textContent = res.warning;
                        out.append(w);
                    }
                    if (!res.data.files.length) {
                        out.append(document.createTextNode('В этой версии нет файлов.'));
                        return;
                    }
                    const ul = document.createElement('ul');
                    for (const f of res.data.files) {
                        const li = document.createElement('li');
                        const code = document.createElement('code');
                        code.textContent = f.path;
                        const dl = document.createElement('button');
                        dl.className = 'text-button';
                        dl.textContent = 'Скачать';
                        dl.onclick = () => Promise.resolve().then(() => __importStar(require('./media'))).then(m => m.download(new Blob([f.content]), f.path.split('/').pop() || 'file.txt'));
                        li.append(code, document.createTextNode(' '), dl);
                        ul.append(li);
                    }
                    out.append(ul);
                })
                    .catch(failure).finally(() => { btn.disabled = false; });
            };
            card.append(btn);
        }
        list.append(card);
    }
});
bind('project-backups', async () => {
    if (!project || !account)
        throw Error('Откройте свой проект.');
    const viewer = account.role === 'viewer';
    dialog('Резервные копии', viewer ? '<div id="backup-list" class="cards"></div>' : '<button id="backup-create" class="primary">Создать копию сейчас</button><div id="backup-list" class="cards"></div>');
    async function refresh() {
        const list = $('backup-list');
        list.textContent = 'Загрузка…';
        const r = await api(`/api/backups?projectId=${encodeURIComponent(project)}`);
        list.replaceChildren();
        if (!r.backups.length) {
            list.textContent = 'Резервных копий ещё нет.';
            return;
        }
        for (const b of r.backups) {
            const card = document.createElement('div');
            card.className = 'card';
            const h = document.createElement('h3');
            h.textContent = new Date(b.created_at).toLocaleString();
            const meta = document.createElement('p');
            meta.className = 'muted';
            meta.textContent = `Файлов: ${b.file_count} · ${b.id.slice(0, 8)}`;
            card.append(h, meta);
            if (!viewer) {
                const btn = document.createElement('button');
                btn.textContent = 'Восстановить в новый проект';
                btn.onclick = () => {
                    if (btn.disabled)
                        return;
                    btn.disabled = true;
                    const target = crypto.randomUUID();
                    api('/api/backups/restore', { method: 'POST', body: JSON.stringify({ projectId: project, backupId: b.id, targetProjectId: target }) })
                        .then(() => {
                        $('dialog').close();
                        notice(`Копия восстановлена в новый проект. Открываю его.`);
                        project = target;
                        mission = '';
                        remember();
                        ensureEventStream();
                        view('create');
                    })
                        .catch(failure).finally(() => { btn.disabled = false; });
                };
                card.append(btn);
            }
            list.append(card);
        }
    }
    if (!viewer)
        bind('backup-create', async () => { await api('/api/backups', { method: 'POST', body: JSON.stringify({ projectId: project }) }); notice('Резервная копия создана.'); await refresh(); });
    await refresh();
});

},
"ui/attachment-manager":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAttachmentManager = createAttachmentManager;
const MAX_FILES = 12;
const MAX_BYTES = 50 * 1024 * 1024;
const ACCEPTED = ['zip', 'pdf', 'docx', 'js', 'ts', 'tsx', 'jsx', 'html', 'css', 'py', 'md', 'json', 'txt', 'png', 'jpg', 'jpeg', 'webp', 'svg', 'mp3', 'wav', 'm4a', 'mp4', 'mov', 'webm'];
function id() { return crypto.randomUUID(); }
function ext(name) { return name.split('.').pop()?.toLowerCase() ?? ''; }
function bytes(n) { if (n < 1024)
    return `${n} B`; if (n < 1024 * 1024)
    return `${(n / 1024).toFixed(n > 99 * 1024 ? 0 : 1)} KB`; return `${(n / 1024 / 1024).toFixed(1)} MB`; }
function kind(file) { const e = ext(file.name); if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(e))
    return 'IMAGE'; if (['mp3', 'wav', 'm4a'].includes(e))
    return 'AUDIO'; if (['mp4', 'mov', 'webm'].includes(e))
    return 'VIDEO'; if (e === 'zip')
    return 'ZIP'; if (['pdf', 'docx'].includes(e))
    return 'DOC'; if (['js', 'ts', 'tsx', 'jsx', 'html', 'css', 'py', 'md', 'json', 'txt'].includes(e))
    return 'TEXT'; return e.toUpperCase() || 'FILE'; }
function createAttachmentManager(deps) {
    const items = [];
    const refs = () => items.filter(i => i.state === 'ready' && i.ref).map(i => i.ref);
    function notify() { deps.onChange?.(refs()); }
    function render() {
        deps.root.replaceChildren();
        if (!items.length) {
            deps.root.hidden = true;
            notify();
            return;
        }
        deps.root.hidden = false;
        for (const item of items) {
            const row = document.createElement('div');
            row.className = 'attachment-card';
            row.dataset.state = item.state;
            const icon = document.createElement('span');
            icon.className = 'attachment-kind';
            icon.textContent = kind(item.file);
            const body = document.createElement('div');
            body.className = 'attachment-body';
            const name = document.createElement('strong');
            name.textContent = item.file.name;
            const meta = document.createElement('small');
            meta.textContent = `${bytes(item.file.size)} · ${item.state === 'queued' ? 'в очереди' : item.state === 'uploading' ? `загрузка ${item.progress}%` : item.state === 'ready' ? 'готово' : item.error || 'ошибка'}`;
            body.append(name, meta);
            if (item.state === 'uploading') {
                const p = document.createElement('progress');
                p.max = 100;
                p.value = item.progress;
                p.setAttribute('aria-label', `Загрузка ${item.file.name}`);
                body.append(p);
            }
            const actions = document.createElement('div');
            actions.className = 'attachment-actions';
            if (item.state === 'failed') {
                const retry = document.createElement('button');
                retry.type = 'button';
                retry.textContent = 'Повторить';
                retry.onclick = () => void upload(item);
                actions.append(retry);
            }
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'text-button';
            remove.textContent = '×';
            remove.setAttribute('aria-label', `Удалить ${item.file.name}`);
            remove.onclick = () => { const i = items.indexOf(item); if (i >= 0)
                items.splice(i, 1); render(); };
            actions.append(remove);
            row.append(icon, body, actions);
            deps.root.append(row);
        }
        notify();
    }
    function validate(file) { if (!ACCEPTED.includes(ext(file.name)))
        throw Error(`Тип файла ${file.name} не поддерживается.`); if (file.size > MAX_BYTES)
        throw Error(`${file.name}: максимум 50 MB.`); }
    async function upload(item) {
        try {
            item.state = 'uploading';
            item.progress = 15;
            item.error = undefined;
            render();
            const projectId = deps.getProjectId();
            if (!projectId)
                throw Error('Сначала выберите или создайте проект.');
            const form = new FormData();
            form.set('file', item.file);
            form.set('projectId', projectId);
            item.progress = 45;
            render();
            const result = await deps.api('/api/upload', { method: 'POST', body: form });
            item.progress = 100;
            item.ref = { r2Key: result.r2Key, fileName: result.fileName, inputType: result.inputType, size: result.size, mimeType: item.file.type || 'application/octet-stream' };
            item.state = 'ready';
            render();
        }
        catch (e) {
            item.state = 'failed';
            item.error = e instanceof Error ? e.message : String(e);
            render();
        }
    }
    async function add(files) {
        try {
            if (items.length + files.length > MAX_FILES)
                throw Error(`Можно прикрепить до ${MAX_FILES} файлов за один запрос.`);
            for (const file of files) {
                validate(file);
                items.push({ id: id(), file, state: 'queued', progress: 0 });
            }
            render();
            for (const item of items.filter(i => i.state === 'queued'))
                await upload(item);
        }
        catch (e) {
            deps.failure(e);
        }
        finally {
            deps.input.value = '';
        }
    }
    deps.input.onchange = () => void add([...deps.input.files ?? []]);
    deps.root.addEventListener('dragover', e => { e.preventDefault(); deps.root.classList.add('drop-target'); });
    deps.root.addEventListener('dragleave', () => deps.root.classList.remove('drop-target'));
    deps.root.addEventListener('drop', e => { e.preventDefault(); deps.root.classList.remove('drop-target'); void add([...e.dataTransfer.files]); });
    return { refs, add, clear() { items.splice(0); render(); }, hasPending() { return items.some(i => i.state === 'queued' || i.state === 'uploading'); }, hasFailed() { return items.some(i => i.state === 'failed'); }, count() { return items.length; } };
}

},
"ui/audio-analysis":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.measurePCM = measurePCM;
exports.compareAudio = compareAudio;
exports.renderAudioReport = renderAudioReport;
const ranges = [[20, 60], [60, 250], [250, 2000], [2000, 6000], [6000, 20000]];
const rangeLabels = ['SUB', 'LOW', 'LOW MID', 'HIGH MID', 'AIR'];
const db = (x) => x > 0 ? 20 * Math.log10(x) : null;
const lufs = (energy) => energy > 0 ? -0.691 + 10 * Math.log10(energy) : null;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const percentile = (values, p) => { if (!values.length)
    return null; const sorted = [...values].sort((a, b) => a - b), x = (sorted.length - 1) * p, a = Math.floor(x), b = Math.ceil(x); return sorted[a] + (sorted[b] - sorted[a]) * (x - a); };
function highPass(sampleRate, frequency = 38, q = .5) { const w = 2 * Math.PI * frequency / sampleRate, c = Math.cos(w), s = Math.sin(w), alpha = s / (2 * q), a0 = 1 + alpha; return { b0: (1 + c) / 2 / a0, b1: -(1 + c) / a0, b2: (1 + c) / 2 / a0, a1: -2 * c / a0, a2: (1 - alpha) / a0, z1: 0, z2: 0 }; }
function highShelf(sampleRate, frequency = 1500, gainDb = 4, slope = 1) { const A = 10 ** (gainDb / 40), w = 2 * Math.PI * frequency / sampleRate, c = Math.cos(w), s = Math.sin(w), alpha = s / 2 * Math.sqrt((A + 1 / A) * (1 / slope - 1) + 2), root = 2 * Math.sqrt(A) * alpha, a0 = (A + 1) - (A - 1) * c + root; return { b0: A * ((A + 1) + (A - 1) * c + root) / a0, b1: -2 * A * ((A - 1) + (A + 1) * c) / a0, b2: A * ((A + 1) + (A - 1) * c - root) / a0, a1: 2 * ((A - 1) - (A + 1) * c) / a0, a2: ((A + 1) - (A - 1) * c - root) / a0, z1: 0, z2: 0 }; }
function filter(x, f) { const y = f.b0 * x + f.z1; f.z1 = f.b1 * x - f.a1 * y + f.z2; f.z2 = f.b2 * x - f.a2 * y; return y; }
function kWeight(x, shelf, hp) { return filter(filter(x, shelf), hp); }
function fft(real, imag) {
    const n = real.length;
    for (let i = 1, j = 0; i < n; i++) {
        let bit = n >> 1;
        for (; j & bit; bit >>= 1)
            j ^= bit;
        j ^= bit;
        if (i < j) {
            [real[i], real[j]] = [real[j], real[i]];
        }
    }
    for (let size = 2; size <= n; size *= 2) {
        const angle = -2 * Math.PI / size, wr = Math.cos(angle), wi = Math.sin(angle);
        for (let start = 0; start < n; start += size) {
            let xr = 1, xi = 0;
            for (let i = 0; i < size / 2; i++) {
                const a = start + i, b = a + size / 2, tr = xr * real[b] - xi * imag[b], ti = xr * imag[b] + xi * real[b];
                real[b] = real[a] - tr;
                imag[b] = imag[a] - ti;
                real[a] += tr;
                imag[a] += ti;
                const next = xr * wr - xi * wi;
                xi = xr * wi + xi * wr;
                xr = next;
            }
        }
    }
}
function loudnessFromBuckets(sums, counts, bucketCount, hop) { const out = []; for (let start = 0; start + bucketCount <= sums.length; start += hop) {
    let e = 0, n = 0;
    for (let i = start; i < start + bucketCount; i++) {
        e += sums[i];
        n += counts[i];
    }
    if (n) {
        const energy = e / n, value = lufs(energy);
        if (value !== null)
            out.push({ energy, lufs: value });
    }
} return out; }
function integratedLoudness(sums, counts) { const blocks = loudnessFromBuckets(sums, counts, 4, 1).filter(x => x.lufs > -70); if (!blocks.length)
    return null; const first = lufs(blocks.reduce((a, b) => a + b.energy, 0) / blocks.length); if (first === null)
    return null; const gated = blocks.filter(x => x.lufs > first - 10); return gated.length ? lufs(gated.reduce((a, b) => a + b.energy, 0) / gated.length) : null; }
function loudnessRange(sums, counts, integrated) { if (integrated === null)
    return null; const values = loudnessFromBuckets(sums, counts, 30, 10).map(x => x.lufs).filter(x => x > -70 && x > integrated - 20); const p10 = percentile(values, .1), p95 = percentile(values, .95); return p10 === null || p95 === null ? null : p95 - p10; }
function truePeakEstimate(channels) { let peak = 0; for (const c of channels) {
    if (!c.length)
        continue;
    peak = Math.max(peak, Math.abs(c[0]), Math.abs(c[c.length - 1]));
    for (let i = 1; i < c.length - 2; i++) {
        const p0 = c[i - 1], p1 = c[i], p2 = c[i + 1], p3 = c[i + 2];
        const local = Math.max(Math.abs(p0), Math.abs(p1), Math.abs(p2), Math.abs(p3));
        if (local < peak * .55)
            continue;
        for (const t of [.25, .5, .75]) {
            const t2 = t * t, t3 = t2 * t, v = .5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
            peak = Math.max(peak, Math.abs(v));
        }
    }
} return db(peak); }
function detectBpm(onsets, secondsPerFrame) { if (onsets.length < 12)
    return { bpm: null, confidence: null }; const avg = onsets.reduce((a, b) => a + b, 0) / onsets.length, variance = onsets.reduce((a, b) => a + (b - avg) ** 2, 0) / onsets.length; if (avg <= 1e-9 || Math.sqrt(variance) / avg < .025)
    return { bpm: null, confidence: null }; const flux = onsets.map((v, i) => i ? Math.max(0, v - onsets[i - 1]) : 0), mean = flux.reduce((a, b) => a + b, 0) / flux.length, centered = flux.map(v => Math.max(0, v - mean)); let total = 0; for (const v of centered)
    total += v * v; if (total < 1e-10)
    return { bpm: null, confidence: null }; let best = 0, bestLag = 0; const minLag = Math.max(1, Math.floor(60 / (200 * secondsPerFrame))), maxLag = Math.min(centered.length - 2, Math.ceil(60 / (60 * secondsPerFrame))); for (let lag = minLag; lag <= maxLag; lag++) {
    let score = 0, norm = 0;
    for (let i = lag; i < centered.length; i++) {
        score += centered[i] * centered[i - lag];
        norm += centered[i] * centered[i] + centered[i - lag] * centered[i - lag];
    }
    const normalized = norm ? 2 * score / norm : 0;
    if (normalized > best) {
        best = normalized;
        bestLag = lag;
    }
} if (!bestLag || best < .14)
    return { bpm: null, confidence: null }; let bpm = 60 / (bestLag * secondsPerFrame); while (bpm < 80)
    bpm *= 2; while (bpm > 180)
    bpm /= 2; return { bpm: Math.round(bpm * 10) / 10, confidence: clamp(best, 0, 1) }; }
const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const keyNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function pearson(a, b) { const am = a.reduce((x, y) => x + y, 0) / a.length, bm = b.reduce((x, y) => x + y, 0) / b.length; let x = 0, y = 0, z = 0; for (let i = 0; i < a.length; i++) {
    const da = a[i] - am, db = b[i] - bm;
    x += da * db;
    y += da * da;
    z += db * db;
} return y * z > 0 ? x / Math.sqrt(y * z) : 0; }
function detectKey(chroma) { const sum = Array.from(chroma).reduce((a, b) => a + b, 0); if (sum < 1e-12)
    return { key: null, confidence: null }; const values = Array.from(chroma, v => v / sum); let best = -Infinity, second = -Infinity, label = ''; for (let root = 0; root < 12; root++) {
    for (const [mode, profile] of [['major', majorProfile], ['minor', minorProfile]]) {
        const rotated = profile.map((_, i) => profile[(i - root + 12) % 12]), score = pearson(values, rotated);
        if (score > best) {
            second = best;
            best = score;
            label = `${keyNames[root]} ${mode}`;
        }
        else if (score > second)
            second = score;
    }
} const confidence = clamp((best - second + .08) / .45, 0, 1); return confidence < .22 ? { key: null, confidence } : { key: label, confidence }; }
function waveformSummary(channels, points = 256) { const n = channels[0].length, out = []; for (let p = 0; p < points; p++) {
    const start = Math.floor(p * n / points), end = Math.max(start + 1, Math.floor((p + 1) * n / points));
    let lo = 1, hi = -1;
    for (let i = start; i < end; i++) {
        let x = 0;
        for (const c of channels)
            x += c[i];
        x /= channels.length;
        lo = Math.min(lo, x);
        hi = Math.max(hi, x);
    }
    out.push({ min: lo, max: hi });
} return out; }
function spectralRows(framePowers, step, ceiling, bins = 64) { const minHz = 20, maxHz = Math.max(minHzSafe(ceiling), 20), matrix = []; let maxDb = -Infinity; for (const power of framePowers) {
    for (let b = 0; b < bins; b++) {
        const a = minHz * (maxHz / minHz) ** (b / bins), z = minHz * (maxHz / minHz) ** ((b + 1) / bins), ka = Math.max(1, Math.floor(a / step)), kz = Math.min(power.length - 1, Math.ceil(z / step));
        let energy = 0;
        for (let k = ka; k <= kz; k++)
            energy += power[k];
        const value = 10 * Math.log10(Math.max(energy, 1e-20));
        matrix.push(value);
        maxDb = Math.max(maxDb, value);
    }
} return { frames: framePowers.length, bins, minHz, maxHz, values: matrix.map(v => clamp((v - (maxDb - 80)) / 80, 0, 1)) }; }
function minHzSafe(v) { return Math.max(20, Math.min(20000, v)); }
/** Professional bounded offline analyzer. Loudness follows a BS.1770-style K-weighted gated implementation.
 * True peak is a 4x cubic inter-sample estimate; it is not a certification meter. */
async function measurePCM(channels, sampleRate, signal) {
    const n = channels[0]?.length ?? 0;
    if (!n || channels.length > 2 || !channels.every(c => c.length === n) || !Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000 || n / sampleRate > 900)
        throw Error('Нужно моно/стерео аудио до 15 минут, 8–192 кГц.');
    let peak = 0, power = 0, clipped = 0, silent = 0, longestSilent = 0, currentSilent = 0, left = 0, right = 0, cross = 0, sumL = 0, sumR = 0, mid = 0, side = 0;
    const dc = channels.map(() => 0), bucketSamples = Math.max(1, Math.round(sampleRate * .1)), bucketEnergy = [], bucketCounts = [], onsetHop = 1024, onsetEnergy = [];
    let bucketSum = 0, bucketCount = 0, onsetSum = 0, onsetCount = 0;
    const shelves = channels.map(() => highShelf(sampleRate)), highpasses = channels.map(() => highPass(sampleRate));
    const silenceThreshold = 10 ** (-60 / 20);
    for (let start = 0; start < n; start += 65536) {
        signal?.throwIfAborted();
        const end = Math.min(n, start + 65536);
        for (let i = start; i < end; i++) {
            let instant = 0, maxAbs = 0;
            for (let c = 0; c < channels.length; c++) {
                const x = channels[c][i];
                if (!Number.isFinite(x))
                    throw Error('Аудио содержит недопустимые PCM-значения.');
                dc[c] += x;
                power += x * x;
                peak = Math.max(peak, Math.abs(x));
                maxAbs = Math.max(maxAbs, Math.abs(x));
                if (Math.abs(x) >= .9999)
                    clipped++;
                const y = kWeight(x, shelves[c], highpasses[c]);
                instant += y * y;
            }
            bucketSum += instant;
            bucketCount++;
            if (bucketCount >= bucketSamples) {
                bucketEnergy.push(bucketSum);
                bucketCounts.push(bucketCount);
                bucketSum = 0;
                bucketCount = 0;
            }
            let monoEnergy = 0;
            for (const c of channels)
                monoEnergy += c[i] * c[i];
            onsetSum += monoEnergy / channels.length;
            onsetCount++;
            if (onsetCount >= onsetHop) {
                onsetEnergy.push(Math.sqrt(onsetSum / onsetCount));
                onsetSum = 0;
                onsetCount = 0;
            }
            if (maxAbs < silenceThreshold) {
                silent++;
                currentSilent++;
                longestSilent = Math.max(longestSilent, currentSilent);
            }
            else
                currentSilent = 0;
            if (channels.length === 2) {
                const l = channels[0][i], r = channels[1][i];
                sumL += l;
                sumR += r;
                left += l * l;
                right += r * r;
                cross += l * r;
                const m = (l + r) * .5, s = (l - r) * .5;
                mid += m * m;
                side += s * s;
            }
        }
        if (start % 1048576 === 0)
            await new Promise(resolve => setTimeout(resolve, 0));
    }
    if (bucketCount) {
        bucketEnergy.push(bucketSum);
        bucketCounts.push(bucketCount);
    }
    if (onsetCount)
        onsetEnergy.push(Math.sqrt(onsetSum / onsetCount));
    const rms = Math.sqrt(power / (n * channels.length)), integrated = integratedLoudness(bucketEnergy, bucketCounts), short = loudnessFromBuckets(bucketEnergy, bucketCounts, 30, 10).map(x => x.lufs), size = 4096, frames = Math.min(128, Math.max(1, Math.floor(n / size))), spectrum = new Float64Array(size / 2 + 1), framePowers = [], chroma = new Float64Array(12);
    for (let frame = 0; frame < frames; frame++) {
        signal?.throwIfAborted();
        const start = frames === 1 ? 0 : Math.round(frame * Math.max(0, n - size) / (frames - 1)), framePower = new Float64Array(size / 2 + 1);
        for (const c of channels) {
            const real = new Float64Array(size), imag = new Float64Array(size);
            let mean = 0;
            const length = Math.min(size, n - start);
            for (let j = 0; j < length; j++)
                mean += c[start + j];
            mean /= length;
            for (let j = 0; j < length; j++)
                real[j] = (c[start + j] - mean) * .5 * (1 - Math.cos(2 * Math.PI * j / (size - 1)));
            fft(real, imag);
            for (let k = 1; k <= size / 2; k++) {
                const v = (real[k] ** 2 + imag[k] ** 2) * (k === size / 2 ? 1 : 2);
                spectrum[k] += v;
                framePower[k] += v;
            }
        }
        framePowers.push(framePower);
        if (frame % 8 === 0)
            await new Promise(resolve => setTimeout(resolve, 0));
    }
    let total = 0, weighted = 0, max = 0, dominant = 0;
    const energy = ranges.map(() => 0), step = sampleRate / size, ceiling = Math.min(20000, sampleRate / 2);
    for (let k = 1; k < spectrum.length; k++) {
        const hz = k * step;
        if (hz >= 55 && hz <= 5000) {
            const midi = Math.round(69 + 12 * Math.log2(hz / 440)), pc = ((midi % 12) + 12) % 12;
            chroma[pc] += spectrum[k];
        }
        if (hz < 20 || hz > ceiling)
            continue;
        const value = spectrum[k];
        total += value;
        weighted += value * hz;
        if (value > max) {
            max = value;
            dominant = hz;
        }
        const band = ranges.findIndex(([from, to]) => hz >= from && (hz < to || hz === ceiling && hz === to));
        if (band >= 0)
            energy[band] += value;
    }
    const covariance = cross - sumL * sumR / n, varianceL = Math.max(0, left - sumL ** 2 / n), varianceR = Math.max(0, right - sumR ** 2 / n), bpm = detectBpm(onsetEnergy, onsetHop / sampleRate), key = detectKey(chroma), truePeak = truePeakEstimate(channels), spectrogram = spectralRows(framePowers, step, ceiling);
    const chromaSum = Array.from(chroma).reduce((a, b) => a + b, 0), pitchClassProfile = Array.from(chroma, v => chromaSum > 1e-18 ? v / chromaSum : 0);
    return { durationSeconds: n / sampleRate, sampleRate, channels: channels.length, integratedLufs: integrated, shortTermLufsMax: short.length ? Math.max(...short) : integrated, loudnessRangeLu: loudnessRange(bucketEnergy, bucketCounts, integrated), peakDbFS: db(peak), truePeakDbTP: truePeak, rmsDbFS: db(rms), crestDb: peak && rms ? 20 * Math.log10(peak / rms) : null, clippedSamplePercent: clipped / (n * channels.length) * 100, silencePercent: silent / n * 100, longestSilenceSeconds: longestSilent / sampleRate, dcOffsetPercent: Math.max(...dc.map(x => Math.abs(x / n))) * 100, stereoCorrelation: channels.length === 2 && varianceL * varianceR > 0 ? clamp(covariance / Math.sqrt(varianceL * varianceR), -1, 1) : null, stereoWidthPercent: channels.length === 2 ? (mid > 1e-18 ? clamp(Math.sqrt(side / mid) * 100, 0, 400) : side > 1e-18 ? 400 : null) : null, bpm: bpm.bpm, bpmConfidence: bpm.confidence, detectedKey: key.key, keyConfidence: key.confidence, spectralCentroidHz: total > 1e-18 ? weighted / total : null, dominantFrequencyHz: total > 1e-18 ? dominant : null, pitchClassProfile, bands: ranges.map(([from, to], i) => ({ label: rangeLabels[i], fromHz: from, toHz: to, analyzedToHz: from < ceiling ? Math.min(to, ceiling) : null, energyPercent: from >= ceiling || total <= 1e-18 ? null : energy[i] / total * 100 })), waveform: waveformSummary(channels), spectrogram, spectrum: { fftSize: size, window: 'Hann', frames, frequencyResolutionHz: step, sampled: frames * size < n }, method: { loudness: 'BS.1770-style K-weighting, 400 ms blocks, absolute -70 LUFS and relative -10 LU gating; LRA from 3 s windows.', truePeak: '4x cubic inter-sample estimate around local peaks; not a certified true-peak meter.', bpm: 'Energy-onset autocorrelation, bounded 60–200 BPM search with octave normalization.', key: 'FFT chroma correlated against major/minor tonal profiles.' }, note: 'Профессиональный offline-анализ выполняется по декодированному PCM на устройстве. LUFS/LRA и true peak предназначены для инженерной диагностики, но не заменяют сертифицированный broadcast/mastering meter. null означает отсутствие измеримого сигнала или неприменимую метрику.' };
}
function compareAudio(candidate, reference) {
    const delta = (a, b) => a === null || b === null ? null : a - b, compatible = candidate.bands.every((b, i) => b.analyzedToHz === reference.bands[i].analyzedToHz);
    return { integratedLufsDifference: delta(candidate.integratedLufs, reference.integratedLufs), truePeakDifferenceDb: delta(candidate.truePeakDbTP, reference.truePeakDbTP), loudnessRangeDifferenceLu: delta(candidate.loudnessRangeLu, reference.loudnessRangeLu), rmsDifferenceDb: delta(candidate.rmsDbFS, reference.rmsDbFS), crestDifferenceDb: delta(candidate.crestDb, reference.crestDb), stereoWidthDifferencePercent: delta(candidate.stereoWidthPercent, reference.stereoWidthPercent), bpmDifference: delta(candidate.bpm, reference.bpm), centroidDifferenceHz: compatible ? delta(candidate.spectralCentroidHz, reference.spectralCentroidHz) : null, bandDifferencePercentagePoints: compatible ? candidate.bands.map((b, i) => ({ label: b.label, fromHz: b.fromHz, toHz: b.toHz, difference: delta(b.energyPercent, reference.bands[i].energyPercent) })) : null, note: 'Разница = ваш файл минус референс. Сравнение числовое и не присваивает субъективную оценку качества. При разных диапазонах Nyquist спектральная разница не вычисляется.' };
}
function make(tag, text = '') { const el = document.createElement(tag); el.textContent = text; return el; }
function number(v, digits = 2, suffix = '') { return v === null ? '—' : v.toFixed(digits) + suffix; }
function drawWaveform(canvas, data) { const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1)), w = Math.max(320, canvas.clientWidth || 800), h = 190; canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr); const c = canvas.getContext('2d'); if (!c)
    return; c.scale(dpr, dpr); c.fillStyle = '#09090f'; c.fillRect(0, 0, w, h); c.strokeStyle = '#282130'; c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke(); c.strokeStyle = '#b99ae8'; c.beginPath(); data.forEach((p, i) => { const x = i * w / (data.length - 1 || 1), y1 = h / 2 - p.max * h * .44, y2 = h / 2 - p.min * h * .44; c.moveTo(x, y1); c.lineTo(x, y2); }); c.stroke(); }
function drawSpectrogram(canvas, s) { const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1)), w = Math.max(320, canvas.clientWidth || 800), h = 240; canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr); const c = canvas.getContext('2d'); if (!c)
    return; c.scale(dpr, dpr); c.fillStyle = '#09090f'; c.fillRect(0, 0, w, h); if (!s.frames || !s.bins)
    return; const fw = w / s.frames, bh = h / s.bins; for (let f = 0; f < s.frames; f++)
    for (let b = 0; b < s.bins; b++) {
        const v = s.values[f * s.bins + b] ?? 0, light = 8 + v * 58;
        c.fillStyle = `hsl(${268 - v * 38} 46% ${light}%)`;
        c.fillRect(f * fw, h - (b + 1) * bh, Math.ceil(fw + 1), Math.ceil(bh + 1));
    } c.fillStyle = '#b7acc3'; c.font = '10px sans-serif'; c.fillText(`${Math.round(s.maxHz / 1000)} kHz`, 8, 14); c.fillText('20 Hz', 8, h - 7); }
function metric(label, value, detail = '') { const card = make('article'); card.className = 'audio-metric'; const small = make('small', label), strong = make('strong', value); card.append(small, strong); if (detail)
    card.append(make('span', detail)); return card; }
function renderAudioReport(host, value, reference) {
    const comparison = reference ? compareAudio(value, reference) : undefined, wrap = make('div');
    wrap.className = 'audio-report';
    const head = make('div');
    head.className = 'audio-report-head';
    const title = make('div');
    title.append(make('small', 'MASTERING ANALYSIS'), make('strong', `${value.channels === 2 ? 'Stereo' : 'Mono'} · ${Math.round(value.sampleRate / 1000)} kHz · ${value.durationSeconds.toFixed(1)} s`));
    head.append(title);
    if (reference)
        head.append(metric('REFERENCE', 'Loaded', 'numeric comparison'));
    wrap.append(head);
    const loud = make('section');
    loud.className = 'audio-meter-section';
    const loudHead = make('div');
    loudHead.className = 'section-heading';
    loudHead.append(make('h3', 'Loudness & Dynamics'), make('span', 'LUFS · LRA · dBTP'));
    loud.append(loudHead);
    const grid = make('div');
    grid.className = 'audio-metric-grid';
    grid.append(metric('INTEGRATED LUFS', number(value.integratedLufs, 1, ' LUFS')), metric('SHORT-TERM LUFS', number(value.shortTermLufsMax, 1, ' LUFS'), 'max 3 s'), metric('LOUDNESS RANGE', number(value.loudnessRangeLu, 1, ' LU')), metric('TRUE PEAK', number(value.truePeakDbTP, 2, ' dBTP'), 'estimated'), metric('RMS', number(value.rmsDbFS, 2, ' dBFS')), metric('CREST FACTOR', number(value.crestDb, 2, ' dB')), metric('CLIPPING', number(value.clippedSamplePercent, 4, ' %')), metric('SILENCE', number(value.silencePercent, 2, ' %')), metric('DC OFFSET', number(value.dcOffsetPercent, 4, ' %')));
    loud.append(grid);
    wrap.append(loud);
    const stereo = make('section');
    stereo.className = 'audio-meter-section';
    const stereoHead = make('div');
    stereoHead.className = 'section-heading';
    stereoHead.append(make('h3', 'Stereo & Musical'), make('span', 'correlation · width · BPM · key'));
    stereo.append(stereoHead);
    const stereoGrid = make('div');
    stereoGrid.className = 'audio-metric-grid';
    stereoGrid.append(metric('CORRELATION', number(value.stereoCorrelation, 3)), metric('STEREO WIDTH', number(value.stereoWidthPercent, 1, ' %')), metric('BPM', number(value.bpm, 1), value.bpmConfidence === null ? '' : `confidence ${(value.bpmConfidence * 100).toFixed(0)}%`), metric('KEY', value.detectedKey ?? '—', value.keyConfidence === null ? '' : `confidence ${(value.keyConfidence * 100).toFixed(0)}%`), metric('SPECTRAL CENTROID', number(value.spectralCentroidHz, 0, ' Hz')), metric('LONGEST SILENCE', number(value.longestSilenceSeconds, 2, ' s')));
    stereo.append(stereoGrid);
    wrap.append(stereo);
    const visuals = make('div');
    visuals.className = 'audio-visual-grid';
    const wave = make('section'), spec = make('section');
    wave.innerHTML = '<div class="section-heading"><h3>Waveform</h3><span>PCM envelope</span></div><canvas aria-label="Waveform"></canvas>';
    spec.innerHTML = '<div class="section-heading"><h3>Spectrogram</h3><span>20 Hz–Nyquist</span></div><canvas aria-label="Spectrogram"></canvas>';
    visuals.append(wave, spec);
    wrap.append(visuals);
    const bands = make('section');
    bands.className = 'audio-meter-section';
    const bandHead = make('div');
    bandHead.className = 'section-heading';
    bandHead.append(make('h3', 'Spectral Balance'), make('span', 'normalized energy'));
    bands.append(bandHead);
    const bandGrid = make('div');
    bandGrid.className = 'audio-band-grid';
    for (const b of value.bands) {
        const card = metric(`${b.label} · ${b.fromHz}–${b.toHz} Hz`, number(b.energyPercent, 1, ' %'), b.analyzedToHz !== null && b.analyzedToHz < b.toHz ? `measured to ${Math.round(b.analyzedToHz)} Hz` : '');
        bandGrid.append(card);
    }
    bands.append(bandGrid);
    wrap.append(bands);
    if (reference && comparison) {
        const compare = make('section');
        compare.className = 'audio-meter-section';
        const ch = make('div');
        ch.className = 'section-heading';
        ch.append(make('h3', 'Reference Comparison'), make('span', 'candidate − reference'));
        compare.append(ch);
        const cg = make('div');
        cg.className = 'audio-metric-grid';
        cg.append(metric('Δ INTEGRATED', number(comparison.integratedLufsDifference, 1, ' LU')), metric('Δ TRUE PEAK', number(comparison.truePeakDifferenceDb, 2, ' dB')), metric('Δ LRA', number(comparison.loudnessRangeDifferenceLu, 1, ' LU')), metric('Δ RMS', number(comparison.rmsDifferenceDb, 2, ' dB')), metric('Δ WIDTH', number(comparison.stereoWidthDifferencePercent, 1, ' %')), metric('Δ BPM', number(comparison.bpmDifference, 1, ' BPM')));
        compare.append(cg, make('p', comparison.note));
        wrap.append(compare);
    }
    const details = make('details');
    details.className = 'audio-method';
    details.append(make('summary', 'Methodology & raw report'));
    const report = { candidate: value, ...(reference ? { reference, comparison } : {}) };
    details.append(make('pre', JSON.stringify(report, null, 2)));
    wrap.append(details);
    const actions = make('div');
    actions.className = 'toolbar';
    const save = make('button', 'Export Report JSON');
    save.onclick = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })), link = make('a'); link.href = url; link.download = 'azrail-audio-lab-report.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000); };
    actions.append(save);
    wrap.append(actions, make('p', value.note));
    host.replaceChildren(wrap);
    drawWaveform(wave.querySelector('canvas'), value.waveform);
    drawSpectrogram(spec.querySelector('canvas'), value.spectrogram);
}

},
"ui/components/command-palette":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountCommandPalette = mountCommandPalette;
function mountCommandPalette(actions) {
    const dialog = document.createElement('dialog');
    dialog.className = 'command-palette';
    dialog.setAttribute('aria-label', 'Command Palette');
    const input = document.createElement('input');
    input.type = 'search';
    input.placeholder = 'Команда, студия, модель, история…';
    input.setAttribute('aria-label', 'Поиск команд');
    const list = document.createElement('div');
    list.className = 'command-palette-list';
    dialog.append(input, list);
    document.body.append(dialog);
    let filtered = [];
    function render() { const q = input.value.trim().toLowerCase(); filtered = actions().filter(a => !a.disabled?.()).filter(a => !q || [a.label, ...(a.keywords ?? [])].join(' ').toLowerCase().includes(q)).slice(0, 18); list.replaceChildren(); for (const action of filtered) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'command-palette-item';
        b.textContent = action.label;
        b.onclick = () => { dialog.close(); Promise.resolve(action.run()).catch(error => console.error(error)); };
        list.append(b);
    } if (!filtered.length) {
        const empty = document.createElement('p');
        empty.className = 'muted';
        empty.textContent = 'Команда не найдена.';
        list.append(empty);
    } }
    function open() { input.value = ''; render(); if (!dialog.open)
        dialog.showModal(); queueMicrotask(() => input.focus()); }
    input.oninput = render;
    input.onkeydown = e => { if (e.key === 'Enter' && filtered[0]) {
        e.preventDefault();
        dialog.close();
        void Promise.resolve(filtered[0].run());
    } if (e.key === 'Escape')
        dialog.close(); };
    dialog.addEventListener('click', event => { if (event.target === dialog)
        dialog.close(); });
    const key = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        open();
    } };
    document.addEventListener('keydown', key);
    return { open, destroy() { document.removeEventListener('keydown', key); dialog.remove(); } };
}

},
"ui/components/compare-mode":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountCompareMode = mountCompareMode;
function mountCompareMode(host) {
    let a = null, b = null;
    const shell = document.createElement('section');
    shell.className = 'compare-mode';
    shell.hidden = true;
    const head = document.createElement('div');
    head.className = 'section-heading';
    head.innerHTML = '<h3>Compare Mode · A | B</h3><span class="muted">Сравнение без изменения исходных версий</span>';
    const grid = document.createElement('div');
    grid.className = 'compare-mode-grid';
    const left = document.createElement('div'), right = document.createElement('div');
    left.className = 'compare-side';
    right.className = 'compare-side';
    grid.append(left, right);
    shell.append(head, grid);
    host.append(shell);
    const draw = () => { shell.hidden = !(a || b); left.replaceChildren(); right.replaceChildren(); if (a) {
        const h = document.createElement('strong');
        h.textContent = 'A · ' + a.label;
        left.append(h);
        a.render(left);
    }
    else
        left.textContent = 'Выберите A'; if (b) {
        const h = document.createElement('strong');
        h.textContent = 'B · ' + b.label;
        right.append(h);
        b.render(right);
    }
    else
        right.textContent = 'Выберите B'; };
    return { setA(item) { a = item; draw(); }, setB(item) { b = item; draw(); }, clear() { a = b = null; draw(); }, destroy() { shell.remove(); } };
}

},
"ui/components/dom":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeElement = makeElement;
exports.makeLabel = makeLabel;
/** Small DOM primitives shared by studio/settings UI. Text is always assigned via textContent. */
function makeElement(tag, text = "") {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
}
function makeLabel(text, control) {
    const label = document.createElement("label");
    label.append(document.createTextNode(text), control);
    return label;
}

},
"ui/components/error-recovery":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderRecoveryError = renderRecoveryError;
const dom_1 = require("./dom");
function renderRecoveryError(host, error, actions = {}) {
    const message = error instanceof Error ? error.message : String(error || 'Unknown error');
    host.replaceChildren();
    const box = (0, dom_1.makeElement)('section');
    box.className = 'studio-recovery';
    box.setAttribute('role', 'alert');
    box.append((0, dom_1.makeElement)('strong', 'Studio encountered an error'), (0, dom_1.makeElement)('p', 'Your work and current parameters are preserved.'), (0, dom_1.makeElement)('pre', message));
    const bar = (0, dom_1.makeElement)('div');
    bar.className = 'toolbar';
    const add = (label, fn) => { if (!fn)
        return; const b = (0, dom_1.makeElement)('button', label); b.type = 'button'; b.onclick = () => void Promise.resolve(fn()).catch(() => { }); bar.append(b); };
    add('Retry', actions.retry);
    add('Restore last stable state', actions.restore);
    add('Open logs', actions.openLogs);
    add('Report', actions.report);
    box.append(bar);
    host.append(box);
}

},
"ui/components/module-frame":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUniversalModuleAction = registerUniversalModuleAction;
exports.listUniversalModuleActions = listUniversalModuleActions;
exports.mountModuleFrameActions = mountModuleFrameActions;
const editableSelector = 'input:not([type=file]):not([type=password]),textarea,select';
const pluginActions = new Map();
const HISTORY_LIMIT = 80;
const SNAPSHOT_LIMIT = 60;
function registerUniversalModuleAction(action) {
    if (!action.id.trim())
        throw new Error('Module action id is required.');
    if (pluginActions.has(action.id))
        throw new Error(`Module action already registered: ${action.id}`);
    const id = action.id.trim();
    pluginActions.set(id, { ...action, id });
    return () => { pluginActions.delete(id); };
}
function listUniversalModuleActions() { return [...pluginActions.values()].map(action => ({ ...action })); }
function shortcutMatches(event, keys) {
    const parts = keys.toLowerCase().split('+').map(v => v.trim()).filter(Boolean), key = parts.at(-1) ?? '';
    const meta = parts.includes('cmd') || parts.includes('meta'), ctrl = parts.includes('ctrl'), alt = parts.includes('alt'), shift = parts.includes('shift');
    const eventKey = event.key.toLowerCase();
    const keyMatch = key === 'enter' ? event.key === 'Enter' : key === 'escape' ? event.key === 'Escape' : eventKey === key;
    return keyMatch && event.metaKey === meta && event.ctrlKey === ctrl && event.altKey === alt && event.shiftKey === shift;
}
function safeStorageGet(key) { try {
    return localStorage.getItem(key);
}
catch {
    return null;
} }
function safeStorageSet(key, value) { try {
    localStorage.setItem(key, value);
}
catch { } }
function safeParse(value, fallback) { if (!value)
    return fallback; try {
    return JSON.parse(value);
}
catch {
    return fallback;
} }
function labelStatus(status) { return status.replace('_', ' '); }
function actionHistory(kind, label, snapshot) { return { id: crypto.randomUUID(), at: Date.now(), kind, label, snapshot }; }
function mountModuleFrameActions(host, moduleId, options = {}) {
    const sourceNodes = [...host.childNodes];
    if (!sourceNodes.length)
        return emptyController();
    const root = document.createElement('section');
    root.className = 'module-frame';
    host.replaceChildren(root);
    root.append(...sourceNodes);
    const persistKey = options.persistKey ?? `azrail.module.${moduleId}`;
    const saved = safeParse(safeStorageGet(persistKey), {});
    const definition = {
        id: options.definition?.id ?? moduleId,
        type: options.definition?.type ?? 'module',
        title: saved.title ?? options.definition?.title ?? 'MODULE',
        status: options.definition?.status ?? 'idle',
        capabilities: [...(options.definition?.capabilities ?? [])],
        actions: [...(options.definition?.actions ?? ['collapse', 'expand', 'duplicate', 'delete', 'pin', 'lock', 'rename', 'move', 'settings', 'reset', 'undo', 'redo', 'retry', 'history'])],
        permissions: [...(options.permissions ?? options.definition?.permissions ?? [])],
        resourceUsage: { ...(options.definition?.resourceUsage ?? {}) },
        history: [...(saved.history ?? options.definition?.history ?? [])].slice(-HISTORY_LIMIT),
        workspaceId: saved.workspaceId ?? options.definition?.workspaceId ?? options.workspaces?.[0]?.id ?? 'default',
    };
    root.dataset.moduleId = moduleId;
    root.dataset.workspace = definition.workspaceId ?? 'default';
    const frameChildren = [...root.children];
    const bar = document.createElement('div');
    bar.className = 'module-frame-actions';
    bar.setAttribute('aria-label', 'Действия модуля');
    const grip = document.createElement('button');
    grip.type = 'button';
    grip.className = 'module-grip';
    grip.textContent = '⋮⋮';
    grip.title = 'Drag handle / Grip';
    grip.setAttribute('aria-label', 'Перетащить модуль');
    grip.draggable = true;
    const title = document.createElement('span');
    title.className = 'module-frame-label';
    title.textContent = definition.title;
    const workspace = document.createElement('span');
    workspace.className = 'module-workspace-label';
    workspace.textContent = definition.workspaceId ?? 'default';
    workspace.title = 'Workspace';
    workspace.hidden = (options.workspaces?.length ?? 0) < 2;
    const status = document.createElement('span');
    status.className = 'module-status';
    status.textContent = labelStatus(definition.status);
    status.dataset.status = definition.status;
    status.title = 'Live status';
    const resource = document.createElement('span');
    resource.className = 'module-resource-usage';
    resource.title = 'Resource Usage';
    const actionHost = document.createElement('div');
    actionHost.className = 'module-frame-buttons module-frame-buttons-primary';
    const more = document.createElement('details');
    more.className = 'module-frame-more';
    const moreSummary = document.createElement('summary');
    moreSummary.textContent = '•••';
    moreSummary.title = 'More module actions';
    moreSummary.setAttribute('aria-label', 'Дополнительные действия модуля');
    const moreHost = document.createElement('div');
    moreHost.className = 'module-frame-more-menu';
    more.append(moreSummary, moreHost);
    const panel = document.createElement('section');
    panel.className = 'module-frame-panel';
    panel.hidden = true;
    const errorBox = document.createElement('section');
    errorBox.className = 'module-frame-error';
    errorBox.hidden = true;
    errorBox.setAttribute('role', 'alert');
    bar.append(grip, title, workspace, status, resource, actionHost, more);
    root.prepend(errorBox, panel, bar);
    const content = frameChildren;
    const fields = () => [...root.querySelectorAll(editableSelector)].filter(field => !bar.contains(field) && !panel.contains(field) && !!field.id);
    const capture = () => Object.fromEntries(fields().map(field => [field.id, field instanceof HTMLInputElement && (field.type === 'checkbox' || field.type === 'radio') ? field.checked : field.value]));
    const restore = (snapshot) => { for (const field of fields()) {
        if (!(field.id in snapshot))
            continue;
        const next = snapshot[field.id];
        if (field instanceof HTMLInputElement && (field.type === 'checkbox' || field.type === 'radio'))
            field.checked = Boolean(next);
        else
            field.value = String(next);
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
    } };
    const initial = capture(), undoStack = [initial], redoStack = [];
    let collapsed = Boolean(saved.collapsed), locked = Boolean(saved.locked), pinned = Boolean(saved.pinned), destroyed = false, inputTimer = 0, retrying;
    const dynamicActions = new Map();
    const hasPermission = (permission) => !permission || definition.permissions.includes(permission) || definition.permissions.includes('*');
    const hasCapability = (capability) => !capability || definition.capabilities.includes(capability) || definition.capabilities.includes('*');
    const hasCoreAction = (id) => !['collapse', 'expand', 'duplicate', 'delete', 'pin', 'lock', 'rename', 'move', 'settings', 'reset', 'undo', 'redo', 'retry', 'history'].includes(id) || definition.actions.includes(id);
    const persist = () => safeStorageSet(persistKey, JSON.stringify({ title: definition.title, collapsed, locked, pinned, workspaceId: definition.workspaceId, history: definition.history?.slice(-HISTORY_LIMIT).map(({ snapshot, ...entry }) => entry) }));
    const pushHistory = (entry) => { definition.history ??= []; definition.history.push(entry); if (definition.history.length > HISTORY_LIMIT)
        definition.history.splice(0, definition.history.length - HISTORY_LIMIT); persist(); };
    const recordHistory = (label, kind = 'action') => pushHistory(actionHistory(kind, label, capture()));
    const renderResource = () => { const entries = Object.entries(definition.resourceUsage ?? {}); resource.hidden = !entries.length; resource.textContent = entries.map(([key, value]) => `${key} ${value}`).join(' · '); };
    const renderStatus = (next, label) => { definition.status = next; status.textContent = label ?? labelStatus(next); status.dataset.status = next; root.dataset.status = next; root.setAttribute('aria-busy', String(next === 'loading' || next === 'running' || next === 'retrying')); };
    const setCollapsed = (next) => { collapsed = next; root.dataset.collapsed = String(next); for (const child of content)
        child.hidden = next; collapse.textContent = next ? 'Expand' : 'Collapse'; collapse.title = next ? 'Expand module' : 'Collapse module'; persist(); };
    const setLocked = (next) => { locked = next; root.dataset.locked = String(next); for (const control of root.querySelectorAll('input,textarea,select,button'))
        if (!bar.contains(control) && !panel.contains(control) && control !== retryButton)
            control.disabled = next; lock.textContent = next ? 'Unlock' : 'Lock'; persist(); };
    const setPinned = (next) => { pinned = next; root.dataset.pinned = String(next); pin.textContent = pinned ? 'Unpin' : 'Pin'; persist(); };
    const commitSnapshot = (label) => { const snap = capture(), last = undoStack.at(-1); if (JSON.stringify(last) === JSON.stringify(snap))
        return; undoStack.push(snap); if (undoStack.length > SNAPSHOT_LIMIT)
        undoStack.shift(); redoStack.length = 0; pushHistory(actionHistory('state', label, snap)); updateUndoButtons(); };
    const undo = () => { if (undoStack.length < 2)
        return false; const current = undoStack.pop(); redoStack.push(current); const previous = undoStack.at(-1); restore(previous); pushHistory(actionHistory('undo', 'Undo', previous)); updateUndoButtons(); return true; };
    const redo = () => { const next = redoStack.pop(); if (!next)
        return false; undoStack.push(next); restore(next); pushHistory(actionHistory('redo', 'Redo', next)); updateUndoButtons(); return true; };
    const reset = () => { restore(initial); commitSnapshot('Reset to defaults'); };
    const button = (id, label, tip, fn, permission, placement = 'more') => { const b = document.createElement('button'); b.type = 'button'; b.dataset.moduleAction = id; b.textContent = label; b.title = tip; const allowed = hasPermission(permission) && hasCoreAction(id); b.disabled = !allowed; b.hidden = !allowed; b.setAttribute('aria-disabled', String(!allowed)); b.onclick = () => { if (!allowed)
        return; Promise.resolve(fn()).then(() => { if (id !== 'undo' && id !== 'redo')
        recordHistory(label); if (placement === 'more')
        more.open = false; }).catch(error => setError(error)); }; (placement === 'primary' ? actionHost : moreHost).append(b); return b; };
    const renderHistoryPanel = () => { panel.hidden = false; panel.dataset.panel = 'history'; const entries = [...(definition.history ?? [])].reverse().slice(0, 40); panel.innerHTML = `<div class="module-panel-head"><strong>Module History</strong><button type="button" data-close>Close</button></div>${entries.length ? `<ol class="module-history-list">${entries.map(entry => `<li><time>${new Date(entry.at).toLocaleTimeString()}</time><span>${escapeText(entry.label)}</span><small>${entry.kind}</small></li>`).join('')}</ol>` : '<p class="muted">История модуля пока пуста.</p>'}`; panel.querySelector('[data-close]').onclick = () => panel.hidden = true; };
    const renderSettingsPanel = () => { panel.hidden = false; panel.dataset.panel = 'settings'; const workspaces = options.workspaces ?? []; panel.innerHTML = `<div class="module-panel-head"><strong>Module Settings</strong><button type="button" data-close>Close</button></div><div class="module-settings-grid"><label><input type="checkbox" data-setting="collapsed" ${collapsed ? 'checked' : ''}> Collapsed</label><label><input type="checkbox" data-setting="pinned" ${pinned ? 'checked' : ''}> Pinned</label><label><input type="checkbox" data-setting="locked" ${locked ? 'checked' : ''}> Locked</label>${workspaces.length > 1 ? `<label>Workspace<select data-setting="workspace">${workspaces.map(item => `<option value="${escapeAttr(item.id)}" ${item.id === definition.workspaceId ? 'selected' : ''}>${escapeText(item.label)}</option>`).join('')}</select></label>` : ''}</div><dl class="module-contract"><dt>Type</dt><dd>${escapeText(definition.type)}</dd><dt>Capabilities</dt><dd>${escapeText(definition.capabilities.join(', ') || 'none')}</dd><dt>Permissions</dt><dd>${escapeText(definition.permissions.join(', ') || 'none')}</dd></dl>`; panel.querySelector('[data-close]').onclick = () => panel.hidden = true; panel.querySelector('[data-setting="collapsed"]').onchange = e => setCollapsed(e.currentTarget.checked); panel.querySelector('[data-setting="pinned"]').onchange = e => setPinned(e.currentTarget.checked); panel.querySelector('[data-setting="locked"]').onchange = e => setLocked(e.currentTarget.checked); const select = panel.querySelector('[data-setting="workspace"]'); if (select)
        select.onchange = () => moveWorkspace(select.value); };
    const clearError = () => { root.dataset.error = 'false'; errorBox.hidden = true; errorBox.replaceChildren(); retrying = undefined; if (definition.status === 'failure' || definition.status === 'retrying')
        renderStatus('idle'); };
    const setError = (error, retry) => { const message = error instanceof Error ? error.message : String(error); retrying = retry; renderStatus('failure'); root.dataset.error = 'true'; errorBox.hidden = false; errorBox.replaceChildren(); const text = document.createElement('span'); text.textContent = message; errorBox.append(text); if (retry) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = 'Retry';
        b.onclick = () => { renderStatus('retrying'); Promise.resolve(retry()).catch(next => setError(next, retry)); };
        errorBox.append(b);
    } pushHistory(actionHistory('error', message, capture())); };
    const moveWorkspace = async (workspaceId) => { if (workspaceId === definition.workspaceId)
        return; if (!options.onMove)
        throw new Error('Move between workspaces is not available for this module instance.'); await options.onMove(workspaceId); definition.workspaceId = workspaceId; workspace.textContent = workspaceId; root.dataset.workspace = workspaceId; persist(); recordHistory(`Moved to ${workspaceId}`); };
    const collapse = button('collapse', 'Collapse', 'Collapse / Expand', () => setCollapsed(!collapsed), 'module.view', 'primary');
    const pin = button('pin', 'Pin', 'Pin module', () => setPinned(!pinned), 'module.view', 'primary');
    const lock = button('lock', 'Lock', 'Lock module controls', () => setLocked(!locked), 'module.configure');
    const undoButton = button('undo', 'Undo', 'Undo module field change', () => { if (!undo())
        throw new Error('Nothing to undo.'); }, 'module.configure');
    const redoButton = button('redo', 'Redo', 'Redo module field change', () => { if (!redo())
        throw new Error('Nothing to redo.'); }, 'module.configure');
    const historyButton = button('history', 'History', 'Open Module History', async () => { renderHistoryPanel(); await options.onHistory?.(definition.history ?? []); }, 'module.view');
    button('settings', 'Settings', 'Open Module Settings', async () => { renderSettingsPanel(); await options.onSettings?.(); }, 'module.view');
    button('reset', 'Reset', 'Reset to defaults', reset, 'module.configure');
    button('rename', 'Rename', 'Rename module instance', async () => { const next = prompt('Новое название модуля', definition.title)?.trim(); if (!next || next === definition.title)
        return; await options.onRename?.(next); definition.title = next; title.textContent = next; persist(); }, 'module.configure');
    if ((options.workspaces?.length ?? 0) > 1 && options.onMove)
        button('move', 'Move', 'Move between workspaces', () => renderSettingsPanel(), 'module.configure');
    if (options.canDuplicate && options.onDuplicate)
        button('duplicate', 'Duplicate', 'Duplicate module', options.onDuplicate, 'module.manage');
    if (options.canDelete && options.onDelete)
        button('delete', 'Delete', 'Delete module', options.onDelete, 'module.manage');
    let retryButton = null;
    if (options.onRetry) {
        retryButton = button('retry', 'Retry', 'Retry failed module operation', async () => { renderStatus('retrying'); await options.onRetry?.(); }, 'module.execute', 'primary');
        retryButton.hidden = true;
    }
    const coreController = { destroy, reset, undo, redo, setLocked, setCollapsed, setPinned, setStatus: (next, label) => { renderStatus(next, label); if (retryButton)
            retryButton.hidden = next !== 'failure'; if (next !== 'failure')
            clearErrorVisualOnly(); }, setError, clearError, setResourceUsage: usage => { definition.resourceUsage = { ...usage }; renderResource(); pushHistory(actionHistory('resource', 'Resource usage updated')); }, recordHistory, getHistory: () => [...(definition.history ?? [])], registerAction };
    function updateUndoButtons() { undoButton.disabled = !hasPermission('module.configure') || undoStack.length < 2; redoButton.disabled = !hasPermission('module.configure') || redoStack.length < 1; }
    function clearErrorVisualOnly() { root.dataset.error = 'false'; errorBox.hidden = true; errorBox.replaceChildren(); retrying = undefined; }
    function registerAction(action) { if (dynamicActions.has(action.id))
        throw new Error(`Module action already mounted: ${action.id}`); dynamicActions.set(action.id, action); if (!hasPermission(action.permission) || !hasCapability(action.capability))
        return () => dynamicActions.delete(action.id); const b = button(action.id, action.label, action.title, () => action.run({ definition, root: root, controller: coreController }), action.permission); if (action.destructive)
        b.classList.add('danger'); return () => { dynamicActions.delete(action.id); b.remove(); }; }
    for (const id of options.pluginActionIds ?? []) {
        const action = pluginActions.get(id);
        if (action)
            registerAction(action);
    }
    renderResource();
    renderStatus(definition.status);
    setCollapsed(collapsed);
    setPinned(pinned);
    setLocked(locked);
    updateUndoButtons();
    const onInput = () => { window.clearTimeout(inputTimer); inputTimer = window.setTimeout(() => commitSnapshot('Field change'), 180); };
    root.addEventListener('input', onInput, true);
    root.addEventListener('change', onInput, true);
    const onKey = (event) => { if (!root.contains(document.activeElement) && !root.matches(':hover'))
        return; const shortcuts = [{ id: 'collapse', label: 'Collapse / Expand', keys: 'Alt+Shift+C', run: () => setCollapsed(!collapsed), permission: 'module.view' }, { id: 'lock', label: 'Lock / Unlock', keys: 'Alt+Shift+L', run: () => setLocked(!locked), permission: 'module.configure' }, { id: 'pin', label: 'Pin / Unpin', keys: 'Alt+Shift+P', run: () => setPinned(!pinned), permission: 'module.view' }, { id: 'history', label: 'History', keys: 'Alt+Shift+H', run: renderHistoryPanel, permission: 'module.view' }, { id: 'undo', label: 'Undo', keys: 'Alt+Shift+Z', run: undo, permission: 'module.configure' }, { id: 'redo', label: 'Redo', keys: 'Alt+Shift+Y', run: redo, permission: 'module.configure' }, ...(options.shortcuts ?? [])]; for (const shortcut of shortcuts) {
        if (shortcutMatches(event, shortcut.keys) && hasPermission(shortcut.permission) && hasCapability(shortcut.capability)) {
            event.preventDefault();
            Promise.resolve(shortcut.run()).catch(setError);
            return;
        }
    } for (const action of dynamicActions.values())
        if (action.shortcut && shortcutMatches(event, action.shortcut) && hasPermission(action.permission) && hasCapability(action.capability)) {
            event.preventDefault();
            Promise.resolve(action.run({ definition, root: root, controller: coreController })).catch(setError);
            return;
        } };
    document.addEventListener('keydown', onKey);
    const parent = root.parentElement;
    let dragging = false;
    const onDragStart = (event) => { dragging = true; root.classList.add('module-dragging'); event.dataTransfer?.setData('text/plain', definition.id); if (event.dataTransfer)
        event.dataTransfer.effectAllowed = 'move'; };
    const onDragEnd = () => { dragging = false; root.classList.remove('module-dragging'); };
    const onDragOver = (event) => { if (!dragging || !parent)
        return; event.preventDefault(); const over = event.target.closest('.module-frame'); if (!over || over === root || over.parentElement !== parent)
        return; const box = over.getBoundingClientRect(), before = event.clientY < box.top + box.height / 2; parent.insertBefore(root, before ? over : over.nextSibling); };
    const onDrop = (event) => { if (!dragging)
        return; event.preventDefault(); recordHistory('Module reordered by drag handle'); };
    grip.addEventListener('dragstart', onDragStart);
    grip.addEventListener('dragend', onDragEnd);
    parent?.addEventListener('dragover', onDragOver);
    parent?.addEventListener('drop', onDrop);
    recordHistory('ModuleFrame mounted', 'state');
    function destroy() { if (destroyed)
        return; destroyed = true; window.clearTimeout(inputTimer); root.removeEventListener('input', onInput, true); root.removeEventListener('change', onInput, true); document.removeEventListener('keydown', onKey); grip.removeEventListener('dragstart', onDragStart); grip.removeEventListener('dragend', onDragEnd); parent?.removeEventListener('dragover', onDragOver); parent?.removeEventListener('drop', onDrop); bar.remove(); panel.remove(); errorBox.remove(); for (const child of content)
        child.hidden = false; host.replaceChildren(...root.childNodes); }
    return coreController;
}
function emptyController() { return { destroy: () => { }, reset: () => { }, undo: () => false, redo: () => false, setLocked: () => { }, setCollapsed: () => { }, setPinned: () => { }, setStatus: () => { }, setError: () => { }, clearError: () => { }, setResourceUsage: () => { }, recordHistory: () => { }, getHistory: () => [], registerAction: () => () => { } }; }
function escapeText(value) { return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function escapeAttr(value) { return escapeText(value).replace(/`/g, '&#96;'); }

},
"ui/components/panel-state":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderPanelLoading = renderPanelLoading;
exports.renderPanelError = renderPanelError;
exports.errorMessage = errorMessage;
const dom_1 = require("./dom");
function renderPanelLoading(host, message = "Загрузка…") {
    const note = (0, dom_1.makeElement)("p", message);
    note.className = "muted";
    note.setAttribute("role", "status");
    host.replaceChildren(note);
}
function renderPanelError(host, message, retry) {
    const wrap = (0, dom_1.makeElement)("div");
    wrap.className = "panel-error";
    wrap.setAttribute("role", "alert");
    wrap.append((0, dom_1.makeElement)("strong", "Не удалось загрузить данные"), (0, dom_1.makeElement)("p", message));
    if (retry) {
        const button = (0, dom_1.makeElement)("button", "Повторить");
        button.type = "button";
        button.onclick = () => void Promise.resolve(retry());
        wrap.append(button);
    }
    host.replaceChildren(wrap);
}
function errorMessage(error) {
    return error instanceof Error && error.message ? error.message : "Неизвестная ошибка.";
}

},
"ui/components/smart-empty":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderSmartEmptyState = renderSmartEmptyState;
const actions = {
    web: ['Новый сайт', 'Импорт проекта', 'Анализ существующего UI', 'Создать страницу', 'Исправить responsive'],
    image: ['Product image', 'UI mockup', 'Social creative', 'Edit existing image', 'Generate from reference'],
    music: ['Создать session', 'Загрузить reference', 'Проанализировать structure', 'Собрать production brief', 'Открыть Camelot'],
    video: ['Создать storyboard', 'Добавить shots', 'Добавить assets', 'Preview', 'Render'],
    audio: ['Загрузить аудио', 'Измерить LUFS', 'Проверить BPM/Key', 'Сравнить reference'],
    als: ['Загрузить Ableton Set', 'Проверить plugins', 'Проверить routing', 'Проанализировать arrangement'],
    data: ['Загрузить CSV/JSON', 'Проверить schema', 'Найти anomalies', 'Построить chart'],
    ledger: ['Показать spend', 'Проверить budget', 'Найти retries', 'Проверить uncertain calls'],
    lab: ['Проверить runtime', 'Открыть health', 'Проверить release evidence', 'Разобрать blockers'],
};
function renderSmartEmptyState(host, meta) {
    if (host.childElementCount || host.textContent?.trim())
        return;
    const shell = document.createElement('section');
    shell.className = 'studio-empty-state';
    const title = document.createElement('strong');
    title.textContent = 'Начните с понятного следующего шага';
    const note = document.createElement('p');
    note.textContent = `${meta.title}: выберите действие выше или используйте один из сценариев ниже.`;
    const list = document.createElement('div');
    list.className = 'studio-empty-actions';
    for (const label of actions[meta.id]) {
        const chip = document.createElement('span');
        chip.textContent = label;
        list.append(chip);
    }
    shell.append(title, note, list);
    host.append(shell);
}

},
"ui/components/studio-state":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studioStateLabel = void 0;
exports.canTransitionStudioState = canTransitionStudioState;
exports.createStudioStateController = createStudioStateController;
const transitions = {
    IDLE: ['READY'],
    READY: ['RUNNING', 'FAILED'],
    RUNNING: ['PAUSED', 'CANCELLING', 'FAILED', 'COMPLETED'],
    PAUSED: ['RUNNING', 'CANCELLING', 'FAILED'],
    CANCELLING: ['READY', 'FAILED'],
    FAILED: ['READY', 'RUNNING'],
    COMPLETED: ['READY', 'RUNNING'],
};
exports.studioStateLabel = {
    IDLE: 'Idle', READY: 'Ready', RUNNING: 'Running', PAUSED: 'Paused', CANCELLING: 'Stopping', FAILED: 'Failed', COMPLETED: 'Completed',
};
function canTransitionStudioState(from, to) { return from === to || transitions[from].includes(to); }
function createStudioStateController(initial = 'IDLE') {
    let state = initial;
    const listeners = new Set();
    return {
        get: () => state,
        set(next) { if (!canTransitionStudioState(state, next))
            throw new Error(`Invalid studio state transition ${state} -> ${next}`); if (next === state)
            return; state = next; for (const listener of listeners)
            listener(state); },
        subscribe(listener) { listeners.add(listener); listener(state); return () => listeners.delete(listener); },
    };
}

},
"ui/components/studio-toolbar":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountStudioToolbar = mountStudioToolbar;
const studio_state_1 = require("./studio-state");
function mountStudioToolbar(options) {
    const { host, meta, state } = options;
    host.replaceChildren();
    host.className = 'studio-toolbar';
    const left = document.createElement('div');
    left.className = 'studio-toolbar-left';
    const stateChip = document.createElement('span');
    stateChip.className = 'studio-state-chip';
    stateChip.setAttribute('role', 'status');
    const sync = document.createElement('span');
    sync.className = 'studio-sync-state';
    sync.textContent = 'Local state';
    sync.title = 'Статус сохранения/синхронизации';
    left.append(stateChip, sync);
    const right = document.createElement('div');
    right.className = 'studio-toolbar-actions';
    const button = (label, title, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.title = title; b.onclick = fn; right.append(b); return b; };
    const undo = button('↶', 'Undo', () => document.dispatchEvent(new CustomEvent('azrail:studio-undo')));
    undo.disabled = true;
    const redo = button('↷', 'Redo', () => document.dispatchEvent(new CustomEvent('azrail:studio-redo')));
    redo.disabled = true;
    const history = button('History', 'История проекта', options.openHistory);
    history.disabled = false;
    const tools = document.createElement('details');
    tools.className = 'studio-tools-menu';
    const summary = document.createElement('summary');
    summary.textContent = 'Tools';
    summary.title = 'Compare Mode и Professional Review';
    const menu = document.createElement('div');
    menu.className = 'studio-tools-menu-panel';
    const compare = document.createElement('button');
    compare.type = 'button';
    compare.textContent = 'A | B Compare';
    compare.onclick = () => { tools.open = false; options.openCompare(); };
    const review = document.createElement('button');
    review.type = 'button';
    review.textContent = 'Professional Review';
    review.onclick = () => { tools.open = false; options.openReview(); };
    menu.append(compare, review);
    tools.append(summary, menu);
    right.append(tools);
    const help = button('?', 'Подсказки и горячие клавиши', options.openHelp);
    let modelSelect = null;
    if (meta.capabilities.includes('mission')) {
        modelSelect = document.createElement('select');
        modelSelect.className = 'studio-model-select';
        modelSelect.title = 'Model quick switcher';
        modelSelect.setAttribute('aria-label', 'Модель');
        const auto = document.createElement('option');
        auto.value = '';
        auto.textContent = 'AUTO · model router';
        auto.title = 'AZRAIL выберет модель по задаче, capabilities и policy.';
        modelSelect.append(auto);
        modelSelect.value = options.getPreferredModel();
        const info = document.createElement('span');
        info.className = 'studio-model-info';
        info.textContent = 'AUTO';
        const describe = (model) => { const context = model.contextWindow ? `${Math.round(model.contextWindow / 1024)}K` : 'context ?'; const caps = (model.capabilities?.length ? model.capabilities : [model.task ?? 'unknown']).slice(0, 3).join(', '); return `${model.provider ?? 'provider ?'} · ${caps} · ${context} · speed ${model.speedProfile ?? 'unknown'} · cost ${model.costProfile ?? 'unknown'} · ${model.availability ?? 'available'}`; };
        let loaded = [];
        const syncInfo = () => { const selected = loaded.find(item => item.slug === modelSelect.value); info.textContent = selected ? describe(selected) : 'AUTO · capability-aware routing'; };
        modelSelect.onchange = () => { options.setPreferredModel(modelSelect.value); syncInfo(); };
        right.append(modelSelect, info);
        if (options.loadModels)
            void options.loadModels().then(models => { loaded = models; for (const model of models.filter(item => item.reviewed || item.freeAllowlisted).slice(0, 80)) {
                if ([...modelSelect.options].some(option => option.value === model.slug))
                    continue;
                const option = document.createElement('option');
                option.value = model.slug;
                const context = model.contextWindow ? ` · ${Math.round(model.contextWindow / 1024)}K` : '';
                option.textContent = `${model.freeAllowlisted ? 'FREE · ' : ''}${model.provider ?? ''} · ${model.slug}${context}`;
                option.title = describe(model);
                modelSelect.append(option);
            } modelSelect.value = options.getPreferredModel(); syncInfo(); }).catch(() => { info.textContent = 'Model catalog unavailable'; });
    }
    const runMirror = button(meta.action, 'Run', () => options.run?.click());
    runMirror.classList.add('primary');
    runMirror.disabled = !options.run || options.run.disabled;
    const stop = button('Stop', 'Остановить текущую операцию', options.stop);
    stop.hidden = true;
    host.append(left, right);
    const unsubscribe = state.subscribe((next) => { stateChip.textContent = studio_state_1.studioStateLabel[next]; stateChip.dataset.state = next.toLowerCase(); const active = next === 'RUNNING' || next === 'PAUSED' || next === 'CANCELLING'; runMirror.hidden = active; stop.hidden = !active; });
    const draftListener = (event) => { const detail = event.detail; if (!detail)
        return; sync.textContent = detail.status; undo.disabled = !detail.canUndo; redo.disabled = !detail.canRedo; };
    document.addEventListener('azrail:draft-status', draftListener);
    return { destroy() { unsubscribe(); document.removeEventListener('azrail:draft-status', draftListener); host.replaceChildren(); }, setRunEnabled(enabled) { runMirror.disabled = !enabled; }, setSyncStatus(status) { sync.textContent = status; }, modelSelect, history, help };
}

},
"ui/components/suggestions":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSuggestions = getSuggestions;
exports.mountSuggestionBar = mountSuggestionBar;
const suggestions = {
    web: [
        { id: 'web-mobile', label: 'Проверить мобильную версию', prompt: 'Проверь текущий интерфейс на мобильных ширинах и исправь overflow, touch targets и адаптивность.', kind: 'primary' },
        { id: 'web-a11y', label: 'Проверить доступность', prompt: 'Проведи accessibility review текущего интерфейса: клавиатура, focus, contrast, labels и формы.' },
        { id: 'web-compact', label: 'Сделать дизайн компактнее', prompt: 'Сделай выбранный интерфейс компактнее, сохранив иерархию, адаптивность и читаемость.' },
        { id: 'web-qa', label: 'Запустить browser QA', prompt: 'Проведи browser QA: console errors, failed requests, формы, responsive и keyboard navigation.' },
        { id: 'web-code', label: 'Проверить код компонента', prompt: 'Найди исходный компонент выбранного элемента и проверь его логику, стили и состояния.' },
        { id: 'web-deploy', label: 'Подготовить deploy', prompt: 'Проверь готовность проекта к staging deploy без выполнения production mutation.' },
    ],
    image: [
        { id: 'image-variants', label: 'Сделать варианты', prompt: 'Создай контролируемые варианты текущего изображения, сохранив ключевую композицию и визуальную идентичность.', kind: 'primary' },
        { id: 'image-bg', label: 'Поменять фон', prompt: 'Подготовь edit текущего изображения с заменой фона, не изменяя основной объект.' },
        { id: 'image-upscale', label: 'Поднять качество', prompt: 'Подготовь upscale текущего изображения с сохранением композиции, цвета и идентичности объекта.' },
        { id: 'image-style', label: 'Зафиксировать стиль', prompt: 'Опиши визуальный стиль текущего изображения как reusable style brief для следующих генераций.' },
        { id: 'image-review', label: 'Проверить артефакты', prompt: 'Проведи QA изображения: артефакты, текст, края, контраст, crop и разрешение.' },
    ],
    music: [
        { id: 'music-structure', label: 'Проанализировать структуру', prompt: 'Проанализируй структуру трека: intro, groove, build, breakdown, drop, bridge и outro.', kind: 'primary' },
        { id: 'music-midi', label: 'Создать MIDI-план', prompt: 'Подготовь MIDI и arrangement plan для Melodic House & Techno на основе текущих параметров.' },
        { id: 'music-loudness', label: 'Проверить громкость', prompt: 'Проведи измеримый анализ loudness/dynamics и укажи, какие параметры требуют коррекции.' },
        { id: 'music-camelot', label: 'Показать Camelot', prompt: 'Определи гармонический контекст и представь тональность в Camelot notation.' },
        { id: 'music-reference', label: 'Сравнить с reference', prompt: 'Сравни текущую версию с reference по темпу, структуре, энергии, гармонии и балансу, не копируя исходный материал.' },
        { id: 'music-prompt', label: 'Собрать production prompt', prompt: 'Собери профессиональный production brief: tempo, key, Camelot, structure, energy, rhythm, bass, harmony, mix и master targets.' },
    ],
    video: [
        { id: 'video-next', label: 'Создать следующий shot', prompt: 'Предложи следующий shot, согласованный с текущим storyboard и visual continuity.', kind: 'primary' },
        { id: 'video-continuity', label: 'Проверить continuity', prompt: 'Проверь continuity персонажей, света, локации, камеры, props и цветовой палитры между сценами.' },
        { id: 'video-voice', label: 'Добавить voice-over', prompt: 'Подготовь voice-over plan и тайминг для текущего видео.' },
        { id: 'video-preview', label: 'Render preview', prompt: 'Подготовь безопасный proxy preview перед финальным render.' },
        { id: 'video-qa', label: 'Проверить видео', prompt: 'Проведи QA: flicker, continuity, frame errors, captions и audio clipping.' },
    ],
    audio: [
        { id: 'audio-loudness', label: 'Измерить LUFS', prompt: 'Проанализируй loudness, true peak, dynamics и clipping текущего аудио.', kind: 'primary' },
        { id: 'audio-key', label: 'Проверить BPM / Key', prompt: 'Определи BPM, key и confidence без выдуманных значений.' },
        { id: 'audio-compare', label: 'Сравнить reference', prompt: 'Сравни текущий файл с reference по измеримым аудиопараметрам.' },
    ],
    als: [
        { id: 'als-plugins', label: 'Проверить plugins', prompt: 'Проверь missing/inactive plugins и предложи безопасные варианты восстановления.', kind: 'primary' },
        { id: 'als-routing', label: 'Проверить routing', prompt: 'Проверь routing, sidechain topology и потенциальные циклы проекта.' },
        { id: 'als-arrangement', label: 'Разобрать arrangement', prompt: 'Проанализируй arrangement проекта по секциям, tracks, clips и сценам.' },
    ],
    data: [
        { id: 'data-quality', label: 'Проверить качество данных', prompt: 'Проведи validation данных: schema, nulls, outliers, duplicates и type conflicts.', kind: 'primary' },
        { id: 'data-summary', label: 'Сделать сводку', prompt: 'Сделай краткую аналитическую сводку текущего набора данных.' },
    ],
    ledger: [
        { id: 'ledger-cost', label: 'Найти перерасход', prompt: 'Проверь spend, reserved cost, retries и uncertain calls на аномалии.', kind: 'primary' },
        { id: 'ledger-latency', label: 'Проверить latency', prompt: 'Найди модели/агентов с повышенной latency и ошибками.' },
    ],
    lab: [
        { id: 'lab-failed', label: 'Разобрать failed step', prompt: 'Найди последний failed/blocking signal и объясни безопасный следующий шаг.', kind: 'primary' },
        { id: 'lab-trace', label: 'Открыть trace', prompt: 'Покажи trace цепочку mission → agent → tool → provider → result для последней проблемы.' },
        { id: 'lab-checkpoint', label: 'Продолжить с checkpoint', prompt: 'Определи последний безопасный checkpoint и план продолжения без повторения внешних эффектов.' },
        { id: 'lab-cost', label: 'Снизить стоимость', prompt: 'Найди безопасные способы снизить стоимость миссии без потери критичных проверок.' },
    ],
};
function chatSuggestions(context) {
    const text = (context.lastUserMessage ?? '').toLowerCase();
    if (context.errors?.length || /(ошиб|error|failed|exception)/.test(text))
        return [
            { id: 'chat-fix', label: 'Исправить ошибку', prompt: 'Найди причину текущей ошибки, исправь минимально необходимый код и проверь связанные сценарии.', kind: 'primary' },
            { id: 'chat-explain', label: 'Объяснить причину', prompt: 'Объясни корневую причину ошибки и какие файлы/состояния с ней связаны.' },
            { id: 'chat-related', label: 'Проверить связанные файлы', prompt: 'Проверь связанные с ошибкой файлы и найди вторичные регрессии.' },
            { id: 'chat-rollback', label: 'Подготовить безопасный откат', prompt: 'Определи последнюю стабильную точку и подготовь безопасный план отката без выполнения необратимых действий.' },
        ];
    return [
        { id: 'chat-audit', label: 'Проанализировать проект', prompt: 'Проведи архитектурный анализ текущего проекта и перечисли приоритетные улучшения.', kind: 'primary' },
        { id: 'chat-errors', label: 'Найти ошибки', prompt: 'Проверь текущий проект на синтаксические, логические, типизационные и UX ошибки.' },
        { id: 'chat-feature', label: 'Создать функцию', prompt: 'Помоги спроектировать и реализовать следующую функцию проекта без заглушек.' },
        { id: 'chat-continue', label: 'Продолжить последнюю миссию', prompt: 'Продолжи последнюю незавершённую миссию с последней безопасной точки.' },
    ];
}
function getSuggestions(context) {
    const base = context.surface === 'chat' ? chatSuggestions(context) : [...suggestions[context.surface]];
    const merged = [...(context.remoteSuggestions ?? []), ...base], seen = new Set();
    const unique = merged.filter(item => !seen.has(item.id) && seen.add(item.id));
    if (context.budgetState === 'blocked')
        return unique.filter(item => !/render|generation|созда|рендер/i.test(item.prompt)).slice(0, 6);
    return unique.slice(0, 6);
}
function mountSuggestionBar(host, context, onSelect) {
    const render = (next) => {
        host.replaceChildren();
        host.className = 'suggestion-bar';
        host.setAttribute('aria-label', 'Рекомендуемые следующие действия');
        const head = document.createElement('div');
        head.className = 'suggestion-head';
        const title = document.createElement('strong');
        title.textContent = 'Следующий шаг';
        const note = document.createElement('span');
        note.textContent = 'Контекстные подсказки';
        head.append(title, note);
        host.append(head);
        const row = document.createElement('div');
        row.className = 'suggestion-chips';
        for (const suggestion of getSuggestions(next)) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'suggestion-chip';
            if (suggestion.kind === 'primary')
                button.dataset.kind = 'primary';
            button.textContent = suggestion.label;
            if (suggestion.reason)
                button.title = suggestion.reason;
            button.onclick = () => onSelect(suggestion);
            row.append(button);
        }
        host.append(row);
    };
    render(context);
    return { update: render, destroy: () => host.replaceChildren() };
}

},
"ui/components/universal-compare":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openUniversalCompareCenter = openUniversalCompareCenter;
const textLike = (mime) => /^text\//i.test(mime) || /(json|xml|javascript|typescript|markdown|csv|svg)/i.test(mime);
const mediaKind = (asset) => asset.mime.startsWith('image/') ? 'image' : asset.mime.startsWith('audio/') ? 'audio' : asset.mime.startsWith('video/') ? 'video' : textLike(asset.mime) ? 'text' : 'binary';
const sameFamily = (a, b) => mediaKind(a) === mediaKind(b) || mediaKind(a) === 'text' && mediaKind(b) === 'text';
function optionLabel(asset) {
    const kind = asset.kind ?? mediaKind(asset), studio = asset.studioId ? ` · ${asset.studioId}` : '';
    return `${asset.name} · ${kind}${studio}`;
}
async function renderAsset(host, asset, blobAPI, urls) {
    host.replaceChildren();
    const title = document.createElement('strong');
    title.textContent = asset.name;
    const meta = document.createElement('small');
    meta.className = 'muted';
    meta.textContent = `${asset.mime} · ${Math.max(1, Math.ceil(asset.bytes / 1024))} KB${asset.versionOf ? ` · version of ${asset.versionOf.slice(0, 8)}` : ''}`;
    host.append(title, meta);
    const blob = await blobAPI(`/api/studio/artifacts/${encodeURIComponent(asset.id)}`);
    const kind = mediaKind(asset);
    if (kind === 'image') {
        const url = URL.createObjectURL(blob);
        urls.push(url);
        const img = document.createElement('img');
        img.src = url;
        img.alt = asset.name;
        host.append(img);
    }
    else if (kind === 'audio') {
        const url = URL.createObjectURL(blob);
        urls.push(url);
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = url;
        host.append(audio);
    }
    else if (kind === 'video') {
        const url = URL.createObjectURL(blob);
        urls.push(url);
        const video = document.createElement('video');
        video.controls = true;
        video.playsInline = true;
        video.src = url;
        host.append(video);
    }
    else if (kind === 'text') {
        const pre = document.createElement('pre');
        const raw = await blob.text();
        pre.textContent = raw.length > 200_000 ? raw.slice(0, 200_000) + '\n… [preview truncated]' : raw;
        host.append(pre);
    }
    else {
        const note = document.createElement('p');
        note.className = 'context-note';
        note.textContent = 'Для этого бинарного формата нет безопасного встроенного preview. Сравнение ограничено metadata/evidence.';
        host.append(note);
    }
    const evidence = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Evidence / metadata';
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify({ kind: asset.kind, studioId: asset.studioId, projectLinks: asset.projectLinks, metadata: asset.metadata, analysis: asset.analysis }, null, 2);
    evidence.append(summary, pre);
    host.append(evidence);
}
async function openUniversalCompareCenter(deps) {
    const root = deps.dialog('Compare Mode · A | B', '<p class="muted">Загрузка Asset Intelligence…</p>');
    const query = deps.projectId ? `?projectId=${encodeURIComponent(deps.projectId)}` : '';
    const response = await deps.api('/api/studio/assets/intelligence' + query);
    const assets = (response.items ?? []).filter(item => item && item.id && item.mime);
    root.replaceChildren();
    const note = document.createElement('p');
    note.className = 'context-note';
    note.textContent = 'Universal A|B работает только с реальными сохранёнными assets. Источники не изменяются. Web source сравнивается точнее через Web Studio → Changes/Versions.';
    root.append(note);
    if (assets.length < 2) {
        const empty = document.createElement('p');
        empty.textContent = 'Для A|B нужны минимум два сохранённых asset. Сначала сохраните две версии результата.';
        root.append(empty);
        return;
    }
    const toolbar = document.createElement('div');
    toolbar.className = 'compare-center-controls';
    const makeSelect = (label) => { const wrap = document.createElement('label'); wrap.textContent = label; const select = document.createElement('select'); for (const asset of assets) {
        const option = document.createElement('option');
        option.value = asset.id;
        option.textContent = optionLabel(asset);
        select.append(option);
    } wrap.append(select); toolbar.append(wrap); return select; };
    const aSelect = makeSelect('A'), bSelect = makeSelect('B');
    bSelect.selectedIndex = Math.min(1, assets.length - 1);
    const compare = document.createElement('button');
    compare.type = 'button';
    compare.className = 'primary';
    compare.textContent = 'Сравнить A | B';
    toolbar.append(compare);
    root.append(toolbar);
    const warning = document.createElement('p');
    warning.className = 'muted';
    root.append(warning);
    const grid = document.createElement('div');
    grid.className = 'compare-mode-grid';
    const left = document.createElement('section'), right = document.createElement('section');
    left.className = 'compare-side';
    right.className = 'compare-side';
    grid.append(left, right);
    root.append(grid);
    let urls = [];
    const revoke = () => { for (const url of urls)
        URL.revokeObjectURL(url); urls = []; };
    const dialog = root.closest('dialog');
    dialog?.addEventListener('close', revoke, { once: true });
    const run = async () => { revoke(); const a = assets.find(item => item.id === aSelect.value), b = assets.find(item => item.id === bSelect.value); if (!a || !b)
        return; if (a.id === b.id) {
        warning.textContent = 'A и B должны быть разными версиями/артефактами.';
        left.replaceChildren();
        right.replaceChildren();
        return;
    } warning.textContent = sameFamily(a, b) ? 'Сравнение одинакового media family.' : 'Форматы A и B различаются: показываю каждый источник в его нативном preview; метрики нельзя напрямую считать эквивалентными.'; await Promise.all([renderAsset(left, a, deps.blobAPI, urls), renderAsset(right, b, deps.blobAPI, urls)]); deps.notice(`Compare Mode: ${a.name} ↔ ${b.name}`); };
    compare.onclick = () => void run().catch(error => { warning.textContent = error instanceof Error ? error.message : String(error); });
    await run();
}

},
"ui/components/voice-input":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountVoiceInput = mountVoiceInput;
function mountVoiceInput(options) {
    let recorder = null, stream = null, chunks = [], lastBlob = null, state = 'idle', timeout = 0, cancelled = false;
    const panel = document.createElement('div');
    panel.className = 'voice-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', 'Голосовой ввод');
    const status = document.createElement('strong'), transcript = document.createElement('textarea');
    transcript.rows = 2;
    transcript.maxLength = 20000;
    transcript.placeholder = 'Расшифровка появится здесь и останется редактируемой.';
    const actions = document.createElement('div');
    actions.className = 'toolbar';
    panel.append(status, transcript, actions);
    options.button.parentElement?.parentElement?.after(panel);
    const make = (label, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.onclick = () => Promise.resolve(fn()).catch(options.failure); actions.append(b); return b; };
    const pause = make('Pause', () => { if (recorder?.state === 'recording')
        recorder.pause(); });
    const resume = make('Resume', () => { if (recorder?.state === 'paused')
        recorder.resume(); });
    const stop = make('Transcribe', () => { if (recorder && ['recording', 'paused'].includes(recorder.state))
        recorder.stop(); });
    const retry = make('Retry', () => lastBlob ? transcribe(lastBlob) : undefined);
    const use = make('Use transcript', () => { const text = transcript.value.trim(); if (text) {
        options.prompt.value = [options.prompt.value.trim(), text].filter(Boolean).join(' ');
        options.prompt.dispatchEvent(new Event('input', { bubbles: true }));
        options.prompt.focus();
    } reset(false); });
    const cancel = make('Cancel', () => reset(true));
    function render(next) { state = next; panel.hidden = next === 'idle'; status.textContent = ({ idle: '', recording: 'Recording', paused: 'Paused', processing: 'Transcribing…', editable: 'Editable transcript', failed: 'Transcription failed' })[next]; pause.hidden = next !== 'recording'; resume.hidden = next !== 'paused'; stop.hidden = !['recording', 'paused'].includes(next); retry.hidden = !['editable', 'failed'].includes(next) || !lastBlob; use.hidden = next !== 'editable'; transcript.hidden = !['editable', 'failed'].includes(next); transcript.disabled = next === 'processing'; options.button.textContent = next === 'idle' ? '◉' : next === 'recording' ? '■' : '◫'; options.button.setAttribute('aria-label', next === 'idle' ? 'Записать голосовой запрос' : 'Открыт голосовой ввод'); }
    function stopMedia() { clearTimeout(timeout); timeout = 0; stream?.getTracks().forEach(track => track.stop()); stream = null; recorder = null; }
    function reset(abort) { if (abort)
        cancelled = true; if (abort && recorder && ['recording', 'paused'].includes(recorder.state))
        try {
            recorder.stop();
        }
        catch { } stopMedia(); chunks = []; if (abort) {
        lastBlob = null;
        transcript.value = '';
    } render('idle'); }
    async function transcribe(blob) { render('processing'); try {
        const result = await options.api('/api/studio/voice', { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID(), 'Content-Type': blob.type || 'audio/webm' }, body: blob });
        transcript.value = String(result?.text ?? '').trim();
        if (!transcript.value)
            throw Error('Провайдер не вернул расшифровку.');
        render('editable');
        options.notice('Расшифровка готова. Отредактируйте текст или добавьте его в запрос.');
    }
    catch (error) {
        render('failed');
        throw error;
    } }
    async function start() {
        if (!options.canUse())
            throw Error('Для распознавания речи войдите в аккаунт.');
        if (!navigator.mediaDevices?.getUserMedia)
            throw Error('Микрофон доступен по HTTPS в поддерживаемом браузере.');
        if (state !== 'idle') {
            panel.hidden = false;
            return;
        }
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        cancelled = false;
        chunks = [];
        lastBlob = null;
        transcript.value = '';
        try {
            recorder = new MediaRecorder(stream);
        }
        catch (error) {
            stopMedia();
            throw error;
        }
        const active = recorder;
        active.ondataavailable = event => { if (event.data.size)
            chunks.push(event.data); };
        active.onpause = () => render('paused');
        active.onresume = () => render('recording');
        active.onstop = () => { clearTimeout(timeout); stream?.getTracks().forEach(track => track.stop()); stream = null; recorder = null; if (cancelled) {
            chunks = [];
            return;
        } lastBlob = new Blob(chunks, { type: active.mimeType || 'audio/webm' }); void transcribe(lastBlob).catch(options.failure); };
        active.start(500);
        render('recording');
        timeout = window.setTimeout(() => { if (active.state === 'recording' || active.state === 'paused')
            active.stop(); }, 60_000);
        options.notice('Запись началась. Доступны Pause, Resume, Transcribe и Cancel.');
    }
    options.button.onclick = () => { if (state === 'idle')
        void start().catch(options.failure);
    else
        panel.hidden = !panel.hidden; };
    render('idle');
    return { destroy() { reset(true); panel.remove(); options.button.onclick = null; }, getState: () => state };
}

},
"ui/connectors":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderConnections = renderConnections;
const tool_form_1 = require("./tool-form");
const dom_1 = require("./components/dom");
const fmt = (value) => value ? new Intl.DateTimeFormat('ru', { dateStyle: 'medium', timeStyle: 'short' }).format(value) : '—';
const age = (value) => { if (!value)
    return 'Никогда'; const sec = Math.max(0, Math.round((Date.now() - value) / 1000)); if (sec < 60)
    return `${sec} сек назад`; const min = Math.round(sec / 60); if (min < 60)
    return `${min} мин назад`; const h = Math.round(min / 60); if (h < 48)
    return `${h} ч назад`; return fmt(value); };
const statusText = (status) => ({ healthy: 'Connected', degraded: 'Degraded', rate_limited: 'Rate limited', auth_expired: 'Authentication expired', unavailable: 'Unavailable', warning: 'Warning', unknown: 'Unknown' }[status] ?? status);
const callState = (status) => ({ prepared: 'ожидает действия', running: 'отправлено', succeeded: 'выполнено', failed: 'ошибка', uncertain: 'требует сверки', cancelled: 'отменено' }[status] ?? status);
const apiShape = (error) => error && typeof error === 'object' ? error : {};
async function renderConnections(host, api, options = {}) {
    let selected = '';
    let requestKey = crypto.randomUUID();
    const status = (0, dom_1.makeElement)('p');
    status.className = 'context-note';
    status.setAttribute('role', 'status');
    const shell = (0, dom_1.makeElement)('div');
    shell.className = 'connections-shell';
    host.replaceChildren(shell, status);
    const load = async () => {
        const data = await api('/api/connectors');
        if (selected && !data.connections.some(c => c.id === selected))
            selected = '';
        shell.replaceChildren();
        const head = (0, dom_1.makeElement)('div');
        head.className = 'connections-head';
        const copy = (0, dom_1.makeElement)('div');
        copy.append((0, dom_1.makeElement)('small', 'SETTINGS / CONNECTIONS'), (0, dom_1.makeElement)('strong', 'Professional Connections'), (0, dom_1.makeElement)('span', 'Состояние, scopes, инструменты, вызовы и credential lifecycle — без раскрытия секретов.'));
        const actions = (0, dom_1.makeElement)('div');
        actions.className = 'toolbar';
        const refresh = button('Refresh', async () => load());
        actions.append(refresh);
        head.append(copy, actions);
        shell.append(head);
        if (!data.vaultConfigured) {
            const blocked = (0, dom_1.makeElement)('p', 'Protected credential vault is not configured. Connections are unavailable until INTEGRATION_KEY is set by the operator.');
            blocked.className = 'context-note';
            shell.append(blocked);
            return;
        }
        const add = connectForm(data.catalog, api, async () => load(), status);
        shell.append(add);
        const layout = (0, dom_1.makeElement)('div');
        layout.className = 'connections-layout';
        const list = (0, dom_1.makeElement)('div');
        list.className = 'connection-summary-list';
        const detail = (0, dom_1.makeElement)('div');
        detail.className = 'connection-detail';
        layout.append(list, detail);
        shell.append(layout);
        if (!data.connections.length) {
            const empty = (0, dom_1.makeElement)('div');
            empty.className = 'connection-empty';
            empty.append((0, dom_1.makeElement)('strong', 'Нет активных подключений'), (0, dom_1.makeElement)('span', 'Добавьте сервис выше. Credentials остаются server-side и не возвращаются в UI.'));
            list.append(empty);
            detail.append((0, dom_1.makeElement)('p', 'Выберите или создайте подключение.'));
            return;
        }
        for (const c of data.connections) {
            const card = (0, dom_1.makeElement)('article');
            card.className = 'connection-card';
            card.dataset.status = c.status;
            const top = (0, dom_1.makeElement)('div');
            top.className = 'connection-card-top';
            const name = (0, dom_1.makeElement)('div');
            name.append((0, dom_1.makeElement)('strong', c.label), (0, dom_1.makeElement)('small', c.endpointKey));
            const badge = (0, dom_1.makeElement)('span', statusText(c.status));
            badge.className = 'connection-status';
            top.append(name, badge);
            const meta = (0, dom_1.makeElement)('div');
            meta.className = 'connection-card-meta';
            meta.append(metric('Tools', String(c.toolCount)), metric('Last checked', age(c.lastCheckedAt)), metric('Last call', age(c.lastCallAt)), metric('Errors', String(c.errorCount)));
            const manage = button(selected === c.id ? 'Open' : 'Manage', async () => { selected = c.id; await loadDetail(detail, c.id); for (const el of list.querySelectorAll('.connection-card'))
                el.classList.toggle('selected', el.dataset.id === selected); });
            card.dataset.id = c.id;
            card.append(top, meta, manage);
            if (selected === c.id)
                card.classList.add('selected');
            list.append(card);
        }
        if (!selected)
            selected = data.connections[0].id;
        await loadDetail(detail, selected);
    };
    const loadDetail = async (target, id) => {
        target.replaceChildren((0, dom_1.makeElement)('p', 'Загружаю connection profile…'));
        const d = await api(`/api/connectors/${encodeURIComponent(id)}`);
        target.replaceChildren();
        const c = d.connection, head = (0, dom_1.makeElement)('div');
        head.className = 'connection-detail-head';
        const title = (0, dom_1.makeElement)('div');
        title.append((0, dom_1.makeElement)('small', c.endpointKey.toUpperCase()), (0, dom_1.makeElement)('h2', c.label), (0, dom_1.makeElement)('span', statusText(c.status)));
        const verify = button('Verify connection', async () => { const result = await api(`/api/connectors/${encodeURIComponent(id)}/discover`, { method: 'POST', body: '{}' }); status.textContent = `Connection verified · tools: ${result.tools.length}`; await load(); });
        head.append(title, verify);
        target.append(head);
        const facts = (0, dom_1.makeElement)('div');
        facts.className = 'connection-facts';
        facts.append(fact('Endpoint', d.policy.endpoint), fact('Auth', d.policy.auth.toUpperCase()), fact('Scopes', d.policy.scopes.length ? d.policy.scopes.join(' · ') : 'No OAuth scopes'), fact('Daily call limit', String(d.policy.dailyCalls)), fact('Revision', String(c.revision)), fact('Last checked', `${age(c.lastCheckedAt)}${c.lastCheckLatencyMs !== null ? ` · ${c.lastCheckLatencyMs} ms` : ''}`));
        target.append(facts);
        const tools = section('Available tools', `${d.tools.length} discovered`);
        const toolList = (0, dom_1.makeElement)('div');
        toolList.className = 'connection-tool-list';
        if (!d.tools.length)
            toolList.append((0, dom_1.makeElement)('p', 'Каталог пуст. Выполните Verify connection.'));
        for (const t of d.tools) {
            const item = (0, dom_1.makeElement)('details');
            item.className = 'connection-tool';
            const sum = (0, dom_1.makeElement)('summary');
            sum.append((0, dom_1.makeElement)('strong', t.name), (0, dom_1.makeElement)('span', t.risk));
            item.append(sum, (0, dom_1.makeElement)('p', t.description || 'Описание не предоставлено сервисом.'));
            const fields = (0, dom_1.makeElement)('div');
            const readArguments = (0, tool_form_1.toolForm)(fields, t.inputSchema);
            const review = (0, dom_1.makeElement)('div');
            item.append(fields, button('Prepare action', async () => { const call = await api('/api/connectors/prepare', { method: 'POST', headers: { 'Idempotency-Key': requestKey }, body: JSON.stringify({ connectionId: id, tool: t.name, arguments: readArguments() }) }); requestKey = crypto.randomUUID(); await showCall(review, call.id); }), review);
            toolList.append(item);
        }
        tools.body.append(toolList);
        target.append(tools.root);
        const calls = section('Call history', `${d.calls.length} recent`);
        const callList = (0, dom_1.makeElement)('div');
        callList.className = 'connection-call-list';
        if (!d.calls.length)
            callList.append((0, dom_1.makeElement)('p', 'Вызовов пока нет.'));
        for (const call of d.calls) {
            const row = (0, dom_1.makeElement)('button');
            row.type = 'button';
            row.className = 'connection-call-row';
            const main = (0, dom_1.makeElement)('span');
            main.append((0, dom_1.makeElement)('strong', call.tool), (0, dom_1.makeElement)('small', fmt(call.createdAt)));
            const state = (0, dom_1.makeElement)('span', callState(call.status));
            if (call.error)
                state.title = call.error;
            row.append(main, state);
            row.onclick = () => void showCall(callList, call.id);
            callList.append(row);
        }
        calls.body.append(callList);
        target.append(calls.root);
        const checks = section('Health & errors', `${d.checks.length} checks`);
        const checkList = (0, dom_1.makeElement)('div');
        checkList.className = 'connection-check-list';
        if (!d.checks.length)
            checkList.append((0, dom_1.makeElement)('p', 'Health history появится после Verify connection.'));
        for (const check of d.checks) {
            const row = (0, dom_1.makeElement)('div');
            row.className = 'connection-check-row';
            row.dataset.status = check.status;
            row.append((0, dom_1.makeElement)('strong', statusText(check.status)), (0, dom_1.makeElement)('span', `${check.latency_ms} ms · ${check.tool_count} tools`), (0, dom_1.makeElement)('small', check.error_code ?? fmt(check.checked_at)));
            checkList.append(row);
        }
        checks.body.append(checkList);
        target.append(checks.root);
        target.append(credentialSection(c, d.policy.auth), disconnectSection(c));
    };
    async function approveThenRetry(approval, retry) { if (!approval?.id || !approval?.payload_digest)
        throw Error('Approval response incomplete.'); if (options.role !== 'admin') {
        status.textContent = `Credential rotation ожидает approval ${String(approval.id).slice(0, 8)}. Подтвердить может администратор.`;
        return null;
    } await api(`/api/approvals/${encodeURIComponent(approval.id)}/decision`, { method: 'POST', body: JSON.stringify({ decision: 'approved', payloadDigest: approval.payload_digest, reason: 'Connections: credential rotation' }) }); return retry(approval.id); }
    function credentialSection(c, auth) {
        const wrap = (0, dom_1.makeElement)('details');
        wrap.className = 'connection-danger';
        const sum = (0, dom_1.makeElement)('summary', 'Credential lifecycle');
        wrap.append(sum);
        if (auth === 'none') {
            wrap.append((0, dom_1.makeElement)('p', 'This connector does not use a credential.'));
            return wrap;
        }
        wrap.append((0, dom_1.makeElement)('p', 'Secrets are never displayed. Rotation invalidates the previous connection revision and clears the discovered tool catalog until verification.'));
        if (auth === 'bearer') {
            const token = (0, dom_1.makeElement)('input');
            token.type = 'password';
            token.autocomplete = 'off';
            token.maxLength = 8192;
            token.placeholder = 'New service token';
            const rotate = button('Rotate credential', async () => { const invoke = (approvalId = '') => api(`/api/connectors/${encodeURIComponent(c.id)}/rotate`, { method: 'POST', body: JSON.stringify({ token: token.value, ...(approvalId ? { approvalId } : {}) }) }); try {
                const result = await invoke();
                token.value = '';
                status.textContent = `Credential rotated · revision ${result.revision}. Verify connection next.`;
                await load();
            }
            catch (error) {
                const e = apiShape(error);
                if (e.status === 409 && e.body?.approval) {
                    const result = await approveThenRetry(e.body.approval, invoke);
                    if (result) {
                        token.value = '';
                        status.textContent = `Credential rotated · revision ${result.revision}. Verify connection next.`;
                        await load();
                    }
                    return;
                }
                throw error;
            } });
            wrap.append(token, rotate);
        }
        else {
            wrap.append(button('Re-authorize OAuth', async () => { const invoke = (approvalId = '') => api('/api/connectors/oauth/start', { method: 'POST', body: JSON.stringify({ endpointKey: c.endpointKey, connectionId: c.id, ...(approvalId ? { approvalId } : {}) }) }); try {
                const r = await invoke();
                location.assign(r.url);
            }
            catch (error) {
                const e = apiShape(error);
                if (e.status === 409 && e.body?.approval) {
                    const r = await approveThenRetry(e.body.approval, invoke);
                    if (r)
                        location.assign(r.url);
                    return;
                }
                throw error;
            } }));
        }
        return wrap;
    }
    function disconnectSection(c) { const wrap = (0, dom_1.makeElement)('details'); wrap.className = 'connection-danger'; wrap.append((0, dom_1.makeElement)('summary', 'Disconnect')); const p = (0, dom_1.makeElement)('p', 'Disables new calls, clears the stored credential and cancels prepared calls. Already dispatched remote operations are not rolled back.'); const b = button('Confirm disconnect', async () => { await api(`/api/connectors/${encodeURIComponent(c.id)}`, { method: 'DELETE' }); status.textContent = `${c.label} disconnected.`; selected = ''; await load(); }); wrap.append(p, b); return wrap; }
    async function showCall(target, id) { const c = await api(`/api/connectors/calls/${encodeURIComponent(id)}`); target.replaceChildren(); const card = (0, dom_1.makeElement)('article'); card.className = 'connection-call-detail'; card.append((0, dom_1.makeElement)('h4', `${c.connectionLabel ?? c.connectionId} · ${c.tool}`), (0, dom_1.makeElement)('p', callState(c.status)), (0, dom_1.makeElement)('small', `Created ${fmt(c.createdAt)} · Updated ${fmt(c.updatedAt)}`)); const params = (0, dom_1.makeElement)('pre'); params.textContent = JSON.stringify(c.arguments, null, 2); card.append(params); if (c.status === 'prepared') {
        card.append((0, dom_1.makeElement)('p', c.approvalRequired ? 'External mutation requires exact approval.' : 'Read action is allowed by connector policy.'), button(c.approvalRequired ? 'Approve and execute' : 'Execute read', async () => { await api(`/api/connectors/calls/${encodeURIComponent(id)}/execute`, { method: 'POST', body: JSON.stringify({ confirm: true }) }); await showCall(target, id); }), button('Cancel', async () => { await api(`/api/connectors/calls/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: '{}' }); await showCall(target, id); }));
    } if (c.result) {
        const result = (0, dom_1.makeElement)('pre');
        result.textContent = JSON.stringify(c.result, null, 2);
        card.append(result);
    } if (c.error)
        card.append((0, dom_1.makeElement)('p', `Error: ${c.error}`)); if (c.status === 'running')
        card.append((0, dom_1.makeElement)('p', 'Операция уже отправлена. Автоматический повтор заблокирован до получения финального результата.')); if (c.status === 'uncertain') {
        card.append((0, dom_1.makeElement)('p', 'Auto-retry is blocked. Reconcile the result in the connected service before any new mutation.'));
        const form = (0, dom_1.makeElement)('form');
        form.className = 'connector-reconcile-form';
        const outcome = (0, dom_1.makeElement)('select');
        for (const [value, label] of [['succeeded', 'Succeeded'], ['failed', 'Failed'], ['not_executed', 'Not executed']]) {
            const option = (0, dom_1.makeElement)('option', label);
            option.value = value;
            outcome.append(option);
        }
        const evidence = (0, dom_1.makeElement)('textarea');
        evidence.maxLength = 2000;
        evidence.placeholder = 'Что подтверждает фактический результат во внешнем сервисе?';
        const submit = (0, dom_1.makeElement)('button', 'Reconcile');
        submit.type = 'submit';
        form.append(makeLabel('Observed outcome', outcome), makeLabel('Evidence', evidence), submit);
        form.onsubmit = e => { e.preventDefault(); submit.disabled = true; void (async () => { try {
            await api(`/api/connectors/calls/${encodeURIComponent(id)}/reconcile`, { method: 'POST', body: JSON.stringify({ outcome: outcome.value, evidence: evidence.value }) });
            status.textContent = 'Uncertain effect reconciled. Automatic duplicate execution remains blocked by idempotency history.';
            await showCall(target, id);
        }
        catch (error) {
            status.textContent = error instanceof Error ? error.message : 'Reconciliation failed';
        }
        finally {
            submit.disabled = false;
        } })(); };
        card.append(form);
    } target.append(card); }
    function button(label, fn) { const b = (0, dom_1.makeElement)('button', label); b.type = 'button'; b.onclick = async () => { b.disabled = true; try {
        await fn();
    }
    catch (error) {
        status.textContent = error instanceof Error ? error.message : 'Action failed';
    }
    finally {
        b.disabled = false;
    } }; return b; }
    await load();
}
function metric(label, value) { const el = (0, dom_1.makeElement)('div'); el.append((0, dom_1.makeElement)('small', label), (0, dom_1.makeElement)('strong', value)); return el; }
function fact(label, value) { const el = (0, dom_1.makeElement)('div'); el.append((0, dom_1.makeElement)('small', label), (0, dom_1.makeElement)('strong', value)); return el; }
function section(title, meta) { const root = (0, dom_1.makeElement)('section'); root.className = 'connection-section'; const head = (0, dom_1.makeElement)('div'); head.className = 'section-heading'; head.append((0, dom_1.makeElement)('h3', title), (0, dom_1.makeElement)('span', meta)); const body = (0, dom_1.makeElement)('div'); root.append(head, body); return { root, body }; }
function connectForm(catalog, api, onConnected, status) { const wrap = (0, dom_1.makeElement)('details'); wrap.className = 'connection-add'; wrap.append((0, dom_1.makeElement)('summary', 'Add connection')); if (!catalog.length) {
    wrap.append((0, dom_1.makeElement)('p', 'Operator has not configured MCP_SERVERS.'));
    return wrap;
} const form = (0, dom_1.makeElement)('form'); form.className = 'connector-form'; const select = (0, dom_1.makeElement)('select'); const token = (0, dom_1.makeElement)('input'); token.type = 'password'; token.autocomplete = 'off'; token.maxLength = 8192; const label = (0, dom_1.makeElement)('input'); label.maxLength = 80; label.placeholder = 'Optional display name'; for (const p of catalog) {
    const o = (0, dom_1.makeElement)('option', p.name);
    o.value = p.id;
    select.append(o);
} const tokenLabel = (0, dom_1.makeElement)('label', 'Service token'); const update = () => { const p = catalog.find(x => x.id === select.value); const needs = p?.auth === 'bearer'; token.required = needs; token.hidden = !needs; tokenLabel.hidden = !needs; token.value = ''; }; select.onchange = update; update(); const submit = (0, dom_1.makeElement)('button', 'Connect'); submit.type = 'submit'; submit.className = 'primary'; form.append(makeLabel('Service', select), makeLabel('Display name', label), tokenLabel, token, submit); form.onsubmit = e => { e.preventDefault(); submit.disabled = true; void (async () => { try {
    const p = catalog.find(x => x.id === select.value);
    if (p.auth === 'oauth') {
        const r = await api('/api/connectors/oauth/start', { method: 'POST', body: JSON.stringify({ endpointKey: p.id }) });
        location.assign(r.url);
        return;
    }
    await api('/api/connectors', { method: 'POST', body: JSON.stringify({ endpointKey: p.id, label: label.value, token: token.value }) });
    token.value = '';
    label.value = '';
    status.textContent = `${p.name} connected. Verify it before using tools.`;
    await onConnected();
}
catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Connection failed';
}
finally {
    submit.disabled = false;
} })(); }; wrap.append(form); return wrap; }
function makeLabel(text, control) { const l = (0, dom_1.makeElement)('label', text); l.append(control); return l; }

},
"ui/data-studio":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderDataHistory = renderDataHistory;
exports.mountDataStudio = mountDataStudio;
exports.runDataStudio = runDataStudio;
exports.cleanupDataStudio = cleanupDataStudio;
const data_1 = require("./data");
const media_1 = require("./media");
const dom_1 = require("./components/dom");
const panel_state_1 = require("./components/panel-state");
let original = null, current = null, sourceName = 'dataset.csv', viewRows = [];
const $ = (host, selector) => host.querySelector(selector);
const fmt = (value, digits = 3) => typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value) : '—';
const bytes = (value) => value < 1024 ? `${value} B` : value < 1024 * 1024 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`;
function table(headers, rows, className = '') {
    const wrap = (0, dom_1.makeElement)('div');
    wrap.className = `table-wrap ${className}`.trim();
    const table = (0, dom_1.makeElement)('table'), head = (0, dom_1.makeElement)('thead'), tr = (0, dom_1.makeElement)('tr');
    headers.forEach(value => tr.append((0, dom_1.makeElement)('th', value)));
    head.append(tr);
    table.append(head);
    const body = (0, dom_1.makeElement)('tbody');
    rows.forEach(values => { const row = (0, dom_1.makeElement)('tr'); values.forEach(value => row.append((0, dom_1.makeElement)('td', value))); body.append(row); });
    table.append(body);
    wrap.append(table);
    return wrap;
}
function metric(label, value, note = '') { const card = (0, dom_1.makeElement)('div'); card.className = 'data-metric'; card.append((0, dom_1.makeElement)('small', label), (0, dom_1.makeElement)('strong', value)); if (note)
    card.append((0, dom_1.makeElement)('span', note)); return card; }
function reportBlob(dataset) { return new Blob([JSON.stringify({ analysis: dataset.analysis, transformations: dataset.transformations }, null, 2)], { type: 'application/json' }); }
function exportRows(dataset, rows, suffix) { (0, media_1.download)(new Blob([(0, data_1.serializeCSV)(dataset.header, rows, dataset.delimiter)], { type: 'text/csv;charset=utf-8' }), `${sourceName.replace(/\.csv$/i, '')}-${suffix}.csv`); }
function drawChart(canvas, column, dataset) {
    const ctx = canvas.getContext('2d');
    if (!ctx)
        return;
    const dpr = Math.max(1, Math.min(2, devicePixelRatio || 1)), w = Math.max(360, canvas.clientWidth || 760), h = 240;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    ctx.font = '11px system-ui';
    ctx.fillStyle = '#a99cc0';
    ctx.fillText(`${column.name} · ${column.type}`, 12, 18);
    const values = dataset.rows.map(row => (row[column.index] ?? '').trim()).filter(Boolean);
    if (!values.length) {
        ctx.fillText('Нет данных для графика.', 12, 48);
        return;
    }
    let labels = [], counts = [];
    if (column.type === 'number') {
        const nums = values.map(value => (0, data_1.parseDataNumber)(value, dataset.delimiter)).filter((value) => value !== null);
        if (!nums.length) {
            ctx.fillText('Нет числовых значений.', 12, 48);
            return;
        }
        let min = nums[0], max = nums[0];
        for (const n of nums) {
            if (n < min)
                min = n;
            if (n > max)
                max = n;
        }
        const bins = 10, span = max - min || 1, arr = Array(bins).fill(0);
        for (const n of nums)
            arr[Math.min(bins - 1, Math.floor((n - min) / span * bins))]++;
        counts = arr;
        labels = arr.map((_, i) => fmt(min + span * (i + .5) / bins, 2));
    }
    else {
        const map = new Map();
        for (const value of values)
            map.set(value, (map.get(value) ?? 0) + 1);
        const top = [...map].sort((a, b) => b[1] - a[1]).slice(0, 10);
        labels = top.map(v => v[0]);
        counts = top.map(v => v[1]);
    }
    const maxCount = Math.max(...counts, 1), left = 42, base = h - 32, chartW = w - left - 12, barW = Math.max(8, chartW / counts.length - 8);
    ctx.strokeStyle = '#3b3346';
    ctx.beginPath();
    ctx.moveTo(left, 30);
    ctx.lineTo(left, base);
    ctx.lineTo(w - 10, base);
    ctx.stroke();
    counts.forEach((count, i) => { const x = left + i * (chartW / counts.length) + 4, bh = (base - 48) * (count / maxCount), y = base - bh; ctx.fillStyle = '#76569d'; ctx.fillRect(x, y, barW, bh); ctx.fillStyle = '#9e91ae'; ctx.fillText(String(count), x, Math.max(42, y - 5)); const label = labels[i].length > 12 ? `${labels[i].slice(0, 11)}…` : labels[i]; ctx.save(); ctx.translate(x + 2, base + 12); ctx.rotate(-.35); ctx.fillText(label, 0, 0); ctx.restore(); });
}
function issueSection(analysis) { const section = (0, dom_1.makeElement)('section'); section.className = 'data-section'; const heading = (0, dom_1.makeElement)('div'); heading.className = 'section-heading'; heading.append((0, dom_1.makeElement)('h3', 'Validation'), (0, dom_1.makeElement)('span', analysis.issues.length ? `${analysis.issues.length} issue types` : 'No structural issues')); section.append(heading); if (!analysis.issues.length) {
    section.append((0, dom_1.makeElement)('p', 'Структурных проблем не найдено.'));
    return section;
} const grid = (0, dom_1.makeElement)('div'); grid.className = 'data-issue-grid'; for (const item of analysis.issues) {
    const card = (0, dom_1.makeElement)('div');
    card.className = 'data-issue';
    const top = (0, dom_1.makeElement)('div');
    top.className = 'data-issue-head';
    top.append((0, dom_1.makeElement)('strong', item.message), (0, dom_1.makeElement)('span', String(item.count)));
    card.append(top, (0, dom_1.makeElement)('small', item.severity === 'warning' ? 'Требует проверки' : 'Информационно'));
    grid.append(card);
} section.append(grid); return section; }
function schemaSection(dataset) { const section = (0, dom_1.makeElement)('section'); section.className = 'data-section'; const heading = (0, dom_1.makeElement)('div'); heading.className = 'section-heading'; heading.append((0, dom_1.makeElement)('h3', 'Schema inference'), (0, dom_1.makeElement)('span', 'Type · completeness · uniqueness')); section.append(heading, table(['Column', 'Type', 'Filled', 'Missing', 'Unique', 'Mean', 'Median', 'Std dev'], dataset.analysis.columns.map(c => [c.name, c.type, String(c.filled), String(c.missing), String(c.unique), fmt(c.mean), fmt(c.median), fmt(c.stddev)]), 'data-schema-table')); return section; }
function cleanupOptions(host) { return { trimCells: !!$(host, '#data-trim')?.checked, dropEmptyRows: !!$(host, '#data-drop-empty-rows')?.checked, removeDuplicates: !!$(host, '#data-dedupe')?.checked, normalizeHeaders: !!$(host, '#data-normalize-headers')?.checked, dropEmptyColumns: !!$(host, '#data-drop-empty-columns')?.checked }; }
function historySummary(item) { return `${item.rowCount} rows · ${item.columnCount} columns · ${item.issueCount} issues`; }
async function renderDataHistory(context) {
    const host = $(context.controls, '#data-history');
    if (!host)
        return;
    (0, panel_state_1.renderPanelLoading)(host, 'Загружаю историю datasets…');
    if (!context.account || !context.projectId) {
        host.append((0, dom_1.makeElement)('p', 'Выберите Project и войдите, чтобы сохранять историю datasets.'));
        return;
    }
    const response = await context.api(`/api/studio/data/reports?projectId=${encodeURIComponent(context.projectId)}`, { signal: context.signal });
    if (!response.items.length) {
        host.append((0, dom_1.makeElement)('p', 'Сохранённых datasets пока нет.'));
        return;
    }
    for (const item of response.items) {
        const card = (0, dom_1.makeElement)('article');
        card.className = 'data-history-card';
        const info = (0, dom_1.makeElement)('div');
        info.append((0, dom_1.makeElement)('strong', item.fileName), (0, dom_1.makeElement)('small', historySummary(item)), (0, dom_1.makeElement)('span', new Date(item.createdAt).toLocaleString()));
        const actions = (0, dom_1.makeElement)('div');
        actions.className = 'data-history-actions';
        const meta = (0, dom_1.makeElement)('button', 'Report');
        meta.onclick = () => context.dialog?.('Data Studio report', `<div class="project-detail-grid"><div><small>ROWS</small><strong>${item.rowCount}</strong></div><div><small>COLUMNS</small><strong>${item.columnCount}</strong></div><div><small>ISSUES</small><strong>${item.issueCount}</strong></div><div><small>TRANSFORMS</small><strong>${item.transformations.length}</strong></div></div>`);
        actions.append(meta);
        if (item.artifactId) {
            const file = (0, dom_1.makeElement)('button', 'CSV');
            file.onclick = () => context.blobAPI(`/api/studio/artifacts/${item.artifactId}`).then(blob => (0, media_1.download)(blob, item.fileName)).catch(context.failure);
            actions.append(file);
        }
        card.append(info, actions);
        host.append(card);
    }
}
async function refreshDataHistory(context) {
    const host = $(context.controls, '#data-history');
    if (!host)
        return;
    try {
        await renderDataHistory(context);
    }
    catch (error) {
        (0, panel_state_1.renderPanelError)(host, (0, panel_state_1.errorMessage)(error), () => refreshDataHistory(context));
        context.failure(error);
    }
}
async function saveDataset(context, dataset, button) {
    if (!context.account)
        throw Error('Войдите, чтобы сохранить dataset.');
    if (context.account.role === 'viewer')
        throw Error('Ваш аккаунт разрешает только просмотр.');
    if (!context.projectId)
        throw Error('Выберите Project перед сохранением dataset.');
    button.disabled = true;
    const csv = (0, data_1.serializeCSV)(dataset.header, dataset.rows, dataset.delimiter), blob = new Blob([csv], { type: 'text/csv;charset=utf-8' }), fileName = sourceName.replace(/\.[^.]+$/, '') + '-dataset.csv';
    try {
        const artifact = await context.api('/api/studio/artifacts', { method: 'POST', headers: { 'Content-Type': 'text/csv', 'X-Filename': encodeURIComponent(fileName), 'X-Project-Id': context.projectId, 'X-Studio-Id': 'data' }, body: blob, signal: context.signal });
        const schema = dataset.analysis.columns.map(c => ({ name: c.name, type: c.type, missing: c.missing, unique: c.unique, min: c.min, max: c.max, mean: c.mean, median: c.median, stddev: c.stddev, typeMismatches: c.typeMismatches }));
        await context.api('/api/studio/data/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: context.projectId, artifactId: artifact.id, fileName, delimiter: dataset.delimiter, rowCount: dataset.analysis.rows, columnCount: dataset.analysis.columnCount, issueCount: dataset.analysis.issueCount, transformations: dataset.transformations, schema, summary: { missingCells: dataset.analysis.missingCells, duplicateRows: dataset.analysis.duplicateRows, emptyRows: dataset.analysis.emptyRows, raggedRows: dataset.analysis.raggedRows } }), signal: context.signal });
        context.notice('Dataset и анализ сохранены в Project.');
        await refreshDataHistory(context);
    }
    finally {
        button.disabled = false;
    }
}
function renderWorkbench(context, dataset) {
    current = dataset;
    viewRows = [...dataset.rows];
    const host = context.result;
    host.replaceChildren();
    const root = (0, dom_1.makeElement)('div');
    root.className = 'data-report';
    const head = (0, dom_1.makeElement)('div');
    head.className = 'data-report-head';
    const title = (0, dom_1.makeElement)('div');
    title.append((0, dom_1.makeElement)('small', 'DATASET'), (0, dom_1.makeElement)('strong', sourceName));
    const detail = (0, dom_1.makeElement)('div');
    detail.append((0, dom_1.makeElement)('small', 'DELIMITER'), (0, dom_1.makeElement)('strong', dataset.analysis.delimiterLabel));
    head.append(title, detail);
    root.append(head);
    const metrics = (0, dom_1.makeElement)('div');
    metrics.className = 'data-metric-grid';
    metrics.append(metric('ROWS', String(dataset.analysis.rows)), metric('COLUMNS', String(dataset.analysis.columnCount)), metric('MISSING', String(dataset.analysis.missingCells)), metric('DUPLICATES', String(dataset.analysis.duplicateRows)), metric('ISSUES', String(dataset.analysis.issueCount)), metric('TRANSFORMS', String(dataset.transformations.length), dataset.transformations.join(', ') || 'none'));
    root.append(metrics, issueSection(dataset.analysis));
    const explore = (0, dom_1.makeElement)('section');
    explore.className = 'data-section';
    const exploreHead = (0, dom_1.makeElement)('div');
    exploreHead.className = 'section-heading';
    exploreHead.append((0, dom_1.makeElement)('h3', 'Table explorer'), (0, dom_1.makeElement)('span', 'Filter · sort · bounded preview'));
    explore.append(exploreHead);
    const toolbar = (0, dom_1.makeElement)('div');
    toolbar.className = 'data-toolbar';
    toolbar.innerHTML = '<label>Filter<input id="data-filter" type="search" maxlength="120" placeholder="Search all columns"></label><label>Sort<select id="data-sort-column"><option value="">None</option></select></label><label>Direction<select id="data-sort-direction"><option value="asc">Ascending</option><option value="desc">Descending</option></select></label><button id="data-reset-view" type="button">Reset view</button>';
    explore.append(toolbar);
    const tableHost = (0, dom_1.makeElement)('div');
    tableHost.id = 'data-table-host';
    explore.append(tableHost);
    root.append(explore, schemaSection(dataset));
    const chartSection = (0, dom_1.makeElement)('section');
    chartSection.className = 'data-section';
    const chartHead = (0, dom_1.makeElement)('div');
    chartHead.className = 'section-heading';
    chartHead.append((0, dom_1.makeElement)('h3', 'Chart'), (0, dom_1.makeElement)('span', 'Histogram or top categories'));
    const chartSelect = (0, dom_1.makeElement)('select');
    chartSelect.id = 'data-chart-column';
    dataset.analysis.columns.forEach((c, i) => { const option = (0, dom_1.makeElement)('option', `${c.name} · ${c.type}`); option.value = String(i); chartSelect.append(option); });
    const chartControls = (0, dom_1.makeElement)('div');
    chartControls.className = 'data-chart-controls';
    chartControls.append(chartSelect);
    const canvas = (0, dom_1.makeElement)('canvas');
    canvas.className = 'data-chart';
    chartSection.append(chartHead, chartControls, canvas);
    root.append(chartSection);
    const transform = (0, dom_1.makeElement)('section');
    transform.className = 'data-section';
    const transformHead = (0, dom_1.makeElement)('div');
    transformHead.className = 'section-heading';
    transformHead.append((0, dom_1.makeElement)('h3', 'Transformations'), (0, dom_1.makeElement)('span', 'Explicit, local and reversible until export/save'));
    transform.append(transformHead);
    const checks = (0, dom_1.makeElement)('div');
    checks.className = 'data-transform-grid';
    checks.innerHTML = '<label><input id="data-trim" type="checkbox" checked> Trim whitespace</label><label><input id="data-drop-empty-rows" type="checkbox" checked> Drop empty rows</label><label><input id="data-dedupe" type="checkbox"> Remove duplicate rows</label><label><input id="data-normalize-headers" type="checkbox"> Normalize headers</label><label><input id="data-drop-empty-columns" type="checkbox"> Drop empty columns</label>';
    const transformActions = (0, dom_1.makeElement)('div');
    transformActions.className = 'toolbar';
    const apply = (0, dom_1.makeElement)('button', 'Apply transformations');
    apply.id = 'data-apply';
    const reset = (0, dom_1.makeElement)('button', 'Reset dataset');
    reset.id = 'data-reset';
    transformActions.append(apply, reset);
    transform.append(checks, transformActions);
    root.append(transform);
    const actions = (0, dom_1.makeElement)('div');
    actions.className = 'toolbar data-actions';
    const exportView = (0, dom_1.makeElement)('button', 'Export filtered CSV'), exportAll = (0, dom_1.makeElement)('button', 'Export dataset CSV'), exportReport = (0, dom_1.makeElement)('button', 'Export report JSON');
    actions.append(exportView, exportAll, exportReport);
    if (context.account && context.account.role !== 'viewer') {
        const save = (0, dom_1.makeElement)('button', 'Save dataset to Project');
        save.className = 'primary';
        save.disabled = !context.projectId;
        save.title = context.projectId ? 'Save current dataset and analysis' : 'Choose a Project first';
        save.onclick = () => current && saveDataset(context, current, save).catch(context.failure);
        actions.append(save);
    }
    root.append(actions);
    host.append(root);
    const sortSelect = $(root, '#data-sort-column');
    dataset.analysis.columns.forEach((c, i) => { const option = (0, dom_1.makeElement)('option', c.name); option.value = String(i); sortSelect.append(option); });
    const redrawTable = () => { if (!current)
        return; const query = $(root, '#data-filter').value; let rows = (0, data_1.filterDataRows)(current.rows, query); const index = sortSelect.value === '' ? -1 : Number(sortSelect.value); if (index >= 0) {
        const column = current.analysis.columns[index], direction = $(root, '#data-sort-direction').value;
        rows = (0, data_1.sortDataRows)(rows, column, direction, current.delimiter);
    } viewRows = rows; const preview = rows.slice(0, 200), body = table(current.header, preview, 'data-preview-table'); tableHost.replaceChildren(body, (0, dom_1.makeElement)('p', `${rows.length} matching rows${rows.length > 200 ? ' · showing first 200' : ''}.`)); };
    $(root, '#data-filter').oninput = redrawTable;
    sortSelect.onchange = redrawTable;
    $(root, '#data-sort-direction').onchange = redrawTable;
    $(root, '#data-reset-view').onclick = () => { $(root, '#data-filter').value = ''; sortSelect.value = ''; redrawTable(); };
    chartSelect.onchange = () => { if (current)
        drawChart(canvas, current.analysis.columns[Number(chartSelect.value)], current); };
    apply.onclick = () => { if (!current)
        return; current = (0, data_1.cleanupDataset)(current, cleanupOptions(root)); renderWorkbench(context, current); context.notice('Transformations применены локально. Исходный файл не изменён.'); };
    reset.onclick = () => { if (original) {
        current = original;
        renderWorkbench(context, original);
        context.notice('Dataset возвращён к исходному состоянию.');
    } };
    exportView.onclick = () => current && exportRows(current, viewRows, 'filtered');
    exportAll.onclick = () => current && exportRows(current, current.rows, 'export');
    exportReport.onclick = () => current && (0, media_1.download)(reportBlob(current), `${sourceName.replace(/\.csv$/i, '')}-report.json`);
    redrawTable();
    requestAnimationFrame(() => { if (current && current.analysis.columns.length)
        drawChart(canvas, current.analysis.columns[0], current); });
}
function mountDataStudio(context) {
    original = null;
    current = null;
    sourceName = 'dataset.csv';
    viewRows = [];
    context.controls.innerHTML = '<div class="data-studio-shell"><section class="data-input"><label for="studio-file">CSV / delimited dataset</label><input id="studio-file" type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values"><p class="context-note">До 2 МБ, 50 000 строк, 256 столбцов и 250 000 ячеек. Анализ, фильтры, сортировка, chart и transformations выполняются локально. Cloud save — только по отдельной кнопке.</p><div class="toolbar"><button id="studio-run" class="primary" type="button"></button></div></section><section class="data-history"><div class="section-heading"><h3>Project history</h3><span>Saved datasets</span></div><div id="data-history"></div></section></div>';
    context.mountDraft(false, { scope: context.account?.id ?? 'local', writable: false });
    void refreshDataHistory(context);
    return () => { original = null; current = null; viewRows = []; };
}
async function runDataStudio(context) {
    const file = $(context.controls, '#studio-file')?.files?.[0];
    if (!file)
        throw Error('Выберите CSV/TSV файл.');
    if (file.size > 2_000_000)
        throw Error('Dataset должен быть не больше 2 МБ.');
    sourceName = file.name || 'dataset.csv';
    context.notice(`Data Studio: читаю ${bytes(file.size)} и строю schema/statistics…`);
    const text = await file.text();
    if (context.signal.aborted)
        throw new DOMException('Aborted', 'AbortError');
    const dataset = (0, data_1.parseDataset)(text);
    original = dataset;
    current = dataset;
    if (context.current())
        renderWorkbench(context, dataset);
}
function cleanupDataStudio() { original = null; current = null; viewRows = []; }

},
"ui/data":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DATA_CELL_LIMIT = exports.DATA_COLUMN_LIMIT = exports.DATA_ROW_LIMIT = exports.DATA_TEXT_LIMIT = void 0;
exports.detectDelimiter = detectDelimiter;
exports.parseCSV = parseCSV;
exports.parseDataNumber = parseDataNumber;
exports.analyzeRows = analyzeRows;
exports.parseDataset = parseDataset;
exports.analyzeCSV = analyzeCSV;
exports.cleanupDataset = cleanupDataset;
exports.serializeCSV = serializeCSV;
exports.sortDataRows = sortDataRows;
exports.filterDataRows = filterDataRows;
exports.DATA_TEXT_LIMIT = 2_000_000;
exports.DATA_ROW_LIMIT = 50_000;
exports.DATA_COLUMN_LIMIT = 256;
exports.DATA_CELL_LIMIT = 250_000;
function delimiter(text) {
    const counts = { ',': 0, ';': 0, '\t': 0 };
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
            if (quoted && text[i + 1] === '"')
                i++;
            else
                quoted = !quoted;
        }
        else if (!quoted) {
            if (c === '\n' || c === '\r')
                break;
            if (Object.hasOwn(counts, c))
                counts[c]++;
        }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}
function detectDelimiter(text) { return delimiter(text.replace(/^\uFEFF/, '')); }
/** Bounded RFC-style parsing with common spreadsheet separators and BOM support. */
function parseCSV(source) {
    if (source.length > exports.DATA_TEXT_LIMIT)
        throw Error('CSV должен быть меньше 2 МБ.');
    const text = source.replace(/^\uFEFF/, ''), separator = delimiter(text), rows = [];
    let row = [], value = '', quoted = false, closed = false, cells = 0;
    const cell = () => { if (row.length >= exports.DATA_COLUMN_LIMIT || ++cells > exports.DATA_CELL_LIMIT)
        throw Error('Слишком большая таблица: до 256 столбцов и 250 000 ячеек.'); row.push(value); value = ''; closed = false; };
    const endRow = () => { cell(); if (rows.length >= exports.DATA_ROW_LIMIT)
        throw Error('CSV должен содержать до 50 000 строк.'); rows.push(row); row = []; };
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quoted) {
            if (c === '"') {
                if (text[i + 1] === '"') {
                    value += '"';
                    i++;
                }
                else {
                    quoted = false;
                    closed = true;
                }
            }
            else
                value += c;
            continue;
        }
        if (c === separator) {
            cell();
            continue;
        }
        if (c === '\n' || c === '\r') {
            if (c === '\r' && text[i + 1] === '\n')
                i++;
            endRow();
            continue;
        }
        if (c === '"') {
            if (value !== '' || closed)
                throw Error('Кавычка внутри незаключённой в кавычки ячейки CSV.');
            quoted = true;
            continue;
        }
        if (closed)
            throw Error('После закрывающей кавычки нужен разделитель или конец строки.');
        value += c;
    }
    if (quoted)
        throw Error('Незакрытая кавычка CSV.');
    if (row.length || value || closed)
        endRow();
    return rows;
}
function parseDataNumber(value, separator) {
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    let normalized = trimmed.replace(/\u00A0/g, ' ').replace(/\s+/g, '');
    if (separator !== ',' && normalized.includes(',') && !normalized.includes('.') && /^[-+]?\d+(?:,\d+)?(?:[eE][-+]?\d+)?$/.test(normalized))
        normalized = normalized.replace(',', '.');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
}
function isBoolean(value) { return /^(?:true|false|yes|no)$/i.test(value.trim()); }
function isIsoDate(value) { const v = value.trim(); if (!/^\d{4}-\d{2}-\d{2}(?:[T ][0-2]\d:[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(v))
    return false; return Number.isFinite(Date.parse(v)); }
function safeMean(numbers) { let mean = 0, count = 0; for (const n of numbers) {
    count++;
    mean += (n - mean) / count;
} return count ? mean : null; }
function median(numbers) { if (!numbers.length)
    return null; const sorted = [...numbers].sort((a, b) => a - b), mid = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2; }
function standardDeviation(numbers) { if (!numbers.length)
    return null; let mean = 0, m2 = 0, n = 0; for (const x of numbers) {
    n++;
    const d = x - mean;
    mean += d / n;
    m2 += d * (x - mean);
} return Math.sqrt(m2 / n); }
function topValues(values) { const counts = new Map(); for (const value of values) {
    const key = value.trim();
    if (!key)
        continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
} return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8).map(([value, count]) => ({ value, count })); }
function inferType(values, separator) {
    const nonEmpty = values.map(v => v.trim()).filter(Boolean);
    if (!nonEmpty.length)
        return { type: 'empty', mismatches: 0, numbers: [] };
    const numbers = nonEmpty.map(v => parseDataNumber(v, separator)), numeric = numbers.filter((n) => n !== null);
    const boolCount = nonEmpty.filter(isBoolean).length, dateCount = nonEmpty.filter(isIsoDate).length;
    const threshold = Math.max(1, Math.ceil(nonEmpty.length * .9));
    if (numeric.length >= threshold)
        return { type: 'number', mismatches: nonEmpty.length - numeric.length, numbers: numeric };
    if (boolCount >= threshold)
        return { type: 'boolean', mismatches: nonEmpty.length - boolCount, numbers: [] };
    if (dateCount >= threshold)
        return { type: 'date', mismatches: nonEmpty.length - dateCount, numbers: [] };
    const unique = new Set(nonEmpty).size, categoryLimit = Math.max(8, Math.min(50, Math.ceil(nonEmpty.length * .2)));
    if (unique <= categoryLimit)
        return { type: 'category', mismatches: 0, numbers: [] };
    return { type: 'text', mismatches: 0, numbers: [] };
}
function delimiterLabel(value) { return value === '\t' ? 'TAB' : value === ';' ? 'Semicolon' : value === ',' ? 'Comma' : value; }
function issue(code, message, count, severity = 'warning') { return { code, message, count, severity }; }
function analyzeRows(header, rows, separator = ',') {
    const width = header.length, raggedRows = rows.filter(r => r.length !== width).length;
    const emptyRows = rows.filter(r => r.every(v => !v?.trim())).length;
    const seenRows = new Set();
    let duplicateRows = 0;
    for (const row of rows) {
        const key = row.map(v => v ?? '').join('\u001f');
        if (seenRows.has(key))
            duplicateRows++;
        else
            seenRows.add(key);
    }
    const names = header.map(v => v.trim()), nameCounts = new Map();
    for (const name of names.filter(Boolean))
        nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
    const duplicateHeaders = [...nameCounts.values()].reduce((n, count) => n + Math.max(0, count - 1), 0), emptyHeaders = names.filter(v => !v).length;
    let missingCells = 0, totalTypeMismatches = 0;
    const columns = header.map((name, index) => {
        const values = rows.map(r => r[index] ?? ''), filled = values.filter(v => v.trim() !== '').length, missing = rows.length - filled;
        missingCells += missing;
        const nonEmpty = values.filter(v => v.trim() !== ''), unique = new Set(nonEmpty.map(v => v.trim())).size, inferred = inferType(values, separator);
        totalTypeMismatches += inferred.mismatches;
        const numbers = inferred.type === 'number' ? inferred.numbers : [];
        let min = null, max = null;
        for (const n of numbers) {
            min = min === null || n < min ? n : min;
            max = max === null || n > max ? n : max;
        }
        return { index, name: name.trim() || `Column ${index + 1}`, type: inferred.type, filled, missing, unique, numeric: numbers.length, typeMismatches: inferred.mismatches, min, max, mean: safeMean(numbers), median: median(numbers), stddev: standardDeviation(numbers), topValues: topValues(nonEmpty) };
    });
    const issues = [];
    if (emptyHeaders)
        issues.push(issue('empty_headers', 'Есть пустые заголовки столбцов.', emptyHeaders));
    if (duplicateHeaders)
        issues.push(issue('duplicate_headers', 'Есть повторяющиеся заголовки столбцов.', duplicateHeaders));
    if (raggedRows)
        issues.push(issue('ragged_rows', 'В строках различается число ячеек.', raggedRows));
    if (missingCells)
        issues.push(issue('missing_values', 'Есть пропущенные значения.', missingCells, 'info'));
    if (duplicateRows)
        issues.push(issue('duplicate_rows', 'Есть полностью повторяющиеся строки.', duplicateRows, 'info'));
    if (totalTypeMismatches)
        issues.push(issue('mixed_types', 'Часть значений не соответствует определённому типу столбца.', totalTypeMismatches));
    return { rows: rows.length, columnCount: width, delimiter: separator, delimiterLabel: delimiterLabel(separator), columns, raggedRows, duplicateRows, emptyRows, missingCells, issueCount: issues.reduce((n, v) => n + v.count, 0), issues };
}
function parseDataset(text) {
    const separator = detectDelimiter(text), parsed = parseCSV(text), header = parsed.shift() ?? [];
    if (!header.length)
        throw Error('CSV не содержит заголовка.');
    return { delimiter: separator, header, rows: parsed, analysis: analyzeRows(header, parsed, separator), transformations: [] };
}
function analyzeCSV(text) { return parseDataset(text).analysis; }
function normalizedHeader(value, index, used) {
    const base = (value.trim() || `column_${index + 1}`).normalize('NFKC').replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '').toLowerCase() || `column_${index + 1}`;
    let next = base, suffix = 2;
    while (used.has(next))
        next = `${base}_${suffix++}`;
    used.add(next);
    return next;
}
function cleanupDataset(input, options) {
    let header = [...input.header], rows = input.rows.map(row => [...row]), transformations = [...input.transformations];
    if (options.trimCells) {
        header = header.map(v => v.trim());
        rows = rows.map(row => row.map(v => v.trim()));
        transformations.push('trim_cells');
    }
    if (options.dropEmptyRows) {
        const before = rows.length;
        rows = rows.filter(row => row.some(v => v.trim() !== ''));
        if (rows.length !== before)
            transformations.push('drop_empty_rows');
    }
    if (options.removeDuplicates) {
        const seen = new Set(), before = rows.length;
        rows = rows.filter(row => { const key = row.map(v => v ?? '').join('\u001f'); if (seen.has(key))
            return false; seen.add(key); return true; });
        if (rows.length !== before)
            transformations.push('remove_duplicates');
    }
    if (options.dropEmptyColumns) {
        const keep = header.map((_, i) => rows.some(row => (row[i] ?? '').trim() !== '')).map((keep, i) => keep ? i : -1).filter(i => i >= 0);
        if (keep.length > 0 && keep.length !== header.length) {
            header = keep.map(i => header[i]);
            rows = rows.map(row => keep.map(i => row[i] ?? ''));
            transformations.push('drop_empty_columns');
        }
    }
    if (options.normalizeHeaders) {
        const used = new Set();
        header = header.map((v, i) => normalizedHeader(v, i, used));
        transformations.push('normalize_headers');
    }
    return { delimiter: input.delimiter, header, rows, analysis: analyzeRows(header, rows, input.delimiter), transformations: [...new Set(transformations)] };
}
function quoteCell(value, separator) { const text = String(value ?? ''); return /["\r\n]/.test(text) || text.includes(separator) ? `"${text.replace(/"/g, '""')}"` : text; }
function serializeCSV(header, rows, separator = ',') {
    return [header, ...rows].map(row => row.map(value => quoteCell(value, separator)).join(separator)).join('\r\n') + '\r\n';
}
function sortDataRows(rows, column, direction, separator = ',') {
    const sign = direction === 'asc' ? 1 : -1, index = column.index;
    return [...rows].sort((a, b) => {
        const av = (a[index] ?? '').trim(), bv = (b[index] ?? '').trim();
        if (!av && !bv)
            return 0;
        if (!av)
            return 1;
        if (!bv)
            return -1;
        if (column.type === 'number') {
            const an = parseDataNumber(av, separator), bn = parseDataNumber(bv, separator);
            if (an !== null && bn !== null)
                return (an - bn) * sign;
        }
        if (column.type === 'date') {
            const at = Date.parse(av), bt = Date.parse(bv);
            if (Number.isFinite(at) && Number.isFinite(bt))
                return (at - bt) * sign;
        }
        return av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' }) * sign;
    });
}
function filterDataRows(rows, query) { const q = query.trim().toLocaleLowerCase(); if (!q)
    return [...rows]; return rows.filter(row => row.some(value => String(value ?? '').toLocaleLowerCase().includes(q))); }

},
"ui/event-stream":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProjectEventClient = createProjectEventClient;
function createProjectEventClient(options) {
    const { api, projectId, onEvent, onStatus } = options;
    const key = `pulse.events.${projectId}`;
    let stopped = false, ws = null, retry = 0, timer = 0;
    let cursor = 0;
    try {
        const saved = Number(sessionStorage.getItem(key) ?? '0');
        if (Number.isSafeInteger(saved) && saved >= 0)
            cursor = saved;
    }
    catch { }
    function accept(event) {
        if (!event || event.projectId !== projectId || !Number.isSafeInteger(event.seq) || event.seq <= cursor)
            return;
        cursor = event.seq;
        try {
            sessionStorage.setItem(key, String(cursor));
        }
        catch { }
        ;
        onEvent(event);
    }
    async function replay() {
        for (let page = 0; page < 20 && !stopped; page++) {
            const r = await api(`/api/projects/${encodeURIComponent(projectId)}/events?after=${cursor}&limit=250`);
            for (const event of r.events ?? [])
                accept(event);
            if (!r.hasMore)
                return;
        }
        throw Error('Event replay window exceeded; refresh the project before continuing.');
    }
    async function connect() {
        if (stopped || typeof WebSocket === 'undefined')
            return;
        onStatus?.('connecting');
        try {
            await replay();
            if (stopped)
                return;
            const ticket = await api('/api/stream/ticket', { method: 'POST', body: JSON.stringify({ projectId }) });
            const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(`${proto}//${location.host}/api/stream?ticket=${encodeURIComponent(ticket.ticket)}&projectId=${encodeURIComponent(projectId)}`);
            ws.onopen = () => { retry = 0; onStatus?.('live'); };
            ws.onmessage = (message) => { let frame; try {
                frame = JSON.parse(String(message.data));
            }
            catch {
                return;
            } if (frame?.type === 'event_stream')
                accept(frame.event); };
            ws.onerror = () => { };
            ws.onclose = () => { ws = null; if (stopped)
                return; onStatus?.('offline'); clearTimeout(timer); timer = window.setTimeout(() => void connect(), Math.min(15000, 1000 * 2 ** Math.min(retry++, 4))); };
        }
        catch {
            if (stopped)
                return;
            onStatus?.('offline');
            clearTimeout(timer);
            timer = window.setTimeout(() => void connect(), Math.min(15000, 1000 * 2 ** Math.min(retry++, 4)));
        }
    }
    void connect();
    return () => { stopped = true; clearTimeout(timer); try {
        ws?.close(1000, 'project changed');
    }
    catch { } ws = null; };
}

},
"ui/image-request":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPendingImage = readPendingImage;
exports.requestImage = requestImage;
const storageKey = 'pulse.image.pending';
function readPendingImage(account) { try {
    const p = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null');
    return p?.account === account && typeof p.key === 'string' && typeof p.body === 'string' ? p : null;
}
catch {
    return null;
} }
async function requestImage(account, input, api) {
    const body = JSON.stringify(input), old = readPendingImage(account);
    if (old && old.body !== body)
        throw Error('Предыдущая генерация могла быть принята. Сначала восстановите или завершите её с тем же ключом.');
    const pending = old ?? { account, key: crypto.randomUUID(), body };
    sessionStorage.setItem(storageKey, JSON.stringify(pending));
    try {
        const result = await api('/api/studio/image', { method: 'POST', headers: { 'Idempotency-Key': pending.key }, body: pending.body });
        sessionStorage.removeItem(storageKey);
        return result;
    }
    catch (e) {
        const status = e?.status;
        if (status && [400, 401, 403, 404, 405, 413, 415, 422, 429].includes(status))
            sessionStorage.removeItem(storageKey);
        throw e;
    }
}

},
"ui/image-studio-2":function(module,exports,require){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageStudio2Markup = imageStudio2Markup;
exports.mountImageStudio2 = mountImageStudio2;
const esc = (s) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const q = (root, sel) => root.querySelector(sel);
function imageStudio2Markup() {
    return `<section class="image-intelligence-panel">
 <div class="section-heading"><h3>Image Studio 2.0</h3><span class="muted">Reference · Layers · Mask · QA · Export</span></div>
 <div class="image-v2-grid">
  <section><h4>Reference Board</h4><div id="image-reference-board" class="image-reference-board"><p class="muted">Добавляйте результаты из History или Variants Grid.</p></div></section>
  <section><h4>Layers</h4><div class="image-mini-actions"><button id="image-layer-text" type="button">+ Text</button><button id="image-layer-effect" type="button">+ Effect</button><button id="image-layer-background" type="button">+ Background</button></div><div id="image-layers"></div></section>
  <section class="image-mask-panel"><h4>Mask Editor</h4><div class="image-mask-toolbar"><button id="image-mask-brush" type="button">Brush</button><button id="image-mask-erase" type="button">Erase</button><label>Size <input id="image-mask-size" type="range" min="4" max="96" value="28"></label><label>Feather <input id="image-mask-feather" type="range" min="0" max="24" value="4"></label><button id="image-mask-invert" type="button">Invert</button><button id="image-mask-clear" type="button">Clear</button><button id="image-mask-save" type="button">Save mask</button></div><canvas id="image-mask-canvas" width="512" height="512" aria-label="Image mask editor"></canvas><p id="image-mask-status" class="muted">Mask not saved.</p></section>
  <section><h4>Region Suggestions</h4><div id="image-region-suggestions" class="image-region-suggestions"></div><p class="muted">Inpaint / Remove / Replace требуют mask-capable provider. AZRAIL не подменяет их обычным edit prompt.</p></section>
  <section><h4>Consistency & Brand</h4><label class="check"><input id="image-style-lock" type="checkbox"> Style Lock</label><label class="check"><input id="image-identity-lock" type="checkbox"> Character / Product Consistency</label><label>Brand constraints<textarea id="image-brand-constraints" rows="3" maxlength="1600" placeholder="logo safe area\nno bright colors\nuse geometric sans-serif only"></textarea></label><label class="check"><input id="image-structural-mode" type="checkbox"> Structural UI Mode</label><label class="check"><input id="image-restoration" type="checkbox"> Restoration with upscale</label></section>
  <section><h4>Image QA Agent</h4><button id="image-run-qa" type="button">Run measured QA</button><div id="image-qa-result" class="image-qa-result muted">Select or generate an image.</div></section>
  <section><h4>Export Center</h4><label>Preset<select id="image-export-preset"><option value="original">Original</option><option value="social-square">Social 1:1 · 1080</option><option value="social-story">Story 9:16 · 1080×1920</option><option value="web-hero">Web hero · 1920×1080</option><option value="product-square">Product · 1600×1600</option></select></label><label>Format<select id="image-export-format"><option value="image/png">PNG</option><option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option></select></label><button id="image-export" type="button">Export</button><p class="muted">Export is local and never mutates the source artifact.</p></section>
  <section><h4>Version Genealogy</h4><div id="image-version-history" class="image-version-history"><p class="muted">History will show parent → child relationships.</p></div></section>
 </div>
</section>`;
}
function mountImageStudio2(context, hooks) {
    const root = context.controls;
    let maskArtifactId = null, active = null, drawing = false, erase = false, lastX = 0, lastY = 0;
    const refs = [];
    const layers = [{ id: 'base', kind: 'image', name: 'Base image', visible: true, locked: false }];
    const canvas = q(root, '#image-mask-canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx)
        throw Error('Canvas 2D недоступен для Mask Editor.');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const renderLayers = () => { const host = q(root, '#image-layers'); host.replaceChildren(); for (const layer of layers) {
        const row = document.createElement('div');
        row.className = 'image-layer-row';
        row.innerHTML = `<span>${layer.visible ? '👁' : '—'} ${layer.locked ? '🔒' : ''} <strong>${esc(layer.name)}</strong> <small>${layer.kind}</small></span>`;
        const actions = document.createElement('span');
        actions.className = 'image-mini-actions';
        const vis = document.createElement('button');
        vis.textContent = layer.visible ? 'Hide' : 'Show';
        vis.onclick = () => { layer.visible = !layer.visible; renderLayers(); };
        const lock = document.createElement('button');
        lock.textContent = layer.locked ? 'Unlock' : 'Lock';
        lock.onclick = () => { layer.locked = !layer.locked; renderLayers(); };
        const up = document.createElement('button');
        up.textContent = '↑';
        up.onclick = () => { const i = layers.indexOf(layer); if (i > 0) {
            layers.splice(i, 1);
            layers.splice(i - 1, 0, layer);
            renderLayers();
        } };
        const down = document.createElement('button');
        down.textContent = '↓';
        down.onclick = () => { const i = layers.indexOf(layer); if (i < layers.length - 1) {
            layers.splice(i, 1);
            layers.splice(i + 1, 0, layer);
            renderLayers();
        } };
        actions.append(vis, lock, up, down);
        if (layer.id !== 'base') {
            const del = document.createElement('button');
            del.textContent = 'Delete';
            del.onclick = () => { const i = layers.indexOf(layer); if (i >= 0)
                layers.splice(i, 1); renderLayers(); };
            actions.append(del);
        }
        row.append(actions);
        host.append(row);
    } };
    const addLayer = (kind) => { layers.push({ id: crypto.randomUUID(), kind, name: `${kind[0].toUpperCase() + kind.slice(1)} layer`, visible: true, locked: false }); renderLayers(); };
    q(root, '#image-layer-text').onclick = () => addLayer('text');
    q(root, '#image-layer-effect').onclick = () => addLayer('effect');
    q(root, '#image-layer-background').onclick = () => addLayer('background');
    renderLayers();
    const renderBoard = () => { const host = q(root, '#image-reference-board'); host.replaceChildren(); if (!refs.length) {
        host.innerHTML = '<p class="muted">Добавляйте результаты из History или Variants Grid.</p>';
        return;
    } for (const item of refs) {
        const card = document.createElement('article');
        card.className = 'image-reference-card';
        const img = document.createElement('img');
        img.src = item.url;
        img.alt = item.prompt || item.name;
        const meta = document.createElement('small');
        meta.textContent = `${item.width}×${item.height} · ${item.style}`;
        const use = document.createElement('button');
        use.type = 'button';
        use.textContent = 'Use reference';
        use.onclick = () => hooks.useReference(item, 'edit').catch(context.failure);
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = 'Remove';
        remove.onclick = () => { const i = refs.findIndex(r => r.artifactId === item.artifactId); if (i >= 0)
            refs.splice(i, 1); renderBoard(); };
        card.append(img, meta, use, remove);
        host.append(card);
    } };
    const addReference = (item) => { if (!refs.some(r => r.artifactId === item.artifactId)) {
        refs.unshift(item);
        if (refs.length > 8)
            refs.length = 8;
    } active = item; renderBoard(); renderRegionSuggestions(); };
    const renderRegionSuggestions = () => { const host = q(root, '#image-region-suggestions'); host.replaceChildren(); const options = maskArtifactId ? [['inpaint', 'Inpaint region'], ['remove', 'Remove object'], ['replace', 'Replace object'], ['edit', 'Change color / details']] : [['mask', 'Create mask'], ['background-replace', 'Replace background'], ['variation', 'Create variants'], ['upscale', 'Restore + upscale']]; for (const [id, label] of options) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        if (id === 'mask')
            b.onclick = () => canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
        else
            b.onclick = () => { if (id === 'upscale')
                q(root, '#image-restoration').checked = true; hooks.setOperation(id); context.notice(`${label}: режим подготовлен.`); };
        host.append(b);
    } };
    renderRegionSuggestions();
    const point = (event) => { const r = canvas.getBoundingClientRect(); return { x: (event.clientX - r.left) * canvas.width / r.width, y: (event.clientY - r.top) * canvas.height / r.height }; };
    const stroke = (x, y) => { const size = Number(q(root, '#image-mask-size').value) || 28; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = size; ctx.strokeStyle = erase ? '#000' : '#fff'; ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y); ctx.stroke(); lastX = x; lastY = y; };
    canvas.onpointerdown = e => { drawing = true; canvas.setPointerCapture(e.pointerId); const p = point(e); lastX = p.x; lastY = p.y; stroke(p.x, p.y); };
    canvas.onpointermove = e => { if (!drawing)
        return; const p = point(e); stroke(p.x, p.y); };
    canvas.onpointerup = e => { drawing = false; try {
        canvas.releasePointerCapture(e.pointerId);
    }
    catch { } };
    canvas.onpointercancel = () => { drawing = false; };
    q(root, '#image-mask-brush').onclick = () => { erase = false; };
    q(root, '#image-mask-erase').onclick = () => { erase = true; };
    q(root, '#image-mask-clear').onclick = () => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height); maskArtifactId = null; q(root, '#image-mask-status').textContent = 'Mask cleared.'; renderRegionSuggestions(); };
    q(root, '#image-mask-invert').onclick = () => { const data = ctx.getImageData(0, 0, canvas.width, canvas.height); for (let i = 0; i < data.data.length; i += 4) {
        data.data[i] = 255 - data.data[i];
        data.data[i + 1] = 255 - data.data[i + 1];
        data.data[i + 2] = 255 - data.data[i + 2];
        data.data[i + 3] = 255;
    } ctx.putImageData(data, 0, 0); };
    q(root, '#image-mask-save').onclick = () => void (async () => { if (!context.account)
        throw Error('Войдите, чтобы сохранить mask.'); const feather = Number(q(root, '#image-mask-feather').value) || 0; let source = canvas; if (feather > 0) {
        const temp = document.createElement('canvas');
        temp.width = canvas.width;
        temp.height = canvas.height;
        const t = temp.getContext('2d');
        if (!t)
            throw Error('Canvas 2D недоступен.');
        t.filter = `blur(${feather}px)`;
        t.drawImage(canvas, 0, 0);
        source = temp;
    } const blob = await new Promise((resolve, reject) => source.toBlob(v => v ? resolve(v) : reject(Error('Не удалось сериализовать mask.')), 'image/png')); const saved = await context.api('/api/studio/artifacts', { method: 'POST', headers: { 'Content-Type': 'image/png', 'X-Filename': encodeURIComponent(`image-mask-${Date.now()}.png`), 'X-Project-Id': context.projectId ?? '', 'X-Studio-Id': 'image' }, body: blob, signal: context.signal }); maskArtifactId = saved.id; q(root, '#image-mask-status').textContent = `Mask saved · ${saved.id.slice(0, 8)}`; if (!layers.some(l => l.kind === 'mask'))
        layers.push({ id: 'mask', kind: 'mask', name: 'Selection mask', visible: true, locked: false }); renderLayers(); renderRegionSuggestions(); })().catch(context.failure);
    const brandConstraints = () => q(root, '#image-brand-constraints').value.split(/\r?\n|;/).map(v => v.trim()).filter(Boolean).slice(0, 8);
    const getEnhancements = () => ({ maskArtifactId, styleLock: q(root, '#image-style-lock').checked, identityConsistency: q(root, '#image-identity-lock').checked, brandConstraints: brandConstraints(), structuralMode: q(root, '#image-structural-mode').checked, restoration: q(root, '#image-restoration').checked, requestedModel: q(root, '#image-model').value || null });
    q(root, '#image-run-qa').onclick = () => void (async () => { if (!active)
        throw Error('Сначала выберите или создайте изображение.'); const blob = await context.blobAPI(active.url), bitmap = await createImageBitmap(blob); const findings = []; const short = Math.min(bitmap.width, bitmap.height), long = Math.max(bitmap.width, bitmap.height); if (short < 512)
        findings.push({ severity: 'major', code: 'LOW_RESOLUTION', message: `Короткая сторона ${short}px недостаточна для production export.`, safeAutoFix: true, target: 'resolution' });
    else if (short < 768)
        findings.push({ severity: 'minor', code: 'LIMITED_RESOLUTION', message: `Короткая сторона ${short}px ограничивает крупный export.`, safeAutoFix: true, target: 'resolution' }); if (long / Math.max(short, 1) > 3)
        findings.push({ severity: 'minor', code: 'EXTREME_ASPECT', message: 'Проверьте cropping и safe areas для вытянутого кадра.', safeAutoFix: false, target: 'crop' }); const constraints = brandConstraints(); if (constraints.length && !q(root, '#image-style-lock').checked)
        findings.push({ severity: 'improvement', code: 'STYLE_LOCK', message: 'Brand constraints заданы без Style Lock.', safeAutoFix: true, target: 'style-lock' }); bitmap.close(); const host = q(root, '#image-qa-result'); host.innerHTML = findings.length ? findings.map(f => `<p><strong>${f.severity.toUpperCase()}</strong> · ${esc(f.message)}</p>`).join('') : '<p><strong>Measured QA: PASS</strong> · resolution/aspect baseline passed.</p>'; host.insertAdjacentHTML('beforeend', '<p class="muted">Artifact/text/semantic visual QA requires a vision-capable review model and is not fabricated by this local check.</p>'); if (context.account) {
        await context.api('/api/studio/review', { method: 'POST', body: JSON.stringify({ projectId: context.projectId || undefined, studioId: 'image', subjectType: 'image-artifact', subjectId: active.artifactId, findings }), signal: context.signal });
    } })().catch(context.failure);
    q(root, '#image-export').onclick = () => void (async () => { if (!active)
        throw Error('Сначала выберите или создайте изображение.'); const blob = await context.blobAPI(active.url), bitmap = await createImageBitmap(blob), preset = q(root, '#image-export-preset').value, format = q(root, '#image-export-format').value; const dims = { original: null, 'social-square': [1080, 1080], 'social-story': [1080, 1920], 'web-hero': [1920, 1080], 'product-square': [1600, 1600] }; const target = dims[preset], out = document.createElement('canvas'); out.width = target?.[0] ?? bitmap.width; out.height = target?.[1] ?? bitmap.height; const c = out.getContext('2d'); if (!c) {
        bitmap.close();
        throw Error('Canvas export недоступен.');
    } c.clearRect(0, 0, out.width, out.height); const scale = Math.min(out.width / bitmap.width, out.height / bitmap.height), w = bitmap.width * scale, h = bitmap.height * scale; c.drawImage(bitmap, (out.width - w) / 2, (out.height - h) / 2, w, h); bitmap.close(); const quality = format === 'image/jpeg' ? 0.94 : 0.96; const exported = await new Promise((resolve, reject) => out.toBlob(v => v ? resolve(v) : reject(Error('Export failed.')), format, quality)); const ext = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png'; const { download } = await Promise.resolve().then(() => __importStar(require('./media'))); download(exported, `azrail-${preset}-${Date.now()}.${ext}`); context.notice(`Export готов: ${out.width}×${out.height} ${ext.toUpperCase()}.`); })().catch(context.failure);
    const renderVersionHistory = (items) => { const host = q(root, '#image-version-history'); host.replaceChildren(); if (!items.length) {
        host.innerHTML = '<p class="muted">Версий пока нет.</p>';
        return;
    } const byArtifact = new Map(items.map(i => [i.artifactId, i])); for (const item of items.slice(0, 30)) {
        const row = document.createElement('div');
        row.className = 'image-version-row';
        const parent = item.referenceArtifactId ? byArtifact.get(item.referenceArtifactId) : undefined;
        row.innerHTML = `<strong>${esc(item.operation.toUpperCase())}</strong> · ${item.width}×${item.height}<br><small>${parent ? `parent: ${esc(parent.name)}` : item.referenceArtifactId ? `parent artifact: ${esc(item.referenceArtifactId.slice(0, 8))}` : 'root version'}</small>`;
        const open = document.createElement('button');
        open.type = 'button';
        open.textContent = 'Select';
        open.onclick = () => { active = item; addReference(item); };
        row.append(open);
        host.append(row);
    } };
    const setActive = (item) => { active = item; };
    return { addReference, setActive, getEnhancements, renderVersionHistory, destroy() { canvas.onpointerdown = canvas.onpointermove = canvas.onpointerup = canvas.onpointercancel = null; } };
}

},
"ui/ledger-studio":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountLedgerStudio = mountLedgerStudio;
exports.runLedgerStudio = runLedgerStudio;
const media_1 = require("./media");
const q = (root, selector) => { const el = root.querySelector(selector); if (!el)
    throw Error(`Ledger UI missing ${selector}`); return el; };
const text = (tag, value = '') => { const el = document.createElement(tag); el.textContent = value; return el; };
const usd = (micro) => micro === null ? '—' : `$${(micro / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
const compact = (value) => value.toLocaleString(undefined, { maximumFractionDigits: 1 });
const ms = (value) => value === null ? '—' : value < 1000 ? `${Math.round(value)} ms` : `${(value / 1000).toFixed(value < 10_000 ? 2 : 1)} s`;
const when = (value) => new Date(value).toLocaleString();
const escapeCsv = (value) => { const raw = String(value ?? ''); return /[",\n\r]/.test(raw) ? `"${raw.replaceAll('"', '""')}"` : raw; };
function selectOptions(select, values, selected, label = 'Все') {
    const previous = selected || select.value;
    select.replaceChildren();
    const all = document.createElement('option');
    all.value = '';
    all.textContent = label;
    select.append(all);
    for (const item of values) {
        const [value, display = value] = item.split('\t', 2);
        const option = document.createElement('option');
        option.value = value;
        option.textContent = display;
        select.append(option);
    }
    select.value = [...select.options].some(o => o.value === previous) ? previous : '';
}
function table(headers, rows) { const wrap = text('div'); wrap.className = 'table-wrap ledger-table'; const t = text('table'), thead = text('thead'), hr = text('tr'); headers.forEach(h => hr.append(text('th', h))); thead.append(hr); t.append(thead); const body = text('tbody'); rows.forEach(values => { const tr = text('tr'); values.forEach(v => tr.append(text('td', v))); body.append(tr); }); t.append(body); wrap.append(t); return wrap; }
function metric(label, value, caption = '') { const card = text('div'); card.className = 'ledger-metric'; card.append(text('small', label), text('strong', value)); if (caption)
    card.append(text('span', caption)); return card; }
function section(title, caption = '') { const el = text('section'); el.className = 'ledger-section'; const head = text('div'); head.className = 'section-heading'; head.append(text('h3', title), text('span', caption)); el.append(head); return el; }
function currentParams(root, context) {
    const params = new URLSearchParams();
    const project = q(root, '#ledger-project').value;
    const mapping = [['projectId', project], ['missionId', q(root, '#ledger-mission').value], ['model', q(root, '#ledger-model').value], ['provider', q(root, '#ledger-provider').value], ['agent', q(root, '#ledger-agent').value], ['status', q(root, '#ledger-status').value], ['date', q(root, '#ledger-date').value]];
    for (const [key, value] of mapping)
        if (value)
            params.set(key, value);
    params.set('limit', '500');
    return params;
}
function render(root, context, report) {
    const selected = { project: q(root, '#ledger-project').value, mission: q(root, '#ledger-mission').value, model: q(root, '#ledger-model').value, provider: q(root, '#ledger-provider').value, agent: q(root, '#ledger-agent').value, status: q(root, '#ledger-status').value };
    selectOptions(q(root, '#ledger-project'), report.available.projects, selected.project, 'Все проекты');
    selectOptions(q(root, '#ledger-mission'), report.available.missions, selected.mission, 'Все миссии');
    selectOptions(q(root, '#ledger-model'), report.available.models, selected.model, 'Все модели');
    selectOptions(q(root, '#ledger-provider'), report.available.providers, selected.provider, 'Все провайдеры');
    selectOptions(q(root, '#ledger-agent'), report.available.agents, selected.agent, 'Все агенты');
    selectOptions(q(root, '#ledger-status'), report.available.statuses, selected.status, 'Все статусы');
    const host = context.result;
    host.replaceChildren();
    const shell = text('div');
    shell.className = 'ledger-report';
    const overview = text('section');
    overview.className = 'ledger-overview';
    const budget = report.overview.budget;
    overview.append(metric("Today's Spend", usd(report.overview.todaySpendMicroUsd), 'Текущий UTC-день в выбранном контуре'), metric('Budget', usd(budget.limitMicroUsd), budget.scopeLabel + (budget.aggregate ? ' · aggregate' : '')), metric('Remaining', usd(budget.remainingMicroUsd), budget.limitMicroUsd === null ? 'Бюджет для этого scope не задан' : 'По внутреннему AZRAIL ledger'));
    shell.append(overview);
    const metrics = section('Usage & cost metrics', 'tokens / calls / latency / retries / errors / cost states');
    const grid = text('div');
    grid.className = 'ledger-metric-grid';
    grid.append(metric('Tokens', compact(report.metrics.tokens), `${compact(report.metrics.promptTokens)} in · ${compact(report.metrics.completionTokens)} out`), metric('Calls', compact(report.metrics.calls)), metric('Latency', ms(report.metrics.latencyP95Ms), `P95 · mean ${ms(report.metrics.latencyMeanMs)}`), metric('Retries', compact(report.metrics.retries), 'Same-model retry attempts'), metric('Errors', compact(report.metrics.errors), 'Cancelled + failed + uncertain'), metric('Estimated', usd(report.metrics.estimatedMicroUsd), 'Pre-dispatch estimate'), metric('Actual', usd(report.metrics.actualMicroUsd), 'Usage-backed known cost'), metric('Reserved', usd(report.metrics.reservedMicroUsd), 'Running / uncertain / unpriced'), metric('Uncertain', usd(report.metrics.uncertainMicroUsd), `${report.metrics.uncertainCalls} call(s)`));
    metrics.append(grid);
    shell.append(metrics);
    const anomaly = section('Anomaly detector', 'bounded deterministic checks; no paid health-check calls');
    const anomalyList = text('div');
    anomalyList.className = 'ledger-anomaly-list';
    if (report.anomalies.length) {
        for (const item of report.anomalies) {
            const card = text('div');
            card.className = 'ledger-anomaly';
            card.dataset.severity = item.severity;
            card.append(text('strong', item.severity.toUpperCase()), text('span', item.message));
            anomalyList.append(card);
        }
    }
    else
        anomalyList.append(text('p', 'No anomaly crossed the configured thresholds in this window.'));
    anomaly.append(anomalyList);
    shell.append(anomaly);
    const calls = section('Model calls', report.truncated ? `Preview bounded to ${report.resultLimit}; scan boundary ${report.scanLimit}` : `${report.calls.length} rows`);
    if (report.calls.length)
        calls.append(table(['Time', 'Project / Mission', 'Provider / Model', 'Agent', 'Status', 'Tokens', 'Latency', 'Attempts', 'Estimated', 'Actual / held'], report.calls.map(row => [
            when(row.startedAt), `${row.projectName ?? row.projectId ?? 'Direct'}${row.missionTitle || row.missionId ? ` · ${row.missionTitle ?? row.missionId}` : ''}`, `${row.provider} · ${row.model}${row.providerSource === 'recorded' ? '' : ` · ${row.providerSource}`}`, row.agent ?? 'Unattributed', row.status, compact(row.tokens), ms(row.latencyMs), `route ${row.routeAttempt} · retry ${row.retryAttempt}`, usd(row.reservedMicroUsd), row.actualMicroUsd === null ? `held ${usd(row.reservedMicroUsd)}` : usd(row.actualMicroUsd),
        ])));
    else
        calls.append(text('p', 'В выбранном диапазоне model calls не найдены.'));
    shell.append(calls);
    if (report.platformLimits.length) {
        const limits = section('Platform request limits', 'operator-only resource ledger');
        limits.append(table(['Unit', 'Limit', 'Committed'], report.platformLimits.map(r => [r.unit, compact(r.limitUnits), compact(r.committedUnits)])));
        shell.append(limits);
    }
    const boundary = section('Accounting boundary', 'AZRAIL internal metering ≠ provider invoice');
    boundary.append(text('p', report.note));
    const actions = text('div');
    actions.className = 'row ledger-actions';
    const csv = text('button', 'Export CSV');
    csv.type = 'button';
    csv.onclick = () => { const headers = ['id', 'project_id', 'mission_id', 'provider', 'provider_source', 'model', 'agent', 'status', 'started_at', 'tokens', 'latency_ms', 'route_attempt', 'retry_attempt', 'estimated_usd', 'actual_usd', 'reserved_usd', 'trace_id']; const lines = [headers.join(',')]; for (const r of report.calls)
        lines.push([r.id, r.projectId ?? '', r.missionId ?? '', r.provider, r.providerSource, r.model, r.agent ?? '', r.status, new Date(r.startedAt).toISOString(), r.tokens, r.latencyMs ?? '', r.routeAttempt, r.retryAttempt, r.reservedMicroUsd / 1e6, r.actualMicroUsd === null ? '' : r.actualMicroUsd / 1e6, ['running', 'uncertain', 'unpriced'].includes(r.status) ? r.reservedMicroUsd / 1e6 : 0, r.traceId ?? ''].map(escapeCsv).join(',')); (0, media_1.download)(new Blob([lines.join('\n') + '\n'], { type: 'text/csv;charset=utf-8' }), 'azrail-ledger.csv'); };
    const json = text('button', 'Export JSON');
    json.type = 'button';
    json.onclick = () => (0, media_1.download)(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }), 'azrail-ledger.json');
    actions.append(csv, json);
    boundary.append(actions);
    shell.append(boundary);
    host.append(shell);
}
async function refresh(context) { const root = context.controls; const report = await context.api(`/api/studio/ledger?${currentParams(root, context).toString()}`, { signal: context.signal }); if (context.current())
    render(root, context, report); }
async function mountLedgerStudio(context) {
    context.controls.innerHTML = `<div class="ledger-studio-shell"><div class="ledger-studio-head"><div><span class="workbench-kicker">PROFESSIONAL LEDGER STUDIO</span><strong>Spend → budget → usage → reconciliation signals</strong></div><span class="runtime-chip" data-state="ok">READ ONLY</span></div><div class="ledger-filter-grid"><label>Project<select id="ledger-project"><option value="">Все проекты</option></select></label><label>Mission<select id="ledger-mission"><option value="">Все миссии</option></select></label><label>Model<select id="ledger-model"><option value="">Все модели</option></select></label><label>Provider<select id="ledger-provider"><option value="">Все провайдеры</option></select></label><label>Agent<select id="ledger-agent"><option value="">Все агенты</option></select></label><label>Date<select id="ledger-date"><option value="24h">24 часа</option><option value="7d" selected>7 дней</option><option value="30d">30 дней</option><option value="all">Всё время</option></select></label><label>Status<select id="ledger-status"><option value="">Все статусы</option></select></label><div class="ledger-filter-actions"><button id="ledger-reset" type="button">Reset</button><button id="studio-run" class="primary" type="button">Refresh Ledger</button></div></div><p class="context-note">Фильтры и экспорт работают только с model calls, доступными текущему аккаунту. Cloudflare/provider invoice не подменяется внутренней оценкой.</p></div>`;
    const project = q(context.controls, '#ledger-project');
    const initialProject = context.currentProjectId?.() || context.projectId || '';
    if (initialProject) {
        const option = document.createElement('option');
        option.value = initialProject;
        option.textContent = initialProject;
        project.append(option);
        project.value = initialProject;
    }
    q(context.controls, '#ledger-reset').onclick = () => { for (const id of ['#ledger-project', '#ledger-mission', '#ledger-model', '#ledger-provider', '#ledger-agent', '#ledger-status'])
        q(context.controls, id).value = ''; q(context.controls, '#ledger-date').value = '7d'; context.result.replaceChildren(); };
    if (context.account)
        try {
            await refresh(context);
        }
        catch (error) {
            context.failure(error);
        }
}
async function runLedgerStudio(context) { await refresh(context); }

},
"ui/media":function(module,exports,require){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.download = download;
exports.composeMusicSession = composeMusicSession;
exports.composeNotes = composeNotes;
exports.renderMusicSession = renderMusicSession;
exports.renderMusic = renderMusic;
exports.wave = wave;
exports.analyzeAudio = analyzeAudio;
exports.renderVideo = renderVideo;
function download(blob, name) { const a = document.createElement('a'), url = URL.createObjectURL(blob); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000); }
function hash(s) { let n = 2166136261; for (const c of s)
    n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; }
const KEY_ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SCALE_INTERVALS = { minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10] };
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function beatsPerBar(signature) { return signature === '4/4' ? 4 : 3; }
function genreBpm(genre, seed) {
    const ranges = {
        'dark-minimal': [122, 130], 'melodic-techno': [120, 128], ambient: [72, 104], industrial: [126, 138], cinematic: [84, 118],
    };
    const [a, b] = ranges[genre];
    return a + (seed % (b - a + 1));
}
function arrangementLevel(kind, bar, bars) {
    if (kind === 'loop')
        return 1;
    const x = bars <= 1 ? 1 : bar / (bars - 1);
    if (kind === 'intro-build-drop')
        return x < .25 ? .52 : x < .58 ? .72 : x < .78 ? 1 : .9;
    return .62 + .28 * Math.sin((x + .1) * Math.PI);
}
function pitchFor(root, scale, degree, octave = 4) { const d = ((degree % scale.length) + scale.length) % scale.length, oct = Math.floor(degree / scale.length); return 12 * (octave + 1) + root + scale[d] + 12 * oct; }
function composeMusicSession(input) {
    const prompt = input.prompt.trim() || 'Midnight pulse', bars = Math.trunc(input.bars);
    if (!Number.isInteger(bars) || bars < 1 || bars > 16)
        throw Error('Длина 1–16 тактов.');
    const configSeed = hash(JSON.stringify({ prompt, genre: input.genre, mood: input.mood, scale: input.scale, bars, timeSignature: input.timeSignature, pattern: input.pattern, arrangement: input.arrangement, synthPreset: input.synthPreset }));
    const seed = input.seed == null ? configSeed & 0x7fffffff : Math.trunc(input.seed);
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > 2147483647)
        throw Error('Seed должен быть от 0 до 2147483647.');
    let state = seed >>> 0;
    const rnd = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
    const bpm = input.bpm == null || input.bpm === 0 ? genreBpm(input.genre, seed) : Math.trunc(input.bpm);
    if (!Number.isInteger(bpm) || bpm < 60 || bpm > 180)
        throw Error('BPM 60–180 или Auto.');
    const rootName = input.keyRoot === 'auto' ? KEY_ROOTS[seed % KEY_ROOTS.length] : input.keyRoot;
    const root = KEY_ROOTS.indexOf(rootName);
    if (root < 0)
        throw Error('Некорректная тональность.');
    const scale = SCALE_INTERVALS[input.scale], bpb = beatsPerBar(input.timeSignature), total = bars * bpb, notes = [];
    const add = (part, pitch, start, length, velocity) => { if (start < 0 || start >= total)
        return; notes.push({ part, pitch: clamp(Math.round(pitch), 24, 96), start, length: Math.min(length, total - start), velocity: clamp(velocity, .12, .95) }); };
    for (let bar = 0; bar < bars; bar++) {
        const base = bar * bpb, level = arrangementLevel(input.arrangement, bar, bars), rootDegree = [0, 5, 3, 6][bar % 4];
        add('pad', pitchFor(root, scale, rootDegree, 3), base, Math.max(.5, bpb - .08), .18 + .14 * level);
        for (let beat = 0; beat < Math.ceil(bpb); beat++) {
            if (base + beat >= total)
                break;
            const bassDegree = input.genre === 'melodic-techno' && beat === Math.floor(bpb - 1) ? 2 : rootDegree;
            add('bass', pitchFor(root, scale, bassDegree, 2), base + beat, .42, .28 + .25 * level);
        }
        const grid = input.pattern === 'ambient' ? 1 : input.pattern === 'chords' ? bpb : input.pattern === 'bassline' ? .5 : .5;
        const steps = Math.max(1, Math.floor(bpb / grid));
        for (let i = 0; i < steps; i++) {
            const start = base + i * grid;
            if (start >= total)
                break;
            const gate = input.pattern === 'ambient' ? .76 : input.pattern === 'chords' ? Math.max(.5, bpb - .15) : .32;
            const chance = input.pattern === 'ambient' ? .62 : input.pattern === 'chords' ? 1 : .78 * level + .08;
            if (rnd() > chance)
                continue;
            const degree = input.pattern === 'arpeggio' ? [0, 2, 4, 6][i % 4] + rootDegree : input.pattern === 'bassline' ? rootDegree + (i % 2 ? 2 : 0) : rootDegree + Math.floor(rnd() * scale.length);
            const octave = input.pattern === 'bassline' ? 3 : input.pattern === 'ambient' ? 4 : 4 + (rnd() > .84 ? 1 : 0);
            add(input.pattern === 'arpeggio' ? 'arp' : 'lead', pitchFor(root, scale, degree, octave), start, gate, .28 + rnd() * .35 * level);
        }
    }
    notes.sort((a, b) => a.start - b.start || a.pitch - b.pitch);
    return { ...input, prompt, bars, bpm, keyRoot: rootName, seed, beatsPerBar: bpb, notes };
}
function composeNotes(prompt, bpm, bars) {
    const session = composeMusicSession({ prompt, bpm, keyRoot: 'F', scale: 'minor', bars, timeSignature: '4/4', genre: 'dark-minimal', mood: 'hypnotic', pattern: 'pulse', arrangement: 'loop', synthPreset: 'dark-pulse' });
    return { notes: session.notes, bpm: session.bpm, bars: session.bars };
}
function presetVoice(preset, part) {
    const base = { type: 'triangle', cutoff: 1800, attack: .008, release: .12 };
    if (part === 'bass')
        return { type: 'sine', cutoff: 700, attack: .006, release: .16 };
    if (part === 'pad' || preset === 'warm-pad')
        return { type: 'sine', cutoff: 1200, attack: .08, release: .45 };
    if (preset === 'glass')
        return { type: 'sine', cutoff: 4200, attack: .004, release: .28 };
    if (preset === 'sub')
        return { type: 'sine', cutoff: 620, attack: .006, release: .2 };
    if (preset === 'acid')
        return { type: 'sawtooth', cutoff: 2200, attack: .004, release: .09 };
    return base;
}
function waveformPeaks(buffer, points = 192) { const data = buffer.getChannelData(0), out = []; for (let p = 0; p < points; p++) {
    const a = Math.floor(p * data.length / points), b = Math.max(a + 1, Math.floor((p + 1) * data.length / points));
    let peak = 0;
    for (let i = a; i < b; i++)
        peak = Math.max(peak, Math.abs(data[i]));
    out.push(peak);
} return out; }
async function renderMusicSession(input) {
    const session = composeMusicSession(input), beat = 60 / session.bpm, totalBeats = session.bars * session.beatsPerBar, duration = totalBeats * beat + 1;
    const ctx = new OfflineAudioContext(2, Math.ceil(duration * 44100), 44100), master = ctx.createGain(), compressor = ctx.createDynamicsCompressor();
    master.gain.value = .3;
    compressor.threshold.value = -15;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = .004;
    compressor.release.value = .18;
    master.connect(compressor);
    compressor.connect(ctx.destination);
    for (const n of session.notes) {
        const voice = presetVoice(session.synthPreset, n.part), o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(), t = n.start * beat, end = t + n.length * beat;
        o.type = voice.type;
        o.frequency.value = 440 * 2 ** ((n.pitch - 69) / 12);
        if (session.synthPreset === 'glass' && n.part !== 'bass')
            o.detune.value = (n.pitch % 2 ? 5 : -5);
        f.type = 'lowpass';
        f.frequency.value = voice.cutoff;
        f.Q.value = session.synthPreset === 'acid' ? 8 : .8;
        o.connect(f);
        f.connect(g);
        g.connect(master);
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(Math.max(.001, n.velocity), t + voice.attack);
        g.gain.setValueAtTime(Math.max(.001, n.velocity * .82), Math.max(t + voice.attack, end - voice.release));
        g.gain.exponentialRampToValueAtTime(.0001, end);
        o.start(t);
        o.stop(end + .02);
    }
    const kickEvery = session.genre === 'ambient' ? 2 : 1;
    for (let beatIndex = 0; beatIndex < Math.floor(totalBeats); beatIndex += kickEvery) {
        const bar = Math.floor(beatIndex / session.beatsPerBar), level = arrangementLevel(session.arrangement, bar, session.bars);
        if (level < .6 && beatIndex % 2)
            continue;
        const t = beatIndex * beat, o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.setValueAtTime(128, t);
        o.frequency.exponentialRampToValueAtTime(44, t + .12);
        g.gain.setValueAtTime(.55 * level, t);
        g.gain.exponentialRampToValueAtTime(.001, t + .24);
        o.connect(g);
        g.connect(master);
        o.start(t);
        o.stop(t + .26);
    }
    const buffer = await ctx.startRendering();
    return { wav: wave(buffer), midi: midi(session), seconds: duration, waveform: waveformPeaks(buffer), session };
}
async function renderMusic(prompt, bpm, bars) { return renderMusicSession({ prompt, bpm, keyRoot: 'F', scale: 'minor', bars, timeSignature: '4/4', genre: 'dark-minimal', mood: 'hypnotic', pattern: 'pulse', arrangement: 'loop', synthPreset: 'dark-pulse' }); }
function wave(buffer) { const channels = buffer.numberOfChannels, n = buffer.length, bytes = new ArrayBuffer(44 + n * channels * 2), v = new DataView(bytes); const text = (p, s) => [...s].forEach((c, i) => v.setUint8(p + i, c.charCodeAt(0))); text(0, 'RIFF'); v.setUint32(4, bytes.byteLength - 8, true); text(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, channels, true); v.setUint32(24, buffer.sampleRate, true); v.setUint32(28, buffer.sampleRate * channels * 2, true); v.setUint16(32, channels * 2, true); v.setUint16(34, 16, true); text(36, 'data'); v.setUint32(40, bytes.byteLength - 44, true); const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c)); for (let i = 0; i < n; i++)
    for (let c = 0; c < channels; c++) {
        const x = Math.max(-1, Math.min(1, data[c][i]));
        v.setInt16(44 + (i * channels + c) * 2, x * (x < 0 ? 32768 : 32767), true);
    } return new Blob([bytes], { type: 'audio/wav' }); }
function variableLength(n) { const bytes = [n & 127]; while (n >>= 7)
    bytes.unshift((n & 127) | 128); return bytes; }
function midi(session) { const events = [], ticks = 480; const channels = { lead: 0, bass: 1, pad: 2, arp: 3 }; for (const n of session.notes) {
    const channel = channels[n.part], velocity = Math.round(clamp(n.velocity, 0, 1) * 110);
    events.push({ t: Math.round(n.start * ticks), order: 1, bytes: [0x90 | channel, n.pitch, velocity] }, { t: Math.round((n.start + n.length) * ticks), order: 0, bytes: [0x80 | channel, n.pitch, 0] });
} events.sort((a, b) => a.t - b.t || a.order - b.order); const tempo = Math.round(60000000 / session.bpm), [num, denText] = session.timeSignature.split('/').map(Number), denPow = Math.round(Math.log2(denText)); const data = [0, 255, 3, 11, ...[...'AZRAIL MUSIC'].map(c => c.charCodeAt(0)), 0, 255, 81, 3, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255, 0, 255, 88, 4, num, denPow, 24, 8]; let last = 0; for (const e of events) {
    data.push(...variableLength(e.t - last), ...e.bytes);
    last = e.t;
} data.push(0, 255, 47, 0); const n = data.length; return new Blob([new Uint8Array([77, 84, 104, 100, 0, 0, 0, 6, 0, 0, 0, 1, 1, 224, 77, 84, 114, 107, (n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255, ...data])], { type: 'audio/midi' }); }
async function analyzeAudio(file, signal) { if (file.size > 30 * 1024 * 1024)
    throw Error('Аудиофайл должен быть меньше 30 МБ.'); signal?.throwIfAborted(); const ctx = new AudioContext(); try {
    const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
    signal?.throwIfAborted();
    const { measurePCM } = await Promise.resolve().then(() => __importStar(require('./audio-analysis')));
    return await measurePCM(Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i)), buffer.sampleRate, signal);
}
finally {
    await ctx.close();
} }
async function renderVideo(title, canvas, signal) {
    if (!('MediaRecorder' in window) || !canvas.captureStream)
        throw Error('Этот браузер не поддерживает запись видео Canvas.');
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t));
    if (!mime)
        throw Error('Для WebM нужен браузер с поддержкой MediaRecorder.');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d'), stream = canvas.captureStream(24), recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2500000 }), chunks = [];
    return new Promise((resolve, reject) => {
        let raf = 0;
        const start = performance.now();
        function clean() { cancelAnimationFrame(raf); stream.getTracks().forEach(t => t.stop()); signal.removeEventListener('abort', abort); }
        function abort() { if (recorder.state !== 'inactive')
            recorder.stop(); clean(); reject(Error('Запись остановлена')); }
        recorder.ondataavailable = e => { if (e.data.size)
            chunks.push(e.data); };
        recorder.onstop = () => { clean(); if (!signal.aborted)
            resolve(new Blob(chunks, { type: mime })); };
        recorder.onerror = () => { clean(); reject(Error('Ошибка записи видео')); };
        signal.addEventListener('abort', abort, { once: true });
        if (signal.aborted) {
            abort();
            return;
        }
        const draw = () => { const t = (performance.now() - start) / 1000; ctx.fillStyle = '#09090f'; ctx.fillRect(0, 0, 1280, 720); ctx.fillStyle = '#8360b0'; for (let i = 0; i < 18; i++) {
            const height = 40 + 150 * (.5 + .5 * Math.sin(t * 1.2 + i * .55));
            ctx.globalAlpha = .3 + .7 * i / 18;
            ctx.fillRect(810 + i * 20, 360 - height / 2, 5, height);
        } ctx.globalAlpha = 1; ctx.fillStyle = '#b8a0d2'; ctx.font = '18px sans-serif'; ctx.fillText('MNMLL PULSE / ORIGINAL MOTION', 75, 120); ctx.fillStyle = '#f0e9f7'; ctx.font = '600 52px Arial, sans-serif'; const lines = title.match(/.{1,23}(?:\s|$)|.{1,23}/g) ?? ['Моя идея']; lines.slice(0, 4).forEach((line, i) => ctx.fillText(line.trim(), 75, 315 + i * 65, 610)); ctx.font = '17px sans-serif'; ctx.fillStyle = '#a38ab8'; ctx.fillText('AZRAIL × PULSE', 75, 625); if (t >= 8) {
            recorder.stop();
            return;
        } raf = requestAnimationFrame(draw); };
        recorder.start();
        draw();
    });
}

},
"ui/metatron-lab":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountMetatronLab = mountMetatronLab;
const event_stream_1 = require("./event-stream");
const el = (name, className, text) => {
    const node = document.createElement(name);
    if (className)
        node.className = className;
    if (text !== undefined)
        node.textContent = text;
    return node;
};
const money = (micro) => `$${(micro / 1_000_000).toFixed(4)}`;
const duration = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const jsonText = (value) => { try {
    return JSON.stringify(value, null, 2);
}
catch {
    return String(value);
} };
function mountMetatronLab(options) {
    const { root, api, local, notice, failure } = options;
    let destroyed = false, selectedMission = options.getMissionId(), streamStop = () => { }, refreshTimer = 0;
    root.replaceChildren();
    if (local) {
        root.append(el('p', 'context-note', 'Metatron Lab требует развёрнутый Worker, D1 и Durable Objects. Локальный HTML не имитирует runtime health.'));
        return () => { };
    }
    if (!options.account) {
        root.append(el('p', 'context-note', 'Войдите, чтобы открыть Agent Operations Center.'));
        return () => { };
    }
    const projectId = options.getProjectId();
    if (!projectId) {
        root.append(el('p', 'context-note', 'Выберите проект — Metatron показывает миссии в контексте проекта.'));
        return () => { };
    }
    const toolbar = el('div', 'metatron-toolbar');
    const missionSelect = el('select');
    missionSelect.id = 'metatron-mission-select';
    missionSelect.setAttribute('aria-label', 'Миссия');
    const refreshButton = el('button', '', 'Обновить');
    const status = el('span', 'metatron-live-status', 'Loading…');
    toolbar.append(missionSelect, refreshButton, status);
    root.append(toolbar);
    const control = el('div', 'metatron-controls');
    for (const [action, label] of [['start', 'Start'], ['pause', 'Pause'], ['resume', 'Resume'], ['cancel', 'Cancel'], ['terminate', 'Terminate']]) {
        const button = el('button', action === 'terminate' ? 'danger' : '', label);
        button.dataset.metatronAction = action;
        control.append(button);
    }
    root.append(control);
    const summary = el('div', 'metatron-summary');
    root.append(summary);
    const graph = panel('Live Mission Graph');
    const agents = panel('Agent Cards');
    const logs = panel('Live Logs · durable replay');
    const trace = panel('Trace Explorer');
    const checkpoints = panel('Checkpoint System / Mission Replay');
    const effects = panel('uncertain_effect / Effect Reconciliation');
    const approvals = panel('Human Approval Nodes');
    const memory = panel('Memory Inspector');
    const decisions = panel('Decision Explanation Panel');
    const fault = panel('Fault Injection Lab · SIMULATION ONLY');
    for (const p of [graph, agents, logs, trace, checkpoints, effects, approvals, memory, decisions, fault])
        root.append(p.wrap);
    const scenario = el('select');
    for (const key of ['timeout', 'provider_down', 'd1_failure', 'network_loss']) {
        const option = el('option');
        option.value = key;
        option.textContent = key;
        scenario.append(option);
    }
    const simulate = el('button', '', 'Run safe simulation');
    const faultHint = el('p', 'context-note', 'Никакой реальный provider/D1/network не ломается. Проверяется только recovery contract.');
    fault.body.append(scenario, simulate, faultHint);
    function panel(title) { const wrap = el('section', 'metatron-panel'), h = el('div', 'section-heading'), heading = el('h2', '', title), body = el('div', 'metatron-panel-body'); h.append(heading); wrap.append(h, body); return { wrap, body }; }
    function badge(text) { return el('span', `metatron-badge status-${text.replace(/[^a-z0-9_-]/gi, '-').toLowerCase()}`, text); }
    function renderList(host, items, empty = 'Нет данных.') { host.replaceChildren(); if (!items.length) {
        host.append(el('p', 'muted', empty));
        return;
    } const list = el('div', 'metatron-list'); for (const item of items) {
        const pre = el('pre');
        pre.textContent = jsonText(item);
        list.append(pre);
    } host.append(list); }
    async function controlMission(action, step) {
        if (!selectedMission)
            throw Error('Выберите миссию.');
        const body = { missionId: selectedMission, projectId, action };
        if (step !== undefined)
            body.step = step;
        const response = await api('/api/metatron/control', { method: 'POST', body: JSON.stringify(body) });
        notice(response.success === false ? (response.reason ?? 'Команда отклонена.') : `Metatron: ${action} принят.`);
        await refreshSnapshot();
    }
    async function refreshMissions() {
        const r = await api(`/api/metatron/missions?projectId=${encodeURIComponent(projectId)}`);
        missionSelect.replaceChildren();
        for (const item of r.items) {
            const option = el('option');
            option.value = item.id;
            option.textContent = `${item.status.toUpperCase()} · ${item.goal.slice(0, 72)}`;
            missionSelect.append(option);
        }
        if (selectedMission && r.items.some(item => item.id === selectedMission))
            missionSelect.value = selectedMission;
        else
            selectedMission = r.items[0]?.id ?? '';
        if (selectedMission) {
            missionSelect.value = selectedMission;
            options.setMissionId(selectedMission);
        }
    }
    function renderSnapshot(data) {
        status.replaceChildren(badge(data.mission.status));
        summary.replaceChildren();
        const cards = [
            ['MISSION', data.mission.goal], ['STATUS', data.mission.status.toUpperCase()], ['COST', money(data.resources.actualMicroUsd || data.resources.reservedMicroUsd)],
            ['ELAPSED', duration(data.resources.elapsedMs)], ['RISK', data.resources.risk], ['FENCE', data.resources.fenceToken === null ? '—' : String(data.resources.fenceToken)],
            ['TOKENS', `${data.resources.promptTokens} in / ${data.resources.completionTokens} out`], ['GRAPH', data.graph.mode],
        ];
        for (const [key, value] of cards) {
            const card = el('article', 'metatron-stat');
            card.append(el('small', '', key), el('strong', '', value));
            summary.append(card);
        }
        graph.body.replaceChildren();
        const graphNote = el('p', 'context-note', `DAG mode: ${data.graph.mode}. ${data.graph.warning ?? ''}`);
        graph.body.append(graphNote);
        const flow = el('div', 'mission-graph');
        for (const node of data.graph.nodes) {
            const n = el('article', 'mission-node');
            n.append(badge(node.status), el('strong', '', node.label), el('small', 'muted', node.dependencies.length ? `depends on: ${node.dependencies.join(', ')}` : 'root'));
            flow.append(n);
        }
        graph.body.append(flow);
        agents.body.replaceChildren();
        const agentGrid = el('div', 'metatron-agent-grid');
        const runtimeById = new Map(data.agentCards.runtime.map(item => [item.agent_id, item]));
        const healthById = new Map((data.health ?? []).map(item => [item.id, item]));
        for (const registered of data.agentCards.registered) {
            const live = runtimeById.get(registered.id), health = healthById.get(registered.id);
            const card = el('article', 'metatron-agent-card');
            card.append(el('strong', '', registered.name), badge(live?.status ?? health?.status ?? registered.status), el('small', 'muted', registered.capabilities.join(' · ')));
            if (health)
                card.append(el('small', 'muted', `probe storage=${health.storageReadable ? 'readable' : 'failed'}`));
            if (live?.instance_id)
                card.append(el('code', '', live.instance_id));
            if (live?.last_error || health?.error)
                card.append(el('p', 'error-text', live?.last_error ?? health?.error));
            agentGrid.append(card);
        }
        agents.body.append(agentGrid);
        logs.body.replaceChildren();
        const logList = el('ol', 'metatron-log');
        for (const event of data.live.events.slice(-80)) {
            const li = el('li');
            li.append(el('code', '', event.type), document.createTextNode(` · ${event.createdAt}`));
            if (event.data !== undefined) {
                const details = el('pre');
                details.textContent = jsonText(event.data);
                li.append(details);
            }
            logList.append(li);
        }
        logs.body.append(el('p', 'muted', `Transport: ${data.live.transport}`), logList);
        trace.body.replaceChildren();
        trace.body.append(el('p', 'muted', `${data.traceExplorer.links.length} trace links · ${data.traceExplorer.toolCalls.length} tool calls · ${data.traceExplorer.modelCalls.length} model calls`));
        const traceRows = el('div', 'metatron-trace');
        for (const link of data.traceExplorer.links.slice(-80)) {
            const row = el('div', 'metatron-trace-row');
            row.append(el('code', '', String(link.entity_type ?? 'trace')), el('span', '', String(link.entity_id ?? '')), el('small', 'muted', String(link.trace_id ?? '')));
            traceRows.append(row);
        }
        trace.body.append(traceRows);
        checkpoints.body.replaceChildren();
        checkpoints.body.append(el('p', 'context-note', 'Mission Replay здесь read-only: он восстанавливает события/checkpoints и никогда повторно не вызывает provider/tool effects.'));
        const cpList = el('div', 'metatron-list');
        for (const point of data.checkpoints) {
            const row = el('article', 'metatron-checkpoint');
            row.append(el('strong', '', `#${point.step} · ${point.tool}`), badge(point.status));
            if (point.status === 'failed' && point.receipt_status === 'failed') {
                const retry = el('button', '', 'Retry step');
                retry.onclick = () => controlMission('retry_step', point.step).catch(failure);
                row.append(retry);
            }
            cpList.append(row);
        }
        checkpoints.body.append(cpList, el('small', 'muted', `Replay: ${data.replay.events.length} events / ${data.replay.checkpoints.length} checkpoints / ${data.replay.decisions.length} decisions`));
        effects.body.replaceChildren();
        const reconciliation = el('article', 'metatron-reconciliation');
        reconciliation.append(badge(data.reconciliationEngine.mode), el('strong', '', 'Effect Reconciliation Engine'), el('p', 'context-note', data.reconciliationEngine.note), el('code', '', `${data.reconciliationEngine.connector.method} ${data.reconciliationEngine.connector.path}`), el('code', '', `${data.reconciliationEngine.model.method} ${data.reconciliationEngine.model.path}`));
        effects.body.append(reconciliation);
        if (!data.uncertainEffects.length)
            effects.body.append(el('p', 'muted', 'Нет uncertain_effect.'));
        else
            for (const effect of data.uncertainEffects) {
                const row = el('article', 'metatron-warning');
                row.append(el('strong', '', `Step ${effect.step} · ${effect.tool}`), badge('uncertain_effect'), el('pre', '', jsonText(effect.result)), el('p', 'context-note', 'Автоматический retry запрещён. Сначала сверить внешний outcome через соответствующий Connector/Ledger reconciliation flow.'));
                effects.body.append(row);
            }
        approvals.body.replaceChildren();
        if (!data.approvals.length)
            approvals.body.append(el('p', 'muted', 'Approval nodes отсутствуют.'));
        else
            for (const approval of data.approvals) {
                const row = el('article', 'metatron-checkpoint');
                row.append(el('strong', '', approval.summary), badge(approval.status), el('small', 'muted', `${approval.action_type} · risk ${approval.risk}`));
                approvals.body.append(row);
            }
        renderList(memory.body, data.memoryInspector, 'Эта миссия ещё не использовала Project Memory или аудит появился до rc.60.');
        decisions.body.replaceChildren();
        if (!data.decisions.length)
            decisions.body.append(el('p', 'muted', 'Decision receipts появятся у шагов, выполненных rc.60+.'));
        else
            for (const d of data.decisions.slice(-80)) {
                const row = el('article', 'metatron-decision');
                row.append(badge(d.decision_kind), el('strong', '', d.choice), el('p', '', d.reason));
                decisions.body.append(row);
            }
        const dynamicFaults = fault.body.querySelector('.fault-results') ?? el('div', 'fault-results');
        dynamicFaults.replaceChildren();
        for (const run of data.faultInjection.slice(0, 10))
            dynamicFaults.append(el('p', 'muted', `${run.scenario} · ${run.status} · simulation=${run.simulation_only === 1}`));
        if (!dynamicFaults.parentElement)
            fault.body.append(dynamicFaults);
    }
    async function refreshSnapshot(probe = false) {
        if (!selectedMission) {
            summary.replaceChildren(el('p', 'context-note', 'В проекте пока нет миссий.'));
            return;
        }
        const data = await api(`/api/metatron/mission?missionId=${encodeURIComponent(selectedMission)}${probe ? '&probe=1' : ''}`);
        if (destroyed)
            return;
        renderSnapshot(data);
    }
    function scheduleRefresh(event) { if (event.missionId !== selectedMission)
        return; clearTimeout(refreshTimer); refreshTimer = window.setTimeout(() => void refreshSnapshot().catch(failure), 150); }
    async function boot() {
        await refreshMissions();
        await refreshSnapshot(true);
        streamStop = (0, event_stream_1.createProjectEventClient)({ api, projectId, onEvent: scheduleRefresh });
    }
    missionSelect.onchange = () => { selectedMission = missionSelect.value; options.setMissionId(selectedMission); refreshSnapshot().catch(failure); };
    refreshButton.onclick = () => Promise.all([refreshMissions(), refreshSnapshot(true)]).catch(failure);
    control.querySelectorAll('button[data-metatron-action]').forEach(button => button.onclick = () => controlMission(button.dataset.metatronAction).catch(failure));
    simulate.onclick = async () => { if (!selectedMission)
        throw Error('Выберите миссию.'); const r = await api('/api/metatron/fault-injection', { method: 'POST', body: JSON.stringify({ missionId: selectedMission, projectId, scenario: scenario.value }) }); notice(`Fault Injection simulation: ${r.run.status}`); await refreshSnapshot(); };
    simulate.onclick = ((handler => () => Promise.resolve(handler()).catch(failure))(simulate.onclick));
    boot().catch(failure);
    return () => { destroyed = true; clearTimeout(refreshTimer); streamStop(); };
}

},
"ui/mission-view":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderMission = renderMission;
const labels = { queued: 'Задача принята', planning: 'Составляю план', executing: 'Выполняю задачу', verifying: 'Проверяю результат', waiting_approval: 'Нужно ваше действие', completed: 'Проверено · завершено', unverified: 'Завершено без подтверждения', failed: 'Работа остановлена', cancelling: 'Останавливаю задачу', cancelled: 'Задача отменена' };
const tools = { read_file: 'Чтение файла', write_file: 'Создание файла', edit_file: 'Правка файла', apply_patch: 'Изменение кода', list_files: 'Просмотр проекта', search_files: 'Поиск в проекте', call_model: 'Анализ задачи', sandbox_test: 'Проверка проекта', sandbox_exec: 'Выполнение команды', run_tests: 'Запуск тестов', connector_call: 'Внешний инструмент', connector_search: 'Поиск инструмента' };
const text = (value, fallback = '') => typeof value === 'string' ? value.slice(0, 10000) : fallback;
function renderMission(root, report, operator = false) {
    const get = (id) => root.getElementById(id);
    const m = report.mission ?? report, status = text(m.status, 'queued');
    get('mission-panel').hidden = false;
    get('mission-status').textContent = labels[status] ?? 'Обновляю состояние';
    const summary = text(report.result?.summary) || text(report.result?.error) || { queued: 'Можно закрыть страницу. Состояние задачи сохраняется на сервере.', planning: 'Разбиваю вашу идею на конкретные шаги.', executing: 'Результат появится здесь. Можно вернуться к задаче позже.', verifying: 'Проверяю созданные файлы и доступные тесты.', waiting_approval: 'Откройте детали ниже, чтобы узнать причину остановки.', failed: 'Откройте детали ошибки. Продолжение доступно, если сервер подтвердит возможность восстановления.', cancelled: 'Дальнейшие шаги остановлены. Уже отправленные внешние операции могут завершиться.', completed: 'Все обязательные проверки подтверждены. Результат готов.', unverified: 'Работа сохранена, но обязательные проверки подтверждены не полностью. Не публикуйте результат как проверенный.' }[status] || 'Состояние получено с сервера.';
    get('mission-summary').textContent = summary;
    const plan = Array.isArray(report.plan) ? report.plan : [], list = get('mission-plan');
    list.replaceChildren();
    for (const step of plan.slice(0, 12)) {
        const li = root.createElement('li');
        const state = text(step.status);
        li.dataset.state = state;
        li.textContent = `${state === 'done' ? '✓' : state === 'doing' ? '→' : state === 'skipped' ? '—' : '○'} ${text(step.title, 'Шаг')}`;
        if (state === 'doing')
            li.setAttribute('aria-current', 'step');
        list.append(li);
    }
    const done = plan.filter(s => s.status === 'done' || s.status === 'skipped').length;
    const progress = get('mission-progress');
    progress.hidden = !plan.length;
    progress.max = plan.length || 1;
    progress.value = done;
    get('mission-progress-label').textContent = plan.length ? `Завершено шагов: ${done} из ${plan.length}` : '';
    const activity = get('mission-activity');
    activity.replaceChildren();
    for (const call of (report.calls ?? []).slice(-5)) {
        const p = root.createElement('p');
        p.className = 'muted';
        p.textContent = `${tools[text(call.tool)] ?? 'Инструмент'} · ${call.status === 'done' ? 'готово' : call.status === 'failed' ? 'ошибка' : 'в работе'}`;
        activity.append(p);
    }
    // A permissive/unavailable model checker is not a successful code test.
    const check = (report.events ?? []).filter(e => ['check.passed', 'check.unverified', 'check.rejected'].includes(text(e.type))).at(-1);
    const tests = (report.events ?? []).filter(e => ['tests.verified', 'tests.failed', 'tests.unavailable'].includes(text(e.type))).at(-1);
    const assessment = check?.type === 'check.passed' ? 'Оценка результата: принята.' : check?.type === 'check.rejected' ? 'Оценка результата: отклонена.' : 'Оценка результата: не подтверждена.';
    const quality = report.result?.quality && typeof report.result.quality === 'object' ? report.result.quality : null;
    const qualityStatus = text(quality?.status).toLowerCase();
    const qualityLabel = qualityStatus === 'verified' ? 'Quality Gate: VERIFIED.' : qualityStatus === 'failed' ? 'Quality Gate: FAILED.' : qualityStatus === 'blocked' ? 'Quality Gate: BLOCKED.' : qualityStatus === 'unverified' ? 'Quality Gate: UNVERIFIED.' : '';
    get('mission-checks').textContent = (qualityLabel ? qualityLabel + ' ' : '') + assessment + ' ' + (tests?.type === 'tests.verified' ? 'Запуск тестов: успешен.' : tests?.type === 'tests.failed' ? 'Запуск тестов: обнаружены ошибки.' : 'Подтверждённого результата тестов пока нет.');
    get('mission-output').textContent = JSON.stringify(report, null, 2);
    const terminal = ['completed', 'unverified', 'failed', 'cancelled'].includes(status);
    get('cancel').hidden = terminal;
    get('recover').hidden = !['failed', 'waiting_approval'].includes(status);
    get('permit-sandbox').hidden = !(operator && status === 'waiting_approval');
    get('mission-connection').textContent = '';
    return { status, active: !terminal && status !== 'waiting_approval' };
}

},
"ui/music-intelligence-panel":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupMusicIntelligencePanel = cleanupMusicIntelligencePanel;
exports.mountMusicIntelligencePanel = mountMusicIntelligencePanel;
const music_intelligence_runtime_1 = require("./music-intelligence-runtime");
const music_intelligence_1 = require("../src/lib/music-intelligence");
let controller = null;
let items = [];
let urls = [];
const esc = (s) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const metric = (v, d = 1, suffix = '') => Number.isFinite(v) ? `${v.toFixed(d)}${suffix}` : '—';
function clearUrls() { for (const url of urls)
    URL.revokeObjectURL(url); urls = []; }
function statusLabel(item) { return item.status === 'waiting' ? 'Waiting' : item.status === 'analyzing' ? `Analyzing ${Math.round(item.progress * 100)}%` : item.status === 'done' ? 'Done' : item.status === 'cancelled' ? 'Cancelled' : 'Failed'; }
function renderQueue(host) { host.innerHTML = items.length ? items.map(item => `<article class="music-intake-row"><div><strong>${esc(item.file.name)}</strong><small>${(item.file.size / 1024 / 1024).toFixed(1)} MB</small></div><div><span class="status-pill">${statusLabel(item)}</span>${item.error ? `<small>${esc(item.error)}</small>` : ''}</div></article>`).join('') : '<p class="muted">Выберите 1–20 аудиофайлов. Анализ выполняется локально, последовательно, без отправки аудио в облако.</p>'; }
function populateSelectors(root) { const done = items.filter(i => i.status === 'done' && i.analysis), selects = [...root.querySelectorAll('[data-music-track-select]')]; for (const select of selects) {
    const current = select.value;
    select.innerHTML = '<option value="">— select track —</option>' + done.map(i => `<option value="${i.id}">${esc(i.file.name)}</option>`).join('');
    if (done.some(i => i.id === current))
        select.value = current;
} }
function renderMatrix(root) { const host = root.querySelector('#music-reference-matrix'); const done = items.filter(i => i.analysis); if (!done.length) {
    host.innerHTML = '<p class="muted">Reference Matrix появится после анализа.</p>';
    populateSelectors(root);
    return;
} const matrix = (0, music_intelligence_runtime_1.buildReferenceMatrix)(items), profile = matrix.profile; host.innerHTML = `<div class="music-profile-summary"><strong>Reference profile</strong><span>BPM ${profile.bpmRange ? `${profile.bpmRange[0].toFixed(1)}–${profile.bpmRange[1].toFixed(1)}` : '—'}</span><span>Median ${metric(profile.bpmMedian, 1, ' BPM')}</span><span>Camelot ${profile.commonCamelot.slice(0, 4).join(' / ') || '—'}</span><span>LUFS ${profile.lufsRange ? `${profile.lufsRange[0].toFixed(1)}–${profile.lufsRange[1].toFixed(1)}` : '—'}</span></div><div class="music-matrix-scroll"><table class="music-reference-table"><thead><tr><th>Track</th><th>BPM</th><th>Key</th><th>Camelot</th><th>LUFS</th><th>Energy</th><th>Sections</th></tr></thead><tbody>${matrix.rows.map(row => `<tr><td>${esc(row.name)}</td><td>${metric(row.bpm, 1)}</td><td>${esc(row.key ?? '—')}</td><td>${esc(row.camelot ?? '—')}</td><td>${metric(row.lufs, 1)}</td><td>${metric(row.energy, 0)}</td><td>${row.sections}</td></tr>`).join('')}</tbody></table></div>`; populateSelectors(root); }
function renderDAWImport(host, response) { const r = response.report, c = response.compatibility; host.innerHTML = `<div class="music-profile-summary"><strong>${esc(r.format)}</strong><span>${esc(r.application.name ?? 'Unknown DAW')} ${esc(r.application.version ?? '')}</span><span>${r.trackCount} tracks</span><span>${r.summary.plugins} plugins</span><span>${r.summary.audioFiles} audio · ${r.summary.midiFiles} MIDI</span><span>${response.saved ? 'Saved to project' : 'Analysis only'}</span></div><div class="music-matrix-scroll"><table class="music-reference-table"><thead><tr><th>Track</th><th>Kind</th><th>Clips</th><th>Notes</th><th>Automation</th><th>Plugins</th></tr></thead><tbody>${r.tracks.slice(0, 100).map(track => `<tr><td>${esc(track.name)}</td><td>${esc(track.kind)}</td><td>${track.clipCount}</td><td>${track.noteCount}</td><td>${track.automationPointCount}</td><td>${track.pluginCount}</td></tr>`).join('')}</tbody></table></div><section class="music-plugin-report"><div class="section-heading"><h5>Plugin Compatibility Report</h5><span>${c.counts['source-unavailable'] ?? 0} source unavailable · ${c.counts['local-status-unknown'] ?? 0} local unknown</span></div>${c.items.length ? c.items.slice(0, 120).map(item => `<article class="music-intake-row"><div><strong>${esc(item.plugin.name)}</strong><small>${esc(item.plugin.format)} · ${esc(item.status)}</small></div><div><small>${esc(item.reason)}</small><small>${item.actions.map(esc).join(' · ')}</small></div></article>`).join('') : '<p class="muted">Plug-in descriptors не обнаружены.</p>'}</section>${r.warnings.length ? `<details><summary>Import warnings (${r.warnings.length})</summary><ul>${r.warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul></details>` : ''}<p class="muted">${r.analysisBoundary.map(esc).join(' · ')}</p>`; }
function findItem(id) { return items.find(i => i.id === id && i.analysis && i.measurements); }
function renderDetail(root, id) {
    const host = root.querySelector('#music-intelligence-detail'), item = findItem(id);
    if (!item || !item.analysis || !item.measurements) {
        host.innerHTML = '<p class="muted">Выберите проанализированный трек.</p>';
        return;
    }
    const a = item.analysis, m = item.measurements, chords = (0, music_intelligence_1.chordTendencies)(m.pitchClassProfile), brief = (0, music_intelligence_1.productionBrief)(a), neighbors = a.camelot ? (0, music_intelligence_1.camelotNeighbors)(a.camelot) : [];
    host.innerHTML = `<div class="music-detail-grid"><section><small>GLOBAL</small><strong>${esc(a.metrics.keyRoot && a.metrics.mode ? `${a.metrics.keyRoot} ${a.metrics.mode}` : 'Key —')} ${a.camelot ? `· ${a.camelot}` : ''}</strong><p>BPM ${metric(a.metrics.bpm, 1)} · LUFS ${metric(a.metrics.integratedLufs, 1)} · Energy ${metric((0, music_intelligence_1.buildEnergyScore)(a.metrics), 0)}</p>${neighbors.length ? `<p class="muted">Compatible: ${neighbors.map(esc).join(' · ')}</p>` : ''}</section><section><small>CHORD TENDENCIES</small><p>${chords.length ? chords.slice(0, 6).map(c => `${esc(c.label)} ${(c.score * 100).toFixed(0)}%`).join(' · ') : 'Недостаточно tonal energy.'}</p><span class="muted">Heuristic from measured chroma, not exact chord transcription.</span></section></div><section class="music-timeline"><div class="section-heading"><h4>Local key / energy timeline</h4><span>${a.windows?.length ?? 0} windows</span></div><div class="music-window-grid">${(a.windows ?? []).map(w => `<div><strong>${w.startSeconds.toFixed(0)}–${w.endSeconds.toFixed(0)}s</strong><span>${esc(w.metrics.keyRoot && w.metrics.mode ? `${w.metrics.keyRoot} ${w.metrics.mode}` : '—')} ${w.camelot ? `· ${w.camelot}` : ''}</span><span>Energy ${metric(w.energy, 0)}</span></div>`).join('')}</div></section><section class="music-timeline"><div class="section-heading"><h4>Auto Structure</h4><span>measured-window heuristic</span></div><div class="music-segments">${a.sections.map(s => `<div><strong>${esc(s.label)}</strong><span>${s.startSeconds.toFixed(1)}–${s.endSeconds.toFixed(1)}s</span><span>${s.bars ?? '—'} bars</span></div>`).join('')}</div></section><details class="music-brief"><summary>Production Brief / Originality Guard</summary><pre>${esc(JSON.stringify(brief, null, 2))}</pre></details><div class="toolbar"><button id="music-save-analysis-memory" type="button">Save analysis to Music Memory</button></div>`;
}
function setupAB(root) { const aSel = root.querySelector('#music-ab-a'), bSel = root.querySelector('#music-ab-b'), aAudio = root.querySelector('#music-ab-audio-a'), bAudio = root.querySelector('#music-ab-audio-b'), note = root.querySelector('#music-ab-note'); const load = () => { clearUrls(); const a = findItem(aSel.value), b = findItem(bSel.value); aAudio.removeAttribute('src'); bAudio.removeAttribute('src'); aAudio.volume = 1; bAudio.volume = 1; if (a) {
    const url = URL.createObjectURL(a.file);
    urls.push(url);
    aAudio.src = url;
} if (b) {
    const url = URL.createObjectURL(b.file);
    urls.push(url);
    bAudio.src = url;
} note.textContent = a && b ? 'A/B loaded. Loudness Match only attenuates the louder file; it never boosts above unity.' : 'Select two analyzed tracks.'; }; aSel.onchange = load; bSel.onchange = load; root.querySelector('#music-ab-match').onclick = () => { const a = findItem(aSel.value), b = findItem(bSel.value); if (!a?.analysis || !b?.analysis)
    throw Error('Выберите A и B.'); const la = a.analysis.metrics.integratedLufs, lb = b.analysis.metrics.integratedLufs; if (!Number.isFinite(la) || !Number.isFinite(lb))
    throw Error('LUFS недоступен для одного из файлов.'); const target = Math.min(la, lb); aAudio.volume = Math.min(1, 10 ** ((target - la) / 20)); bAudio.volume = Math.min(1, 10 ** ((target - lb) / 20)); note.textContent = `Matched to ${target.toFixed(1)} LUFS reference level (relative playback attenuation).`; }; root.querySelector('#music-ab-sync').onclick = () => { if (!aAudio.src || !bAudio.src)
    throw Error('Сначала выберите A и B.'); aAudio.currentTime = 0; bAudio.currentTime = 0; void aAudio.play(); void bAudio.play(); }; }
function cleanupMusicIntelligencePanel() { controller?.abort(); controller = null; clearUrls(); items = []; }
function mountMusicIntelligencePanel(context) {
    cleanupMusicIntelligencePanel();
    const root = document.createElement('section');
    root.className = 'music-intelligence music-intelligence-v2';
    root.innerHTML = `<div class="section-heading"><h3>Music Intelligence Studio 2.0</h3><span class="muted">F01–F20 · Music Intelligence runtime</span></div><section class="music-intake"><div class="section-heading"><h4>Multi-track Intake</h4><span>1–20 tracks · local analysis</span></div><input id="music-intake-files" type="file" multiple accept="audio/*,.wav,.aiff,.aif,.flac,.mp3,.aac,.m4a"><div class="toolbar"><button id="music-intake-analyze" class="primary" type="button">Analyze selected</button><button id="music-intake-cancel" type="button">Cancel</button><button id="music-open-audio" type="button">Open Audio Lab</button><button id="music-open-ableton" type="button">Open Ableton Lab</button></div><div id="music-intake-queue"></div></section><section><div class="section-heading"><h4>Reference Matrix</h4><span>BPM · Key · Camelot · LUFS · Energy</span></div><div id="music-reference-matrix"></div></section><section class="music-detail-select"><label>Inspect track<select id="music-detail-track" data-music-track-select></select></label><div id="music-intelligence-detail"><p class="muted">Выберите проанализированный трек.</p></div></section><section class="music-ab"><div class="section-heading"><h4>A/B loudness-matched player</h4><span>local playback</span></div><div class="music-ab-grid"><label>A<select id="music-ab-a" data-music-track-select></select><audio id="music-ab-audio-a" controls></audio></label><label>B<select id="music-ab-b" data-music-track-select></select><audio id="music-ab-audio-b" controls></audio></label></div><div class="toolbar"><button id="music-ab-match" type="button">LUFS Match</button><button id="music-ab-sync" type="button">Sync start</button></div><p id="music-ab-note" class="muted">Select two analyzed tracks.</p></section><section class="music-coach"><div class="section-heading"><h4>Music Learning Coach</h4><span>V1 → V2 measured deltas</span></div><div class="music-ab-grid"><label>V1<select id="music-coach-a" data-music-track-select></select></label><label>V2<select id="music-coach-b" data-music-track-select></select></label></div><button id="music-coach-run" type="button">Compare versions</button><pre id="music-coach-result" class="music-coach-result"></pre></section><section class="music-daw-import"><div class="section-heading"><h4>DAW Project Import Gateway</h4><span>.dawproject · .als · .zip</span></div><input id="music-daw-file" type="file" accept=".dawproject,.als,.zip"><div class="toolbar"><button id="music-daw-import" type="button">Analyze / Import project</button></div><p class="muted">Structured priority: DAWproject → Ableton Live Set / Project ZIP → Generic stems/MIDI ZIP fallback. Current safe request limit: 12 MB; large production projects should use future direct R2 multipart intake rather than buffering through the Worker.</p><div id="music-daw-result"><p class="muted">Выберите DAW project.</p></div></section><section class="music-composition-plan"><div class="section-heading"><h4>Composition Engine</h4><span>feature abstraction → original plan</span></div><label>Source analysis<select id="music-composition-source" data-music-track-select></select></label><div class="toolbar"><button id="music-composition-build" type="button">Build Composition Plan</button><button id="music-composition-apply" type="button" disabled>Apply safe settings</button></div><pre id="music-composition-result" class="music-coach-result"></pre></section><section class="music-intelligence-grid"><div><strong>Reference metadata</strong><input id="music-reference-url" placeholder="https://www.beatport.com/..."><input id="music-reference-title" placeholder="Название reference"><button id="music-save-reference" type="button">Save metadata reference</button></div><div><strong>Music Memory</strong><p class="muted">Хранит измеренные profiles/preferences/decisions, а не чужие мелодии.</p><button id="music-memory-load" type="button">Use my Music Memory</button><div id="music-memory-result" class="muted"></div></div><div><strong>Boundary</strong><p class="muted">Auto Structure и chord tendencies — измеряемые эвристики. DAW import читает структуру/metadata, но не исполняет plug-in state. Local plug-in installation не выдумывается; stem separation остаётся adapter boundary.</p></div></section>`;
    context.controls.querySelector('.music-composer')?.append(root);
    renderQueue(root.querySelector('#music-intake-queue'));
    renderMatrix(root);
    const input = root.querySelector('#music-intake-files'), analyze = root.querySelector('#music-intake-analyze'), cancel = root.querySelector('#music-intake-cancel');
    analyze.onclick = () => { const files = [...(input.files ?? [])]; controller?.abort(); controller = new AbortController(); analyze.disabled = true; context.notice(`Music Intelligence: анализ ${files.length} track(s) локально…`); (0, music_intelligence_runtime_1.analyzeMusicQueue)(files, controller.signal, next => { items = next; renderQueue(root.querySelector('#music-intake-queue')); renderMatrix(root); }).then(next => { items = next; renderMatrix(root); context.notice(`Music Intelligence: ${next.filter(i => i.status === 'done').length}/${next.length} track(s) проанализировано.`); }).catch(context.failure).finally(() => { analyze.disabled = false; }); };
    cancel.onclick = () => controller?.abort();
    root.querySelector('#music-open-audio').onclick = () => document.dispatchEvent(new CustomEvent('azrail:open-studio', { detail: { studio: 'audio' } }));
    root.querySelector('#music-open-ableton').onclick = () => document.dispatchEvent(new CustomEvent('azrail:open-studio', { detail: { studio: 'als' } }));
    const detailSelect = root.querySelector('#music-detail-track');
    detailSelect.onchange = () => renderDetail(root, detailSelect.value);
    root.addEventListener('change', event => { const target = event.target; if (target instanceof HTMLSelectElement && target.id === 'music-detail-track')
        renderDetail(root, target.value); });
    setupAB(root);
    root.querySelector('#music-coach-run').onclick = () => { const a = findItem(root.querySelector('#music-coach-a').value), b = findItem(root.querySelector('#music-coach-b').value); if (!a || !b)
        throw Error('Выберите V1 и V2.'); root.querySelector('#music-coach-result').textContent = JSON.stringify((0, music_intelligence_runtime_1.compareMusicVersions)(a, b), null, 2); };
    const dawFile = root.querySelector('#music-daw-file'), dawButton = root.querySelector('#music-daw-import'), dawResult = root.querySelector('#music-daw-result');
    dawButton.onclick = () => { const file = dawFile.files?.[0]; if (!file)
        throw Error('Выберите .dawproject, .als или .zip.'); if (!context.account)
        throw Error('Войдите, чтобы использовать безопасный DAW Import Gateway.'); dawButton.disabled = true; dawResult.innerHTML = '<p class="muted">Analyzing project…</p>'; context.api('/api/studio/music/daw-import', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'X-Filename': encodeURIComponent(file.name), 'X-Project-Id': context.projectId ?? '' }, body: file }).then((response) => { renderDAWImport(dawResult, response); context.notice(`DAW import: ${response.report.format}, ${response.report.trackCount} track(s).`); }).catch(error => { dawResult.innerHTML = `<p class="error">${esc(error instanceof Error ? error.message : String(error))}</p>`; context.failure(error); }).finally(() => { dawButton.disabled = false; }); };
    let activePlan = null;
    const compositionSource = root.querySelector('#music-composition-source'), compositionResult = root.querySelector('#music-composition-result'), compositionApply = root.querySelector('#music-composition-apply');
    root.querySelector('#music-composition-build').onclick = () => { const item = findItem(compositionSource.value); if (!item?.analysis)
        throw Error('Выберите измеренный source analysis.'); activePlan = (0, music_intelligence_1.buildCompositionPlan)(item.analysis); compositionResult.textContent = JSON.stringify(activePlan, null, 2); compositionApply.disabled = false; };
    compositionApply.onclick = () => { const item = findItem(compositionSource.value); if (!activePlan || !item?.analysis)
        throw Error('Сначала постройте Composition Plan.'); const analysis = item.analysis, bpm = context.controls.querySelector('#bpm'), key = context.controls.querySelector('#music-key'), scale = context.controls.querySelector('#music-scale'), bars = context.controls.querySelector('#bars'); if (bpm && Number.isFinite(analysis.metrics.bpm))
        bpm.value = String(Math.round(analysis.metrics.bpm)); if (key && analysis.metrics.keyRoot && [...key.options].some(o => o.value === analysis.metrics.keyRoot || o.textContent === analysis.metrics.keyRoot))
        key.value = analysis.metrics.keyRoot; if (scale && analysis.metrics.mode && (analysis.metrics.mode === 'minor' || analysis.metrics.mode === 'major'))
        scale.value = analysis.metrics.mode; if (bars) {
        const planned = activePlan.arrangement.reduce((n, s) => n + (s.bars ?? 0), 0);
        bars.value = String(Math.max(1, Math.min(16, planned || 8)));
    } context.notice('Composition Plan applied only to safe composer settings. Melody/plugin state/reference audio were not copied.'); };
    root.querySelector('#music-save-reference').onclick = () => { const url = root.querySelector('#music-reference-url').value.trim(), title = root.querySelector('#music-reference-title').value.trim(); if (!context.account)
        throw Error('Войдите, чтобы сохранять references.'); if (!url || !title)
        throw Error('Нужны Beatport URL и название reference.'); context.api('/api/studio/music/references', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: context.projectId || '', source: 'beatport', url, title }) }).then(() => context.notice('Reference metadata сохранены. Аудио не скачивалось.')).catch(context.failure); };
    root.querySelector('#music-memory-load').onclick = () => { if (!context.account)
        throw Error('Войдите, чтобы читать Music Memory.'); context.api('/api/studio/intelligence/memory?scope=music' + (context.projectId ? `&projectId=${encodeURIComponent(context.projectId)}` : '')).then((r) => { root.querySelector('#music-memory-result').textContent = r.items.length ? r.items.slice(0, 8).map(item => `${item.key}: ${typeof item.value === 'string' ? item.value : JSON.stringify(item.value)}`).join(' · ') : 'Music Memory пока пуста.'; }).catch(context.failure); };
    root.addEventListener('click', event => { const target = event.target; if (!(target instanceof HTMLButtonElement) || target.id !== 'music-save-analysis-memory')
        return; const item = findItem(detailSelect.value); if (!item?.analysis)
        throw Error('Выберите проанализированный трек.'); if (!context.account || context.account.role === 'viewer')
        throw Error('Нужен аккаунт с правом записи.'); const a = item.analysis; const value = { fileName: a.fileName, bpm: a.metrics.bpm, key: a.metrics.keyRoot && a.metrics.mode ? `${a.metrics.keyRoot} ${a.metrics.mode}` : null, camelot: a.camelot, lufs: a.metrics.integratedLufs, energy: (0, music_intelligence_1.buildEnergyScore)(a.metrics), sections: a.sections.map(s => ({ kind: s.kind, startSeconds: s.startSeconds, endSeconds: s.endSeconds, bars: s.bars, method: s.method })), savedAt: Date.now() }; context.api('/api/studio/intelligence/memory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scope: 'music', projectId: context.projectId || '', studioId: 'music', key: `analysis:${a.fileName}:${Date.now()}`, value, source: 'measured-audio', confidence: .85, ttlSeconds: 31536000 }) }).then(() => context.notice('Измеренный analysis сохранён в Music Memory.')).catch(context.failure); });
}

},
"ui/music-intelligence-runtime":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeMusicFile = analyzeMusicFile;
exports.analyzeMusicQueue = analyzeMusicQueue;
exports.buildReferenceMatrix = buildReferenceMatrix;
exports.compareMusicVersions = compareMusicVersions;
const audio_analysis_1 = require("./audio-analysis");
const music_intelligence_1 = require("../src/lib/music-intelligence");
function parseKey(label) { if (!label)
    return null; const m = /^([A-G](?:#|b)?)\s+(major|minor)$/i.exec(label.trim()); if (!m)
    return null; return { root: m[1].replace('b', '#'), mode: m[2].toLowerCase() }; }
function bassEnergy(m) { const sub = m.bands.find(b => b.label === 'SUB')?.energyPercent ?? 0, bass = m.bands.find(b => b.label === 'LOW')?.energyPercent ?? 0; return (sub + bass) / 100; }
function onsetDensity(m) { return Number.isFinite(m.bpm) && Number.isFinite(m.bpmConfidence) ? Math.max(0, Math.min(8, (m.bpm / 60) * (m.bpmConfidence ?? 0) * 2)) : null; }
function toMetrics(m) { const key = parseKey(m.detectedKey); return { bpm: m.bpm, tempoConfidence: m.bpmConfidence, integratedLufs: m.integratedLufs, shortTermLufs: m.shortTermLufsMax, truePeakDb: m.truePeakDbTP, loudnessRange: m.loudnessRangeLu, crestFactor: m.crestDb, spectralCentroid: m.spectralCentroidHz, stereoWidth: m.stereoWidthPercent, correlation: m.stereoCorrelation, onsetDensity: onsetDensity(m), bassEnergy: bassEnergy(m), keyRoot: key?.root ?? null, mode: key?.mode ?? null, keyConfidence: m.keyConfidence, pitchClassProfile: m.pitchClassProfile }; }
function sliceChannels(buffer, start, end) { const a = Math.max(0, Math.floor(start * buffer.sampleRate)), b = Math.min(buffer.length, Math.ceil(end * buffer.sampleRate)); return Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i).subarray(a, b)); }
function windowLength(duration, bpm) { if (Number.isFinite(bpm) && bpm > 0)
    return Math.max(8, Math.min(42, 16 * 4 * 60 / bpm)); return Math.max(10, Math.min(30, duration / 10)); }
async function analyzeMusicFile(file, signal, onProgress) {
    if (file.size > 30 * 1024 * 1024)
        throw Error(`${file.name}: максимум 30 МБ для локального анализа.`);
    signal?.throwIfAborted();
    const ctx = new AudioContext();
    try {
        const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
        signal?.throwIfAborted();
        const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
        const measurements = await (0, audio_analysis_1.measurePCM)(channels, buffer.sampleRate, signal);
        onProgress?.(.45);
        const length = windowLength(buffer.duration, measurements.bpm), count = Math.max(1, Math.min(16, Math.ceil(buffer.duration / length))), windows = [];
        for (let i = 0; i < count; i++) {
            signal?.throwIfAborted();
            const start = i * buffer.duration / count, end = (i + 1) * buffer.duration / count, local = await (0, audio_analysis_1.measurePCM)(sliceChannels(buffer, start, end), buffer.sampleRate, signal), metrics = toMetrics(local), camelot = metrics.keyRoot && metrics.mode ? (0, music_intelligence_1.camelotFor)(metrics.keyRoot, metrics.mode) : null;
            windows.push({ startSeconds: start, endSeconds: end, metrics, energy: (0, music_intelligence_1.buildEnergyScore)(metrics), camelot });
            onProgress?.(.45 + .5 * (i + 1) / count);
        }
        const metrics = toMetrics(measurements), camelot = metrics.keyRoot && metrics.mode ? (0, music_intelligence_1.camelotFor)(metrics.keyRoot, metrics.mode) : null, trackId = crypto.randomUUID();
        const analysis = { trackId, fileName: file.name, durationSeconds: measurements.durationSeconds, metrics, camelot, sections: (0, music_intelligence_1.autoStructure)(windows, measurements.durationSeconds, metrics.bpm), windows, source: 'measured-audio' };
        onProgress?.(1);
        return { analysis, measurements, windows, chords: (0, music_intelligence_1.chordTendencies)(measurements.pitchClassProfile), brief: (0, music_intelligence_1.productionBrief)(analysis) };
    }
    finally {
        await ctx.close();
    }
}
async function analyzeMusicQueue(files, signal, onUpdate) {
    if (files.length < 1 || files.length > 20)
        throw Error('Выберите от 1 до 20 треков.');
    const items = files.map(file => ({ id: crypto.randomUUID(), file, status: 'waiting', progress: 0 }));
    onUpdate([...items]);
    for (const item of items) {
        if (signal.aborted) {
            item.status = 'cancelled';
            continue;
        }
        item.status = 'analyzing';
        onUpdate([...items]);
        try {
            const detailed = await analyzeMusicFile(item.file, signal, p => { item.progress = p; onUpdate([...items]); });
            item.analysis = detailed.analysis;
            item.measurements = detailed.measurements;
            item.status = 'done';
            item.progress = 1;
        }
        catch (error) {
            item.status = signal.aborted ? 'cancelled' : 'failed';
            item.error = error instanceof Error ? error.message : String(error);
        }
        onUpdate([...items]);
    }
    return items;
}
function buildReferenceMatrix(items) { const analyses = items.map(i => i.analysis).filter((v) => !!v); return { profile: (0, music_intelligence_1.referenceProfile)(analyses), rows: analyses.map(a => ({ id: a.trackId, name: a.fileName, bpm: a.metrics.bpm, key: a.metrics.keyRoot && a.metrics.mode ? `${a.metrics.keyRoot} ${a.metrics.mode}` : null, camelot: a.camelot, lufs: a.metrics.integratedLufs, energy: (0, music_intelligence_1.buildEnergyScore)(a.metrics), sections: a.sections.length, durationSeconds: a.durationSeconds ?? null })) }; }
function compareMusicVersions(a, b) { if (!a.analysis || !b.analysis)
    throw Error('Для Learning Coach выберите два проанализированных трека.'); return (0, music_intelligence_1.musicLearningCoach)(a.analysis, b.analysis); }

},
"ui/navigation":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routePath = routePath;
exports.readRoute = readRoute;
exports.createNavigation = createNavigation;
const studios_1 = require("./studios");
function routePath(route) {
    return route.page === 'studio' ? `/studios/${route.studio}` : route.page === 'create' ? '/' : route.page === 'connections' ? '/settings/connections' : route.page === 'not-found' ? '/404' : `/${route.page}`;
}
function readRoute(url) {
    const offline = !/^https?:$/.test(url.protocol);
    let path = offline ? (url.hash.slice(1) || '/') : url.pathname;
    const legacy = path.match(/^\/?(?:studio|studios)\/([a-z]+)\/?$/);
    if (legacy) {
        const studio = (0, studios_1.studioById)(legacy[1]);
        return studio ? { page: 'studio', studio: studio.id } : { page: 'not-found' };
    }
    path = path.replace(/\/+$/, '') || '/';
    if (['/', '/create', 'create', '/index.html', '/app.html', '/ultimate.html'].includes(path))
        return { page: 'create' };
    if (['/projects', 'projects'].includes(path))
        return { page: 'projects' };
    if (['/studios', 'studios'].includes(path))
        return { page: 'studios' };
    if (['/metatron', 'metatron'].includes(path))
        return { page: 'metatron' };
    if (['/settings/connections', 'settings/connections'].includes(path))
        return { page: 'connections' };
    return { page: 'not-found' };
}
/** Real URLs on the host; portable hash URLs for the standalone file. */
function createNavigation(onRoute) {
    const offline = !/^https?:$/.test(location.protocol);
    const href = (route) => `${offline ? '#' : ''}${routePath(route)}`;
    const render = (initial = false) => onRoute(readRoute(new URL(location.href)), initial);
    const navigate = (route) => {
        const target = href(route), current = offline ? location.hash : location.pathname;
        if (current !== target)
            history.pushState(null, '', target);
        lastURL = location.href;
        render();
    };
    // Anchors retain native middle-click, modifier-click and "open in new tab".
    const link = (anchor, route) => {
        anchor.href = href(route);
        anchor.addEventListener('click', event => {
            if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
                return;
            event.preventDefault();
            navigate(route);
        });
    };
    // Popstate also covers Back/Forward between hash routes. Only render a
    // hashchange that was not already handled, preserving the mounted draft.
    let lastURL = location.href;
    const change = () => { if (location.href !== lastURL) {
        lastURL = location.href;
        render();
    } };
    window.addEventListener('popstate', change);
    window.addEventListener('hashchange', () => { if (offline)
        change(); });
    return { href, link, navigate, render };
}

},
"ui/projects":function(module,exports,require){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderProjectCenter = renderProjectCenter;
const studioNames = { web: 'Web Studio', image: 'Image Studio', music: 'Music Studio', video: 'Video Studio', audio: 'Audio Lab', als: 'Ableton Lab', data: 'Data Studio', ledger: 'Ledger', lab: 'Pulse Lab' };
let searchTimer = 0;
const $ = (id) => document.getElementById(id);
function relativeTime(ts) {
    if (!ts)
        return 'Нет активности';
    const delta = Math.max(0, Date.now() - ts), minute = 60000, hour = 60 * minute, day = 24 * hour;
    if (delta < minute)
        return 'только что';
    if (delta < hour)
        return `${Math.max(1, Math.floor(delta / minute))} мин назад`;
    if (delta < day)
        return `${Math.floor(delta / hour)} ч назад`;
    if (delta < 7 * day)
        return `${Math.floor(delta / day)} дн назад`;
    return new Date(ts).toLocaleDateString();
}
function runtimeStatus(item) {
    if (item.status === 'archived')
        return { label: 'Архив', kind: 'muted' };
    if (item.status === 'deleted')
        return { label: 'Удалён', kind: 'danger' };
    if (['queued', 'planning', 'executing', 'verifying', 'waiting_approval'].includes(item.missionStatus ?? ''))
        return { label: 'В работе', kind: 'live' };
    if (item.missionStatus === 'failed')
        return { label: 'Ошибка', kind: 'danger' };
    if (item.missionStatus === 'unverified')
        return { label: 'Нужна проверка', kind: 'warn' };
    if (item.missionStatus === 'completed')
        return { label: 'Готов', kind: 'ok' };
    return { label: 'Активный', kind: 'ok' };
}
function studioName(id) { return id ? studioNames[id] ?? id : 'AZRAIL Core'; }
function bytes(value) { if (value < 1024)
    return `${value} B`; if (value < 1024 * 1024)
    return `${(value / 1024).toFixed(1)} KB`; return `${(value / 1024 / 1024).toFixed(1)} MB`; }
function esc(value) { return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function queryString() {
    const q = new URLSearchParams();
    const search = $('project-search').value.trim(), sort = $('project-sort').value, status = $('project-status-filter').value, studio = $('project-studio-filter').value;
    if (search)
        q.set('search', search);
    if (sort)
        q.set('sort', sort);
    if (status)
        q.set('status', status);
    if (studio)
        q.set('studio', studio);
    return q.toString();
}
function projectCard(item, deps, refresh) {
    const card = document.createElement('article');
    card.className = 'project-card';
    card.dataset.projectId = item.id;
    if (item.id === deps.selectedProjectId)
        card.dataset.selected = 'true';
    const head = document.createElement('div');
    head.className = 'project-card-head';
    const badge = document.createElement('span'), status = runtimeStatus(item);
    badge.className = `project-status ${status.kind}`;
    badge.textContent = status.label;
    const pin = document.createElement('button');
    pin.className = 'project-pin';
    pin.type = 'button';
    pin.textContent = item.pinned ? '★' : '☆';
    pin.setAttribute('aria-label', item.pinned ? 'Убрать из избранного' : 'Добавить в избранное');
    pin.title = pin.getAttribute('aria-label');
    if (deps.account?.role === 'viewer')
        pin.disabled = true;
    else
        pin.onclick = () => deps.api(`/api/projects/${encodeURIComponent(item.id)}`, { method: 'PATCH', body: JSON.stringify({ pinned: !item.pinned }) }).then(refresh).catch(deps.failure);
    head.append(badge, pin);
    const title = document.createElement('h3');
    title.textContent = item.name;
    const description = document.createElement('p');
    description.className = 'project-description';
    description.textContent = item.description || 'Без описания. Добавьте контекст, чтобы быстрее ориентироваться в работе.';
    const meta = document.createElement('div');
    meta.className = 'project-meta';
    const studio = document.createElement('span');
    studio.textContent = studioName(item.studioId);
    const updated = document.createElement('span');
    updated.textContent = `Обновлён ${relativeTime(item.lastActivityAt)}`;
    meta.append(studio, updated);
    const counts = document.createElement('div');
    counts.className = 'project-counts';
    counts.innerHTML = `<span>${item.artifactsCount} артеф.</span><span>${item.versionsCount} версий</span><span>${item.missionCount} миссий</span>`;
    const tags = document.createElement('div');
    tags.className = 'project-tags';
    for (const tag of item.tags.slice(0, 4)) {
        const chip = document.createElement('span');
        chip.textContent = tag;
        tags.append(chip);
    }
    if (item.tags.length > 4) {
        const chip = document.createElement('span');
        chip.textContent = `+${item.tags.length - 4}`;
        tags.append(chip);
    }
    const actions = document.createElement('div');
    actions.className = 'project-actions';
    const open = document.createElement('button');
    open.className = 'primary';
    open.type = 'button';
    open.textContent = 'Открыть ↗';
    open.onclick = () => deps.onOpen(item);
    const menu = document.createElement('button');
    menu.className = 'project-menu';
    menu.type = 'button';
    menu.textContent = '⋯';
    menu.setAttribute('aria-label', `Действия проекта ${item.name}`);
    menu.onclick = () => void openProjectDialog(item, deps, refresh);
    actions.append(open, menu);
    card.append(head, title, description, meta, counts);
    if (item.tags.length)
        card.append(tags);
    card.append(actions);
    return card;
}
async function openProjectDialog(item, deps, refresh) {
    const root = deps.dialog(item.name, '<div id="project-detail-body" class="project-detail-body"><p class="muted">Загрузка…</p></div>');
    try {
        const details = await deps.api(`/api/projects/${encodeURIComponent(item.id)}`);
        if (!document.body.contains(root))
            return;
        const p = details.project, status = runtimeStatus(p), recent = details.activity.slice(-8).reverse();
        root.innerHTML = `<div class="project-detail-grid"><div><small>СТАТУС</small><strong>${esc(status.label)}</strong></div><div><small>СТУДИЯ</small><strong>${esc(studioName(p.studioId))}</strong></div><div><small>ВЛАДЕЛЕЦ</small><strong>${esc(p.ownerName)}</strong></div><div><small>СОЗДАН</small><strong>${esc(new Date(p.createdAt).toLocaleDateString())}</strong></div></div><p>${esc(p.description || 'Описание пока не добавлено.')}</p><div class="project-tags">${p.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div><div class="project-detail-stats"><span>${p.artifactsCount} артефактов</span><span>${p.versionsCount} версий</span><span>${p.missionCount} миссий</span></div><h3>Последняя активность</h3><div class="project-activity">${recent.length ? recent.map(e => `<div><span>${esc(e.type)}</span><time>${esc(relativeTime(e.created_at))}</time></div>`).join('') : '<p class="muted">Событий пока нет.</p>'}</div><div id="project-detail-actions" class="toolbar"></div>`;
        const actions = root.querySelector('#project-detail-actions');
        const exportButton = document.createElement('button');
        exportButton.textContent = 'Экспорт ZIP';
        exportButton.onclick = () => deps.blobAPI(`/api/studio/project-zip?projectId=${encodeURIComponent(p.id)}`).then(async (blob) => (await Promise.resolve().then(() => __importStar(require('./media')))).download(blob, `${p.name.replace(/[^\p{L}\p{N}._-]+/gu, '-') || 'azrail-project'}.zip`)).catch(deps.failure);
        actions.append(exportButton);
        if (deps.account?.role !== 'viewer') {
            const edit = document.createElement('button');
            edit.textContent = 'Изменить';
            edit.onclick = () => editProject(p, deps, refresh);
            actions.append(edit);
            const duplicate = document.createElement('button');
            duplicate.textContent = 'Дублировать';
            duplicate.onclick = () => duplicateProject(p, deps, refresh);
            actions.append(duplicate);
            const archive = document.createElement('button');
            archive.textContent = p.status === 'archived' ? 'Вернуть из архива' : 'В архив';
            archive.onclick = () => deps.api(`/api/projects/${encodeURIComponent(p.id)}`, { method: 'PATCH', body: JSON.stringify({ status: p.status === 'archived' ? 'active' : 'archived' }) }).then(async () => { deps.closeDialog(); await refresh(); deps.notice(p.status === 'archived' ? 'Проект возвращён из архива.' : 'Проект перемещён в архив.'); }).catch(deps.failure);
            actions.append(archive);
            if (p.status === 'deleted') {
                const restore = document.createElement('button');
                restore.textContent = 'Восстановить';
                restore.onclick = () => deps.api(`/api/projects/${encodeURIComponent(p.id)}`, { method: 'PATCH', body: JSON.stringify({ status: 'active' }) }).then(async () => { deps.closeDialog(); await refresh(); deps.notice('Проект восстановлен.'); }).catch(deps.failure);
                actions.append(restore);
            }
            else {
                const remove = document.createElement('button');
                remove.className = 'danger-button';
                remove.textContent = 'Удалить…';
                remove.onclick = () => deleteProject(p, deps, refresh);
                actions.append(remove);
            }
        }
    }
    catch (error) {
        root.textContent = error instanceof Error ? error.message : String(error);
    }
}
function editProject(project, deps, refresh) {
    const root = deps.dialog('Параметры проекта', `<label for="project-edit-name">Название</label><input id="project-edit-name" maxlength="120"><label for="project-edit-description">Описание</label><textarea id="project-edit-description" rows="4" maxlength="1200"></textarea><label for="project-edit-studio">Основная студия</label><select id="project-edit-studio"><option value="">AZRAIL Core</option>${Object.entries(studioNames).map(([id, name]) => `<option value="${id}">${esc(name)}</option>`).join('')}</select><label for="project-edit-tags">Теги · через запятую</label><input id="project-edit-tags" maxlength="240" placeholder="production, website, label"><div class="toolbar"><button id="project-edit-save" class="primary">Сохранить</button></div>`);
    const name = root.querySelector('#project-edit-name'), desc = root.querySelector('#project-edit-description'), studio = root.querySelector('#project-edit-studio'), tags = root.querySelector('#project-edit-tags');
    name.value = project.name;
    desc.value = project.description;
    studio.value = project.studioId ?? '';
    tags.value = project.tags.join(', ');
    name.focus();
    root.querySelector('#project-edit-save').onclick = () => { const button = root.querySelector('#project-edit-save'); if (button.disabled)
        return; button.disabled = true; const payload = { name: name.value, description: desc.value, studioId: studio.value || null, tags: tags.value.split(',').map(v => v.trim()).filter(Boolean) }; deps.api(`/api/projects/${encodeURIComponent(project.id)}`, { method: 'PATCH', body: JSON.stringify(payload) }).then(async () => { deps.closeDialog(); await refresh(); deps.notice('Проект обновлён.'); }).catch(deps.failure).finally(() => button.disabled = false); };
}
function duplicateProject(project, deps, refresh) {
    const root = deps.dialog('Дублировать проект', `<p>Будет скопировано текущее рабочее состояние проекта. История миссий и старые версии останутся у оригинала.</p><label for="project-duplicate-name">Название копии</label><input id="project-duplicate-name" maxlength="120"><div class="toolbar"><button id="project-duplicate-run" class="primary">Создать копию</button></div>`);
    const input = root.querySelector('#project-duplicate-name');
    input.value = `${project.name} — копия`;
    input.select();
    root.querySelector('#project-duplicate-run').onclick = () => { const button = root.querySelector('#project-duplicate-run'); button.disabled = true; deps.api(`/api/projects/${encodeURIComponent(project.id)}/duplicate`, { method: 'POST', body: JSON.stringify({ name: input.value }) }).then(async (r) => { deps.closeDialog(); await refresh(); deps.notice(`Копия создана · файлов: ${r.copiedFiles}.`); }).catch(deps.failure).finally(() => button.disabled = false); };
}
function deleteProject(project, deps, refresh) {
    const root = deps.dialog('Удалить проект', `<p>Проект исчезнет из активного списка, но данные не уничтожаются сразу: это безопасное удаление, которое можно восстановить через фильтр «Удалённые».</p><p>Для подтверждения введите точное название:</p><p><strong id="project-delete-name"></strong></p><input id="project-delete-confirm" autocomplete="off"><div class="toolbar"><button id="project-delete-run" class="danger-button">Удалить проект</button></div>`);
    root.querySelector('#project-delete-name').textContent = project.name;
    const input = root.querySelector('#project-delete-confirm'), button = root.querySelector('#project-delete-run');
    button.disabled = true;
    input.oninput = () => button.disabled = input.value !== project.name;
    input.focus();
    button.onclick = () => { if (input.value !== project.name)
        return; button.disabled = true; deps.api(`/api/projects/${encodeURIComponent(project.id)}`, { method: 'DELETE', headers: { 'X-AZRAIL-Confirm-Project': project.id }, body: JSON.stringify({ confirmName: project.name }) }).then(async () => { deps.closeDialog(); await refresh(); deps.notice('Проект перемещён в удалённые.'); }).catch(deps.failure).finally(() => button.disabled = false); };
}
async function loadArtifacts(deps) {
    const list = $('artifact-list');
    list.replaceChildren();
    if (!deps.account) {
        list.textContent = 'Файлы студий появятся после входа.';
        return;
    }
    const response = await deps.api('/api/studio/artifacts');
    for (const item of response.artifacts.slice(0, 12)) {
        const card = document.createElement('button');
        card.className = 'artifact-row';
        const title = document.createElement('span');
        title.textContent = item.name;
        const meta = document.createElement('small');
        meta.textContent = `${bytes(item.bytes)} · ${relativeTime(item.created_at)}`;
        card.append(title, meta);
        card.onclick = () => deps.blobAPI(`/api/studio/artifacts/${item.id}`).then(async (b) => (await Promise.resolve().then(() => __importStar(require('./media')))).download(b, item.name)).catch(deps.failure);
        list.append(card);
    }
    if (!response.artifacts.length)
        list.textContent = 'Здесь появятся сохранённые файлы студий.';
}
async function renderProjectCenter(deps) {
    const list = $('project-list'), summary = $('project-summary');
    const refresh = async () => {
        if (!deps.account) {
            list.textContent = deps.local ? 'Проекты доступны после развёртывания приложения и входа.' : 'Войдите, чтобы увидеть проекты.';
            summary.textContent = '';
            await loadArtifacts(deps);
            return;
        }
        list.setAttribute('aria-busy', 'true');
        summary.textContent = 'Загрузка…';
        try {
            const q = queryString(), response = await deps.api(`/api/projects${q ? '?' + q : ''}`);
            list.replaceChildren();
            for (const item of response.projects)
                list.append(projectCard(item, deps, refresh));
            if (!response.projects.length)
                list.innerHTML = '<div class="project-empty"><strong>Проекты не найдены.</strong><span>Измените фильтр или создайте новый проект.</span></div>';
            summary.textContent = `Показано проектов: ${response.total}`;
            await loadArtifacts(deps);
        }
        finally {
            list.setAttribute('aria-busy', 'false');
        }
    };
    const search = $('project-search');
    search.oninput = () => { clearTimeout(searchTimer); searchTimer = window.setTimeout(() => refresh().catch(deps.failure), 260); };
    for (const id of ['project-sort', 'project-status-filter', 'project-studio-filter'])
        $(id).onchange = () => refresh().catch(deps.failure);
    $('refresh-projects').onclick = () => refresh().catch(deps.failure);
    $('new-project').onclick = () => { if (!deps.account) {
        deps.failure(Error('Войдите, чтобы создать проект.'));
        return;
    } deps.api('/api/projects', { method: 'POST', body: JSON.stringify({ name: 'Новый проект' }) }).then((r) => { deps.notice('Новый проект создан.'); deps.onOpen(r.project); }).catch(deps.failure); };
    await refresh();
}

},
"ui/pulse-lab":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountPulseLab = mountPulseLab;
exports.runPulseLab = runPulseLab;
const media_1 = require("./media");
const el = (tag, text = '') => { const node = document.createElement(tag); node.textContent = text; return node; };
const q = (root, selector) => root.querySelector(selector);
const stateLabel = { healthy: 'Healthy', warning: 'Warning', blocked: 'Blocked', unknown: 'Unknown' };
function localChecks() {
    return [
        { label: 'WAV synthesis', ok: typeof OfflineAudioContext !== 'undefined', detail: 'OfflineAudioContext' },
        { label: 'Audio decode', ok: typeof AudioContext !== 'undefined', detail: 'AudioContext' },
        { label: 'WebM recording', ok: typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function', detail: 'MediaRecorder + canvas.captureStream' },
        { label: 'Microphone', ok: !!navigator.mediaDevices?.getUserMedia, detail: 'navigator.mediaDevices.getUserMedia' },
        { label: 'File download', ok: 'download' in document.createElement('a'), detail: 'HTMLAnchorElement.download' },
    ];
}
function sectionCard(section) {
    const card = el('section');
    card.className = 'pulse-section';
    card.dataset.section = section.id;
    const head = el('div');
    head.className = 'pulse-section-head';
    head.append(el('h3', section.title), el('span', `${section.items.length} signals`));
    card.append(head);
    const grid = el('div');
    grid.className = 'pulse-signal-grid';
    for (const signal of section.items) {
        const row = el('article');
        row.className = 'pulse-signal';
        row.dataset.state = signal.status;
        const top = el('div');
        top.className = 'pulse-signal-top';
        const labels = el('div');
        labels.append(el('small', signal.label), el('strong', signal.value));
        top.append(labels, el('span', stateLabel[signal.status]));
        row.append(top, el('p', signal.detail));
        grid.append(row);
    }
    card.append(grid);
    return card;
}
function browserSection() {
    return { id: 'browser', title: 'DEVICE', items: localChecks().map(check => ({ label: check.label, value: check.ok ? 'Supported' : 'Unavailable', status: check.ok ? 'healthy' : 'warning', detail: check.detail })) };
}
function render(context, report) {
    const host = context.result;
    host.replaceChildren();
    const shell = el('div');
    shell.className = 'pulse-control-report';
    const local = browserSection();
    const hero = el('section');
    hero.className = 'pulse-overview';
    const left = el('div');
    left.append(el('small', 'SYSTEM CONTROL CENTER'), el('strong', report ? stateLabel[report.overall] : 'Local diagnostics'));
    const badge = el('span', report ? 'READ ONLY · NO MODEL CALLS' : 'LOCAL ONLY');
    badge.className = 'runtime-chip';
    badge.dataset.state = report?.overall === 'blocked' ? 'warn' : report?.overall === 'warning' ? 'warn' : 'ok';
    hero.append(left, badge);
    shell.append(hero);
    const truth = el('p', report ? 'This report uses authenticated read-only runtime probes. Workers AI, Gateway, Sandbox and Queue are never exercised synthetically; binding/config presence is labelled separately from proven health.' : 'Sign in to the deployed application to add server, release and runtime signals.');
    truth.className = 'context-note';
    shell.append(truth);
    const sections = report ? [...report.sections, local] : [local];
    for (const section of sections)
        shell.append(sectionCard(section));
    const foot = el('section');
    foot.className = 'pulse-foot';
    const summary = el('div');
    summary.append(el('small', 'Evidence'), el('strong', report ? new Date(report.generatedAt).toLocaleString() : 'Browser runtime'));
    const actions = el('div');
    actions.className = 'row';
    const exportButton = el('button', 'Export JSON');
    exportButton.type = 'button';
    exportButton.onclick = () => (0, media_1.download)(new Blob([JSON.stringify({ server: report, device: localChecks() }, null, 2)], { type: 'application/json' }), 'azrail-pulse-system-report.json');
    actions.append(exportButton);
    foot.append(summary, actions);
    shell.append(foot);
    host.append(shell);
}
function mountPulseLab(context) {
    context.controls.innerHTML = '<div class="pulse-control-head"><div><span class="workbench-kicker">PROFESSIONAL PULSE LAB</span><strong>System state without synthetic paid traffic</strong></div><span class="runtime-chip" data-state="ok">READ ONLY</span></div><div class="pulse-control-actions"><p class="context-note">SYSTEM · AUTH · STORAGE · AI · RUNTIME · RELEASE · HEALTH. A green binding means configured/present only when a real probe would create cost or side effects.</p><button id="studio-run" class="primary" type="button">Refresh System</button></div>';
    render(context, null);
}
async function runPulseLab(context) {
    if (!context.account) {
        render(context, null);
        context.notice('Server diagnostics require an authenticated deployed session. Local device checks are available now.');
        return;
    }
    const report = await context.api('/api/studio/pulse', { signal: context.signal });
    if (context.current())
        render(context, report);
}

},
"ui/studio-draft":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountStudioDraft = mountStudioDraft;
/** Local history and per-module session drafts never rewind server project data. */
function mountStudioDraft(host, id, api, cloud, options = {}) {
    const fields = [...host.querySelectorAll('input:not([type=file]):not([type=password]),textarea,select')].filter(e => !!e.id);
    if (!fields.length)
        return () => { };
    const read = () => Object.fromEntries(fields.map(e => [e.id, e.value]));
    const defaults = read(), storageKey = `pulse.draft.${options.scope ?? 'local'}.${id}`;
    const storage = () => host.ownerDocument.defaultView.sessionStorage;
    const valid = (values) => !!values && typeof values === 'object' && !Array.isArray(values) && Object.entries(values).every(([key, value]) => {
        const field = fields.find(f => f.id === key);
        const max = field && 'maxLength' in field && field.maxLength > 0 ? field.maxLength : 20000;
        return !!field && typeof value === 'string' && value.length <= max;
    });
    let cached = null;
    try {
        const value = JSON.parse(storage().getItem(storageKey) ?? 'null');
        if (valid(value?.values) && Number.isSafeInteger(value.revision) && value.revision >= 0 && typeof value.dirty === 'boolean')
            cached = value;
    }
    catch { }
    if (cached && !(options.preferCurrent && fields.some(field => field.value.trim() !== '')))
        for (const field of fields)
            if (typeof cached.values[field.id] === 'string')
                field.value = cached.values[field.id];
    let states = [read()], at = 0, revision = cached?.revision ?? 0, dirty = cached?.dirty ?? false;
    let loaded = !cloud, saving = false, loading = false, disposed = false;
    const writable = options.writable !== false;
    const emitStatus = (message) => document.dispatchEvent(new CustomEvent('azrail:draft-status', { detail: { status: message, canUndo: at > 0, canRedo: at < states.length - 1 } }));
    const writeCache = () => { try {
        storage().setItem(storageKey, JSON.stringify({ values: read(), revision, dirty }));
    }
    catch { } };
    const bar = document.createElement('div');
    bar.className = 'toolbar draft-toolbar';
    const status = document.createElement('span');
    status.className = 'muted';
    status.setAttribute('role', 'status');
    status.textContent = cloud ? 'Загружаю черновик…' : cached ? 'Черновик восстановлен в этой вкладке' : 'Черновик в этой вкладке';
    const button = (name, action) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = name; b.onclick = action; bar.append(b); return b; };
    const apply = (values) => { for (const field of fields)
        if (typeof values[field.id] === 'string')
            field.value = values[field.id]; update(); };
    const record = () => { const next = read(); if (JSON.stringify(states[at]) === JSON.stringify(next))
        return; states = states.slice(0, at + 1); states.push(next); if (states.length > 40)
        states.shift(); at = states.length - 1; dirty = true; writeCache(); status.textContent = 'Есть несохранённые изменения'; update(); };
    const history = (position) => { at = position; apply(states[at]); dirty = true; writeCache(); status.textContent = 'Есть несохранённые изменения'; };
    const undo = button('↶ Отменить', () => { if (at)
        history(at - 1); });
    const redo = button('↷ Повторить', () => { if (at < states.length - 1)
        history(at + 1); });
    button('Сбросить', () => { apply(defaults); record(); });
    const save = button('Сохранить черновик', () => { void persist(); });
    save.hidden = !cloud || !writable;
    const reload = button('Загрузить сохранённый', () => { void load(true); });
    reload.hidden = !cloud;
    bar.append(status);
    host.append(bar);
    function update() { undo.disabled = !at; redo.disabled = at >= states.length - 1; save.disabled = !writable || !loaded || saving || loading; reload.disabled = saving || loading; emitStatus(status.textContent || 'Local state'); }
    async function load(explicit = false) {
        if (loading || saving || disposed)
            return;
        loading = true;
        update();
        const start = JSON.stringify(read());
        try {
            const r = await api(`/api/studio/drafts/${id}`);
            if (disposed)
                return;
            if (!Number.isSafeInteger(r.revision) || r.revision < 0 || !valid(r.values))
                throw Error('Некорректный черновик сервера.');
            // An automatic load cannot silently adopt a newer revision and overwrite it.
            if (!explicit && dirty && revision !== r.revision) {
                loaded = false;
                status.textContent = 'На сервере другая версия. Ваш текст сохранён в этой вкладке. Загрузите сохранённый черновик перед записью.';
                return;
            }
            revision = r.revision;
            loaded = true;
            if ((explicit || !dirty) && Object.keys(r.values).length && start === JSON.stringify(read())) {
                apply(r.values);
                states = [read()];
                at = 0;
                dirty = false;
                status.textContent = 'Черновик загружен';
            }
            else
                status.textContent = dirty ? 'Ваши правки восстановлены в форме' : r.revision ? 'Черновик на сервере; ваши правки сохранены в форме' : 'Новый черновик';
            writeCache();
        }
        catch {
            if (!disposed)
                status.textContent = 'Не удалось загрузить черновик. Повторите загрузку.';
        }
        finally {
            loading = false;
            if (!disposed)
                update();
        }
    }
    async function persist() {
        if (!writable || !loaded || saving || loading || disposed)
            return;
        saving = true;
        update();
        const values = read();
        try {
            const r = await api(`/api/studio/drafts/${id}`, { method: 'PUT', body: JSON.stringify({ baseRevision: revision, values }) });
            if (disposed)
                return;
            revision = r.revision;
            dirty = JSON.stringify(values) !== JSON.stringify(read());
            writeCache();
            status.textContent = dirty ? 'Сохранено; есть новые правки' : 'Сохранено на сервере';
        }
        catch (e) {
            if (!disposed)
                status.textContent = e instanceof Error ? e.message : 'Не удалось сохранить';
        }
        finally {
            saving = false;
            if (!disposed)
                update();
        }
    }
    const onUndo = () => { if (at)
        history(at - 1); };
    const onRedo = () => { if (at < states.length - 1)
        history(at + 1); };
    document.addEventListener('azrail:studio-undo', onUndo);
    document.addEventListener('azrail:studio-redo', onRedo);
    fields.forEach(f => f.addEventListener('input', record));
    update();
    if (cloud)
        void load();
    return () => { if (disposed)
        return; record(); writeCache(); disposed = true; document.removeEventListener('azrail:studio-undo', onUndo); document.removeEventListener('azrail:studio-redo', onRedo); fields.forEach(f => f.removeEventListener('input', record)); bar.remove(); };
}

},
"ui/studio-manifest":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studioManifest = void 0;
exports.studioMeta = studioMeta;
exports.studioById = studioById;
// Brand Governance Directive: canonical English names are immutable without owner approval.
// Russian text stays in the descriptor so the user immediately understands the studio purpose.
exports.studioManifest = [
    { id: 'web', icon: 'code', title: 'Web Studio', description: 'Сайты, веб-приложения, интерфейсы, исходный код, адаптивность, проверка качества и подготовка к развёртыванию.', type: 'AZRAIL', action: 'Создать проект', cloud: true, capabilities: ['mission', 'cloud-write'] },
    { id: 'image', icon: 'image', title: 'Image Studio', description: 'Генерация и редактирование изображений, варианты, референсы, повышение качества, проверка и экспорт.', type: 'WORKERS AI', action: 'Создать изображение', cloud: true, capabilities: ['image-generation', 'cloud-write'] },
    { id: 'music', icon: 'music', title: 'Music Studio', description: 'Создание и анализ музыки, MIDI, структура, Camelot, референсы, WAV/MIDI и продакшн-процесс.', type: 'LOCAL ENGINE', action: 'Создать музыку', cloud: false, capabilities: ['music-generation'] },
    { id: 'video', icon: 'video', title: 'Video Studio', description: 'Раскадровка, сцены, таймлайн, медиа, звук, быстрый предпросмотр, очередь рендера, проверка и экспорт.', type: 'ГИБРИД', action: 'Создать видео', cloud: false, capabilities: ['video-generation'] },
    { id: 'lab', icon: 'pulse', title: 'Pulse Lab', description: 'Системный контроль: среда выполнения, доступ, хранилища, AI, доказательства релиза, состояние и восстановление без синтетических платных запросов.', type: 'SYSTEM CONTROL', action: 'Обновить систему', cloud: false, capabilities: ['system-diagnostics'] },
    { id: 'ledger', icon: 'ledger', title: 'Ledger Studio', description: 'Расходы, бюджеты, токены, медиа, инструменты, задержки, повторы, сверка эффектов и аномалии.', type: 'ОБЛАКО', action: 'Обновить Ledger', cloud: true, capabilities: ['ledger-read'] },
    { id: 'data', icon: 'table', title: 'Data Studio', description: 'Данные, определение схемы, валидация, фильтрация, сортировка, статистика, графики, преобразования и экспорт.', type: 'НА УСТРОЙСТВЕ', action: 'Анализировать данные', cloud: false, capabilities: ['data-analysis'] },
    { id: 'als', icon: 'ableton', title: 'Ableton Lab', description: 'Анализ Ableton Live Set: дорожки, клипы, устройства и плагины, маршрутизация, сэмплы, мастер-цепь и отчёт о недостающих ресурсах.', type: 'ОБЛАКО', action: 'Анализировать ALS', cloud: true, capabilities: ['ableton-analysis', 'cloud-write'] },
    { id: 'audio', icon: 'waveform', title: 'Audio Lab', description: 'Измеряемый анализ аудио: LUFS, true peak, динамика, стерео, BPM и тональность, форма волны, спектр и A/B-сравнение.', type: 'НА УСТРОЙСТВЕ', action: 'Анализировать аудио', cloud: false, capabilities: ['audio-analysis'] },
];
function studioMeta(id) {
    const studio = exports.studioManifest.find(item => item.id === id);
    if (!studio)
        throw new Error(`Unknown studio: ${id}`);
    return studio;
}
function studioById(id) { return exports.studioManifest.find(studio => studio.id === id); }

},
"ui/studio-modules/als":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studioModule = void 0;
const studio_manifest_1 = require("../studio-manifest");
const ableton_lab_1 = require("../ableton-lab");
const shared_1 = require("./shared");
const media_1 = require("../media");
const meta = (0, studio_manifest_1.studioMeta)('als');
const MAX_ALS = 12 * 1024 * 1024;
exports.studioModule = {
    ...meta,
    async mount(context) {
        context.controls.innerHTML = '<div class="ableton-lab-shell"><div class="ableton-input">' + (0, shared_1.inputFile)('.als,.xml') + '<p class="context-note">До 12 МБ compressed / 24 МБ unpacked XML. Source не изменяется. Если открыт Project, analysis + source ALS сохраняются в private project artifacts.</p>' + shared_1.runButton + '</div><section class="ableton-history"><div class="section-heading"><h3>Analysis history</h3><span>Project-bound</span></div><div id="ableton-history"></div></section></div>';
        context.mountDraft(false, { scope: context.account?.id ?? 'local', writable: false });
        await (0, ableton_lab_1.renderAbletonHistory)(context).catch(context.failure);
    },
    async run(context) {
        const source = (0, shared_1.requiredFile)(context);
        if (source.size > MAX_ALS)
            throw Error('ALS должен быть не больше 12 МБ.');
        const headers = { 'Content-Type': 'application/octet-stream', 'X-Filename': encodeURIComponent(source.name) };
        if (context.projectId)
            headers['X-Project-Id'] = context.projectId;
        const result = await context.api('/api/studio/als', { method: 'POST', headers, body: source, signal: context.signal });
        if (!context.current())
            return;
        const rendered = (0, ableton_lab_1.renderAbletonReport)(context.result, result, source.name);
        if (rendered.sourceButton && result.sourceArtifactId)
            rendered.sourceButton.onclick = () => context.blobAPI(`/api/studio/artifacts/${result.sourceArtifactId}`).then(blob => (0, media_1.download)(blob, source.name)).catch(context.failure);
        if (result.saved) {
            context.notice('ALS analysis сохранён в проекте.');
            await (0, ableton_lab_1.renderAbletonHistory)(context).catch(context.failure);
        }
    }
};

},
"ui/studio-modules/audio":function(module,exports,require){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.studioModule = void 0;
const studio_manifest_1 = require("../studio-manifest");
const shared_1 = require("./shared");
const meta = (0, studio_manifest_1.studioMeta)('audio');
exports.studioModule = {
    ...meta,
    mount(context) {
        context.controls.innerHTML = `<div class="audio-lab-shell"><section class="audio-lab-input"><p class="muted">Professional offline mastering analysis. Integrated LUFS, Short-term LUFS, Loudness Range, True Peak estimate, RMS, Crest Factor, stereo correlation/width, clipping, silence, DC offset, spectral balance, BPM, key, Waveform, Spectrogram and Reference Comparison.</p>${(0, shared_1.inputFile)('audio/*')}<label for="audio-reference">Reference track <span class="muted">optional</span></label><input id="audio-reference" type="file" accept="audio/*"><p class="context-note">Файлы анализируются локально на устройстве: моно/стерео, до 30 МБ и 15 минут на файл. Ничего не загружается в Cloudflare без отдельного действия.</p>${shared_1.runButton}</section></div>`;
        context.mountDraft(!!context.account, { scope: context.account?.id ?? 'local', writable: context.account?.role !== 'viewer' });
    },
    async run(context) {
        const source = (0, shared_1.requiredFile)(context), reference = context.controls.querySelector('#audio-reference')?.files?.[0];
        const { analyzeAudio } = await Promise.resolve().then(() => __importStar(require('../media')));
        if (!context.current())
            return;
        context.notice('Audio Lab: измеряю loudness, dynamics, stereo, spectrum, BPM и key…');
        const result = await analyzeAudio(source, context.signal), comparison = reference ? await analyzeAudio(reference, context.signal) : undefined;
        if (!context.current())
            return;
        const { renderAudioReport } = await Promise.resolve().then(() => __importStar(require('../audio-analysis')));
        if (context.current())
            renderAudioReport(context.result, result, comparison);
    }
};

},
"ui/studio-modules/data":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studioModule = void 0;
const studio_manifest_1 = require("../studio-manifest");
const data_studio_1 = require("../data-studio");
const meta = (0, studio_manifest_1.studioMeta)('data');
exports.studioModule = { ...meta, pendingLabel: 'Анализирую dataset…', mount(context) { (0, data_studio_1.mountDataStudio)(context); }, run: data_studio_1.runDataStudio, cleanup: () => (0, data_studio_1.cleanupDataStudio)() };

},
"ui/studio-modules/image":function(module,exports,require){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.studioModule = void 0;
const image_request_1 = require("../image-request");
const studio_manifest_1 = require("../studio-manifest");
const shared_1 = require("./shared");
const panel_state_1 = require("../components/panel-state");
const compare_mode_1 = require("../components/compare-mode");
const image_studio_2_1 = require("../image-studio-2");
const meta = (0, studio_manifest_1.studioMeta)('image');
let referenceId = null, operation = 'generate', compare = null, workbench = null;
const preparedReferences = new Map();
const escape = (s) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function number(context, id) { const value = Number((0, shared_1.fieldValue)(context, id)); return Number.isFinite(value) ? value : 0; }
function compareItem(item) { return { id: item.id, label: `${item.operation.toUpperCase()} · ${item.width}×${item.height}`, render: host => { const img = document.createElement('img'); img.src = item.url; img.alt = item.prompt || 'Image comparison'; const p = document.createElement('p'); p.className = 'muted'; p.textContent = `${item.style} · ${item.model}`; host.append(img, p); } }; }
function addCompareButtons(actions, item) { if (!compare)
    return; const a = document.createElement('button'); a.type = 'button'; a.textContent = 'Set A'; a.onclick = () => compare?.setA(compareItem(item)); const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Set B'; b.onclick = () => compare?.setB(compareItem(item)); actions.append(a, b); }
function setMode(context, next, ref, label) { operation = next; referenceId = ref; const badge = context.controls.querySelector('#image-reference'); if (badge) {
    badge.hidden = !ref && next === 'generate';
    badge.textContent = ref ? `${label ?? 'Reference'} · ${next}` : next !== 'generate' ? `Mode · ${next}` : '';
} context.notice(ref ? `Reference выбран: ${label ?? ref.slice(0, 8)}.` : next === 'generate' ? 'Reference очищен.' : `Режим: ${next}.`); }
async function prepareReference(context, item, next) {
    const cached = preparedReferences.get(item.artifactId);
    if (cached) {
        setMode(context, next, cached, item.name);
        return;
    }
    context.notice('Готовлю безопасную reference-копию до 512 px…');
    const source = await context.blobAPI(item.url), bitmap = await createImageBitmap(source);
    const scale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.floor(bitmap.width * scale)), height = Math.max(1, Math.floor(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        bitmap.close();
        throw Error('Canvas 2D недоступен.');
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise((resolve, reject) => canvas.toBlob(v => v ? resolve(v) : reject(Error('Не удалось подготовить reference image.')), 'image/jpeg', 0.92));
    const saved = await context.api('/api/studio/artifacts', { method: 'POST', headers: { 'Content-Type': 'image/jpeg', 'X-Filename': encodeURIComponent(`reference-${item.artifactId}.jpg`), 'X-Project-Id': context.projectId ?? '', 'X-Studio-Id': 'image' }, body: blob, signal: context.signal });
    preparedReferences.set(item.artifactId, saved.id);
    setMode(context, next, saved.id, item.name);
}
async function loadHistory(context) {
    const list = context.controls.querySelector('#image-history');
    if (!list)
        return;
    (0, panel_state_1.renderPanelLoading)(list, 'Загружаю историю изображений…');
    if (!context.account) {
        list.innerHTML = '<p class="muted">Войдите, чтобы видеть сохранённые изображения.</p>';
        return;
    }
    const q = context.projectId ? `?projectId=${encodeURIComponent(context.projectId)}` : '';
    const r = await context.api('/api/studio/image/history' + q);
    list.replaceChildren();
    workbench?.renderVersionHistory(r.items);
    if (!r.items.length) {
        list.innerHTML = '<p class="muted">История изображений пока пуста.</p>';
        return;
    }
    for (const item of r.items) {
        const card = document.createElement('article');
        card.className = 'image-history-card';
        card.innerHTML = `<img src="${escape(item.url)}" alt=""><div><strong>${escape(item.operation.toUpperCase())}</strong><small>${escape(item.aspectRatio)} · ${item.width}×${item.height} · ${escape(item.style)}</small><p>${escape(item.prompt)}</p></div>`;
        const actions = document.createElement('div');
        actions.className = 'image-mini-actions';
        const ref = document.createElement('button');
        ref.type = 'button';
        ref.textContent = 'Use as reference';
        ref.onclick = () => prepareReference(context, item, 'edit').catch(context.failure);
        const variation = document.createElement('button');
        variation.type = 'button';
        variation.textContent = 'Variation';
        variation.onclick = () => prepareReference(context, item, 'variation').catch(context.failure);
        const upscale = document.createElement('button');
        upscale.type = 'button';
        upscale.textContent = 'Upscale';
        upscale.onclick = () => prepareReference(context, item, 'upscale').catch(context.failure);
        const board = document.createElement('button');
        board.type = 'button';
        board.textContent = 'Add to board';
        board.onclick = () => { workbench?.addReference(item); context.notice('Добавлено в Reference Board.'); };
        const meta = document.createElement('button');
        meta.type = 'button';
        meta.textContent = 'Metadata';
        meta.onclick = () => context.dialog?.('Image metadata', `<div class="project-detail-grid"><div><small>MODEL</small><strong>${escape(item.model)}</strong></div><div><small>SEED</small><strong>${item.seed ?? 'auto'}</strong></div><div><small>SIZE</small><strong>${item.width}×${item.height}</strong></div><div><small>STYLE</small><strong>${escape(item.style)}</strong></div></div><p>${escape(item.prompt)}</p>`);
        actions.append(ref, variation, upscale, board, meta);
        addCompareButtons(actions, item);
        card.append(actions);
        list.append(card);
    }
}
async function refreshHistory(context) { const host = context.controls.querySelector('#image-history'); if (!host)
    return; try {
    await loadHistory(context);
}
catch (error) {
    (0, panel_state_1.renderPanelError)(host, (0, panel_state_1.errorMessage)(error), () => refreshHistory(context));
    context.failure(error);
} }
function renderResults(context, items) {
    context.result.replaceChildren();
    const grid = document.createElement('div');
    grid.className = 'image-result-grid';
    for (const item of items) {
        const card = document.createElement('article');
        card.className = 'image-result-card';
        const img = document.createElement('img');
        img.src = item.url;
        img.alt = 'Сгенерированное изображение';
        const actions = document.createElement('div');
        actions.className = 'image-result-actions';
        const download = document.createElement('button');
        download.textContent = 'Download';
        download.onclick = () => context.blobAPI(item.url).then(blob => Promise.resolve().then(() => __importStar(require('../media'))).then(m => m.download(blob, item.name))).catch(context.failure);
        const ref = document.createElement('button');
        ref.textContent = 'Use as reference';
        ref.onclick = () => prepareReference(context, item, 'edit').catch(context.failure);
        const variation = document.createElement('button');
        variation.textContent = 'Create variation';
        variation.onclick = () => prepareReference(context, item, 'variation').catch(context.failure);
        const edit = document.createElement('button');
        edit.textContent = 'Edit';
        edit.onclick = () => prepareReference(context, item, 'edit').catch(context.failure);
        const upscale = document.createElement('button');
        upscale.textContent = 'Upscale';
        upscale.onclick = () => prepareReference(context, item, 'upscale').catch(context.failure);
        const board = document.createElement('button');
        board.textContent = 'Add to board';
        board.onclick = () => { workbench?.addReference(item); context.notice('Добавлено в Reference Board.'); };
        const metadata = document.createElement('button');
        metadata.textContent = 'Metadata';
        metadata.onclick = () => context.dialog?.('Image metadata', `<div class="project-detail-grid"><div><small>MODEL</small><strong>${escape(item.model)}</strong></div><div><small>SEED</small><strong>${item.seed ?? 'auto'}</strong></div><div><small>SIZE</small><strong>${item.width}×${item.height}</strong></div><div><small>STYLE</small><strong>${escape(item.style)}</strong></div></div><p>${escape(item.prompt)}</p>`);
        actions.append(download, ref, variation, edit, upscale, board, metadata);
        addCompareButtons(actions, item);
        card.onclick = (event) => { if (event.target.tagName !== 'BUTTON')
            workbench?.setActive(item); };
        card.append(img, actions);
        grid.append(card);
    }
    context.result.append(grid);
}
exports.studioModule = {
    ...meta,
    async mount(context) {
        referenceId = null;
        operation = 'generate';
        preparedReferences.clear();
        context.controls.innerHTML = `<div class="image-studio-shell"><div class="image-form"><label for="studio-text">Промпт</label><textarea id="studio-text" rows="4" maxlength="4000" placeholder="Обложка минимал-техно релиза: скульптурная форма, тёмный фон, фиолетовый свет"></textarea><div class="image-options"><label>Aspect ratio<select id="image-aspect"><option>1:1</option><option>16:9</option><option>9:16</option><option>4:3</option><option>3:4</option><option>3:2</option><option>2:3</option></select></label><label>Resolution<select id="image-resolution"><option value="512">512</option><option value="768">768</option><option value="1024" selected>1024</option></select></label><label>Style<select id="image-style"><option value="auto">Auto</option><option value="cinematic">Cinematic</option><option value="editorial">Editorial</option><option value="minimal">Minimal</option><option value="product">Product</option><option value="illustration">Illustration</option><option value="3d">3D</option><option value="dark-techno">Dark Techno</option></select></label><label>Image model<select id="image-model"><option value="">AUTO router</option><option value="@cf/black-forest-labs/flux-2-klein-4b">FLUX.2 Klein 4B · Fast</option><option value="@cf/black-forest-labs/flux-2-klein-9b">FLUX.2 Klein 9B · Quality/Reference</option></select></label><label>Seed<input id="image-seed" inputmode="numeric" placeholder="Auto" maxlength="10"></label><label>Variations<select id="image-variations"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label></div><div id="image-reference" class="image-reference" hidden></div><div class="toolbar"><button id="studio-run" class="primary" type="button">Generate</button><button id="image-clear-reference" type="button">Clear reference</button></div><p class="muted image-model-note">AUTO uses the existing approved Cloudflare image route. Manual switch is limited to the two already-reviewed FLUX.2 providers; the separate 243-model catalog is intentionally deferred.</p></div><section class="image-history"><div class="section-heading"><h3>History / Variants</h3><button id="image-refresh-history" type="button">Refresh</button></div><div id="image-history"></div></section></div>${(0, image_studio_2_1.imageStudio2Markup)()}`;
        compare?.destroy();
        compare = (0, compare_mode_1.mountCompareMode)(context.controls);
        workbench?.destroy();
        workbench = (0, image_studio_2_1.mountImageStudio2)(context, { setOperation: next => setMode(context, next, referenceId), useReference: (item, next) => prepareReference(context, item, next) });
        context.controls.querySelector('#image-clear-reference').onclick = () => setMode(context, 'generate', null);
        context.controls.querySelector('#image-refresh-history').onclick = () => void refreshHistory(context);
        if (context.account) {
            const restore = document.createElement('button');
            restore.textContent = 'Вернуть предыдущий запрос';
            restore.onclick = () => { const pending = (0, image_request_1.readPendingImage)(context.account.id); if (!pending) {
                context.notice('Незавершённых запросов изображения в этой вкладке нет.');
                return;
            } try {
                const parsed = JSON.parse(pending.body);
                const input = context.controls.querySelector('#studio-text');
                input.value = parsed.prompt;
                operation = parsed.operation ?? 'generate';
                referenceId = parsed.referenceArtifactId ?? null;
                context.notice('Предыдущий запрос восстановлен. Повтор пойдёт с тем же Idempotency-Key.');
            }
            catch (error) {
                context.failure(error);
            } };
            context.controls.querySelector('.toolbar')?.append(restore);
        }
        context.mountDraft(!!context.account, { scope: context.account?.id ?? 'local', writable: context.account?.role !== 'viewer' });
        await refreshHistory(context);
    },
    async run(context) {
        if (!context.account)
            throw Error('Для Image Studio войдите в развёрнутое приложение.');
        const seedText = (0, shared_1.fieldValue)(context, 'image-seed').trim();
        const advanced = workbench?.getEnhancements();
        const result = await (0, image_request_1.requestImage)(context.account.id, { prompt: (0, shared_1.fieldValue)(context, 'studio-text'), projectId: context.projectId || undefined, aspectRatio: (0, shared_1.fieldValue)(context, 'image-aspect'), resolution: number(context, 'image-resolution'), style: (0, shared_1.fieldValue)(context, 'image-style'), seed: seedText ? number(context, 'image-seed') : null, variations: number(context, 'image-variations'), operation, referenceArtifactId: referenceId, ...advanced }, (path, options) => context.api(path, { ...options, signal: context.signal }));
        if (!context.current())
            return;
        renderResults(context, result.items);
        for (const item of result.items)
            workbench?.addReference(item);
        workbench?.renderVersionHistory(result.items);
        await refreshHistory(context);
        operation = 'generate';
        referenceId = null;
        const badge = context.controls.querySelector('#image-reference');
        if (badge)
            badge.hidden = true;
    },
    cleanup() { compare?.destroy(); compare = null; workbench?.destroy(); workbench = null; }
};

},
"ui/studio-modules/lab":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studioModule = void 0;
const studio_manifest_1 = require("../studio-manifest");
const pulse_lab_1 = require("../pulse-lab");
const meta = (0, studio_manifest_1.studioMeta)('lab');
exports.studioModule = { ...meta, mount: pulse_lab_1.mountPulseLab, run: pulse_lab_1.runPulseLab };

},
"ui/studio-modules/ledger":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studioModule = void 0;
const studio_manifest_1 = require("../studio-manifest");
const ledger_studio_1 = require("../ledger-studio");
const meta = (0, studio_manifest_1.studioMeta)('ledger');
exports.studioModule = { ...meta, pendingLabel: 'Обновляю Ledger…', mount: ledger_studio_1.mountLedgerStudio, run: ledger_studio_1.runLedgerStudio };

},
"ui/studio-modules/music":function(module,exports,require){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.studioModule = void 0;
const studio_manifest_1 = require("../studio-manifest");
const panel_state_1 = require("../components/panel-state");
const shared_1 = require("./shared");
const music_intelligence_panel_1 = require("../music-intelligence-panel");
const music_intelligence_runtime_1 = require("../music-intelligence-runtime");
const music_intelligence_1 = require("../../src/lib/music-intelligence");
const meta = (0, studio_manifest_1.studioMeta)('music');
let current = null, mediaUrl = null;
const escape = (s) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function value(context, id) { return (0, shared_1.fieldValue)(context, id).trim(); }
function input(context) {
    const bpmText = value(context, 'bpm');
    return { prompt: value(context, 'studio-text'), bpm: bpmText ? Number(bpmText) : null, keyRoot: value(context, 'music-key'), scale: value(context, 'music-scale'), bars: Number(value(context, 'bars')), timeSignature: value(context, 'music-time-signature'), genre: value(context, 'music-genre'), mood: value(context, 'music-mood'), pattern: value(context, 'music-pattern'), arrangement: value(context, 'music-arrangement'), synthPreset: value(context, 'music-synth') };
}
function setField(context, id, next) { const field = context.controls.querySelector(`#${id}`); if (field) {
    field.value = String(next);
    field.dispatchEvent(new Event('input', { bubbles: true }));
} }
function loadSettings(context, item) { setField(context, 'studio-text', item.prompt); setField(context, 'bpm', item.bpm); setField(context, 'music-key', item.keyRoot); setField(context, 'music-scale', item.scale); setField(context, 'bars', item.bars); setField(context, 'music-time-signature', item.timeSignature); setField(context, 'music-genre', item.genre); setField(context, 'music-mood', item.mood); setField(context, 'music-pattern', item.pattern); setField(context, 'music-arrangement', item.arrangement); setField(context, 'music-synth', item.synthPreset); context.notice('Сессия загружена. Нажмите Generate, чтобы пересобрать WAV/MIDI локально.'); }
function drawWaveform(canvas, peaks) { const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1)), width = Math.max(320, canvas.clientWidth || 720), height = 150; canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr); const ctx = canvas.getContext('2d'); if (!ctx)
    return; ctx.scale(dpr, dpr); ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#0a090d'; ctx.fillRect(0, 0, width, height); ctx.strokeStyle = '#6d557f'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2); ctx.stroke(); ctx.strokeStyle = '#b99bd1'; ctx.lineWidth = 1.4; for (let i = 0; i < peaks.length; i++) {
    const x = i / (peaks.length - 1) * width, h = Math.max(1, peaks[i] * (height * .42));
    ctx.beginPath();
    ctx.moveTo(x, height / 2 - h);
    ctx.lineTo(x, height / 2 + h);
    ctx.stroke();
} }
function noteColor(part) { return part === 'bass' ? '#785d91' : part === 'pad' ? '#4f4461' : part === 'arp' ? '#c4a9df' : '#9d78b9'; }
function drawPianoRoll(canvas, session) { const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1)), width = Math.max(320, canvas.clientWidth || 720), height = 240; canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr); const ctx = canvas.getContext('2d'); if (!ctx)
    return; ctx.scale(dpr, dpr); ctx.fillStyle = '#0a090d'; ctx.fillRect(0, 0, width, height); const total = session.bars * session.beatsPerBar, minPitch = Math.min(...session.notes.map(n => n.pitch), 36), maxPitch = Math.max(...session.notes.map(n => n.pitch), 72), range = Math.max(12, maxPitch - minPitch + 1); ctx.strokeStyle = '#28222f'; ctx.lineWidth = 1; for (let b = 0; b <= total; b++) {
    const x = b / total * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
} for (let p = 0; p <= range; p += 3) {
    const y = p / range * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
} for (const n of session.notes) {
    const x = n.start / total * width, w = Math.max(2, n.length / total * width), y = height - (n.pitch - minPitch + 1) / range * height, h = Math.max(3, height / range * .78);
    ctx.fillStyle = noteColor(n.part);
    ctx.globalAlpha = .45 + n.velocity * .5;
    ctx.fillRect(x, y, w, h);
} ctx.globalAlpha = 1; }
function renderResult(context, result) {
    if (mediaUrl)
        URL.revokeObjectURL(mediaUrl);
    mediaUrl = URL.createObjectURL(result.wav);
    context.setLastBlob(result.wav);
    context.setMediaCleanup(() => { if (mediaUrl) {
        URL.revokeObjectURL(mediaUrl);
        mediaUrl = null;
    } });
    const s = result.session;
    context.result.innerHTML = `<div class="music-result-head"><div><small>SESSION</small><strong>${escape(s.keyRoot)} ${escape(s.scale)} · ${s.bpm} BPM · ${s.bars} bars · ${escape(s.timeSignature)}</strong></div><div><small>ARRANGEMENT</small><strong>${escape(s.arrangement)} · ${escape(s.synthPreset)}</strong></div></div><audio id="music-player" controls></audio><div class="music-visual-grid"><section><div class="section-heading"><h3>Waveform</h3><span class="muted">${result.seconds.toFixed(1)} s</span></div><canvas id="music-waveform"></canvas></section><section><div class="section-heading"><h3>Piano Roll</h3><span class="muted">${s.notes.length} notes</span></div><canvas id="music-piano-roll"></canvas></section></div><div id="music-result-actions" class="toolbar"></div><section id="music-render-review" class="music-render-review"><div class="section-heading"><h3>Render → Analyze → Improve</h3><span>measured WAV loop</span></div><p class="muted">Analyzing rendered WAV…</p></section>`;
    const audio = context.result.querySelector('#music-player');
    audio.src = mediaUrl;
    requestAnimationFrame(() => { drawWaveform(context.result.querySelector('#music-waveform'), result.waveform); drawPianoRoll(context.result.querySelector('#music-piano-roll'), s); });
    const actions = context.result.querySelector('#music-result-actions');
    const button = (label, action) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.onclick = () => { Promise.resolve(action()).catch(context.failure); }; actions.append(b); return b; };
    button('Download WAV', () => Promise.resolve().then(() => __importStar(require('../media'))).then(m => m.download(result.wav, 'azrail-music.wav')));
    button('Download MIDI', () => Promise.resolve().then(() => __importStar(require('../media'))).then(m => m.download(result.midi, 'azrail-music.mid')));
    button('Analyze render', () => analyzeRender(context, result));
    if (context.account && context.account.role !== 'viewer')
        button('Save session', () => saveSession(context, result));
}
async function analyzeRender(context, result) { const host = context.result.querySelector('#music-render-review'); if (!host)
    return; host.innerHTML = '<div class="section-heading"><h3>Render → Analyze → Improve</h3><span>measured WAV loop</span></div><p class="muted">Measuring rendered WAV…</p>'; try {
    const file = new File([result.wav], 'azrail-render.wav', { type: 'audio/wav' }), detailed = await (0, music_intelligence_runtime_1.analyzeMusicFile)(file), targetLufsField = context.controls.querySelector('#music-target-lufs'), targetLufs = targetLufsField?.value.trim() ? Number(targetLufsField.value) : null, mode = result.session.scale === 'major' ? 'major' : result.session.scale === 'minor' ? 'minor' : null, review = (0, music_intelligence_1.reviewRenderIteration)(detailed.analysis, { bpm: result.session.bpm, keyRoot: result.session.keyRoot, mode, targetLufs: Number.isFinite(targetLufs) ? targetLufs : null });
    host.innerHTML = `<div class="section-heading"><h3>Render → Analyze → Improve</h3><span>${review.passed ? 'PASS' : 'REVIEW'}</span></div><div class="music-profile-summary"><span>BPM ${detailed.analysis.metrics.bpm?.toFixed(1) ?? '—'}</span><span>Key ${escape(detailed.analysis.metrics.keyRoot && detailed.analysis.metrics.mode ? `${detailed.analysis.metrics.keyRoot} ${detailed.analysis.metrics.mode}` : '—')}</span><span>LUFS ${detailed.analysis.metrics.integratedLufs?.toFixed(1) ?? '—'}</span><span>True peak ${detailed.analysis.metrics.truePeakDb?.toFixed(2) ?? '—'} dBTP</span><span>Correlation ${detailed.analysis.metrics.correlation?.toFixed(2) ?? '—'}</span></div><div class="music-matrix-scroll"><table class="music-reference-table"><thead><tr><th>Check</th><th>Status</th><th>Measured</th><th>Target</th><th>Next action</th></tr></thead><tbody>${review.checks.map(c => `<tr><td>${escape(c.code)}</td><td>${c.status}</td><td>${escape(c.measured)}</td><td>${escape(c.target)}</td><td>${escape(c.action ?? '—')}</td></tr>`).join('')}</tbody></table></div><ol>${review.nextActions.map(a => `<li>${escape(a)}</li>`).join('')}</ol><div class="toolbar"><button id="music-render-again" type="button">Render next iteration</button></div><p class="muted">Review uses measured audio only. It does not claim artistic quality or copy reference masters.</p>`;
    host.querySelector('#music-render-again').onclick = () => context.controls.querySelector('#studio-run')?.click();
}
catch (error) {
    host.innerHTML = `<div class="section-heading"><h3>Render → Analyze → Improve</h3><span>FAILED</span></div><p class="error">${escape(error instanceof Error ? error.message : String(error))}</p>`;
    context.failure(error);
} }
async function uploadArtifact(context, blob, name) { return context.api('/api/studio/artifacts', { method: 'POST', headers: { 'Content-Type': blob.type, 'X-Filename': encodeURIComponent(name), 'X-Project-Id': context.projectId ?? '', 'X-Studio-Id': 'music' }, body: blob }); }
async function saveSession(context, result) { if (!context.account)
    throw Error('Войдите, чтобы сохранить сессию.'); context.notice('Сохраняю WAV, MIDI и параметры сессии…'); let wavId = null, midiId = null; try {
    wavId = (await uploadArtifact(context, result.wav, 'azrail-music.wav')).id;
    midiId = (await uploadArtifact(context, result.midi, 'azrail-music.mid')).id;
}
catch (error) {
    if (wavId)
        context.api(`/api/studio/artifacts/${wavId}`, { method: 'DELETE' }).catch(() => { });
    throw error;
} const s = result.session; await context.api('/api/studio/music/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: context.projectId || '', prompt: s.prompt, genre: s.genre, mood: s.mood, bpm: s.bpm, keyRoot: s.keyRoot, scale: s.scale, bars: s.bars, timeSignature: s.timeSignature, pattern: s.pattern, arrangement: s.arrangement, synthPreset: s.synthPreset, seed: s.seed, wavArtifactId: wavId, midiArtifactId: midiId }) }); context.notice('Music session сохранена вместе с WAV и MIDI.'); await refreshHistory(context); }
async function downloadSaved(context, artifactId, name) { const blob = await context.blobAPI(`/api/studio/artifacts/${artifactId}`); const { download } = await Promise.resolve().then(() => __importStar(require('../media'))); download(blob, name); }
async function loadHistory(context) { const host = context.controls.querySelector('#music-history'); if (!host)
    return; (0, panel_state_1.renderPanelLoading)(host, 'Загружаю Music sessions…'); if (!context.account) {
    host.innerHTML = '<p class="muted">Войдите, чтобы видеть сохранённые Music sessions.</p>';
    return;
} const q = context.projectId ? `?projectId=${encodeURIComponent(context.projectId)}` : ''; const response = await context.api('/api/studio/music/sessions' + q); host.replaceChildren(); if (!response.items.length) {
    host.innerHTML = '<p class="muted">Сохранённых Music sessions пока нет.</p>';
    return;
} for (const item of response.items) {
    const card = document.createElement('article');
    card.className = 'music-session-card';
    card.innerHTML = `<div><strong>${escape(item.keyRoot)} ${escape(item.scale)} · ${item.bpm} BPM</strong><small>${escape(item.genre)} · ${escape(item.mood)} · ${item.bars} bars · ${escape(item.timeSignature)}</small><p>${escape(item.prompt)}</p></div>`;
    const bar = document.createElement('div');
    bar.className = 'music-mini-actions';
    const btn = (label, fn, disabled = false) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.disabled = disabled; b.onclick = () => Promise.resolve(fn()).catch(context.failure); bar.append(b); };
    btn('Load', () => loadSettings(context, item));
    btn('WAV', () => downloadSaved(context, item.wavArtifactId, 'azrail-music.wav'), !item.wavArtifactId);
    btn('MIDI', () => downloadSaved(context, item.midiArtifactId, 'azrail-music.mid'), !item.midiArtifactId);
    card.append(bar);
    host.append(card);
} }
async function refreshHistory(context) { const host = context.controls.querySelector('#music-history'); if (!host)
    return; try {
    await loadHistory(context);
}
catch (error) {
    (0, panel_state_1.renderPanelError)(host, (0, panel_state_1.errorMessage)(error), () => refreshHistory(context));
    context.failure(error);
} }
exports.studioModule = {
    ...meta,
    async mount(context) {
        current = null;
        if (mediaUrl) {
            URL.revokeObjectURL(mediaUrl);
            mediaUrl = null;
        }
        context.controls.innerHTML = `<div class="music-studio-shell"><section class="music-composer"><p class="muted">AZRAIL Procedural Music Engine · локальный deterministic synthesis. Один Generate — система сама собирает гармонию, паттерн и arrangement в заданных границах.</p><label for="studio-text">Промпт</label><textarea id="studio-text" rows="3" maxlength="4000" placeholder="Dark hypnotic warehouse pulse, restrained tension, late-night energy">Midnight pulse</textarea><div class="music-options"><label>Genre<select id="music-genre"><option value="dark-minimal">Dark Minimal</option><option value="melodic-techno">Melodic Techno</option><option value="ambient">Ambient</option><option value="industrial">Industrial</option><option value="cinematic">Cinematic</option></select></label><label>Mood<select id="music-mood"><option value="hypnotic">Hypnotic</option><option value="driving">Driving</option><option value="dark">Dark</option><option value="euphoric">Euphoric</option><option value="atmospheric">Atmospheric</option></select></label><label>BPM<input id="bpm" type="number" min="60" max="180" placeholder="Auto"></label><label>Key<select id="music-key"><option value="auto">Auto</option><option>C</option><option>C#</option><option>D</option><option>D#</option><option>E</option><option>F</option><option>F#</option><option>G</option><option>G#</option><option>A</option><option>A#</option><option>B</option></select></label><label>Scale<select id="music-scale"><option value="minor">Minor</option><option value="major">Major</option><option value="dorian">Dorian</option><option value="phrygian">Phrygian</option></select></label><label>Bars<input id="bars" type="number" min="1" max="16" value="8"></label><label>Time signature<select id="music-time-signature"><option>4/4</option><option>3/4</option><option>6/8</option></select></label><label>Pattern<select id="music-pattern"><option value="pulse">Pulse</option><option value="arpeggio">Arpeggio</option><option value="bassline">Bassline</option><option value="chords">Chords</option><option value="ambient">Ambient</option></select></label><label>Arrangement<select id="music-arrangement"><option value="intro-build-drop">Intro → Build → Drop</option><option value="minimal-evolution">Minimal Evolution</option><option value="loop">Loop</option></select></label><label>Synth preset<select id="music-synth"><option value="dark-pulse">Dark Pulse</option><option value="warm-pad">Warm Pad</option><option value="glass">Glass</option><option value="sub">Sub</option><option value="acid">Acid</option></select></label><label>Target LUFS<input id="music-target-lufs" type="number" min="-24" max="-6" step="0.5" placeholder="Optional"></label></div><div class="toolbar"><button id="studio-run" class="primary" type="button">Generate</button></div><p class="muted music-engine-note">No fake cloud music model: WAV/MIDI render locally in the browser; Cloudflare is used only for authenticated storage/session metadata when you save.</p></section><section class="music-history"><div class="section-heading"><h3>Sessions</h3><button id="music-refresh-history" type="button">Refresh</button></div><div id="music-history"></div></section></div>`;
        context.controls.querySelector('#music-refresh-history').onclick = () => void refreshHistory(context);
        (0, music_intelligence_panel_1.mountMusicIntelligencePanel)(context);
        context.mountDraft(!!context.account, { scope: context.account?.id ?? 'local', writable: context.account?.role !== 'viewer' });
        await refreshHistory(context);
    },
    async run(context) { const { renderMusicSession } = await Promise.resolve().then(() => __importStar(require('../media'))); const result = await renderMusicSession(input(context)); if (!context.current())
        return; current = result; renderResult(context, result); await analyzeRender(context, result); },
    cleanup() { current = null; (0, music_intelligence_panel_1.cleanupMusicIntelligencePanel)(); if (mediaUrl) {
        URL.revokeObjectURL(mediaUrl);
        mediaUrl = null;
    } }
};

},
"ui/studio-modules/shared":function(module,exports,require){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.inputFile = exports.runButton = void 0;
exports.requiredFile = requiredFile;
exports.fieldValue = fieldValue;
exports.numberValue = numberValue;
exports.exportResult = exportResult;
exports.moduleBase = moduleBase;
exports.runButton = '<div class="toolbar"><button id="studio-run" class="primary" type="button"></button></div>';
const inputFile = (accept) => `<label for="studio-file">Выберите файл</label><input id="studio-file" type="file" accept="${accept}">`;
exports.inputFile = inputFile;
function requiredFile(context) {
    const input = context.controls.querySelector('#studio-file');
    const file = input?.files?.[0];
    if (!file)
        throw Error('Выберите файл.');
    return file;
}
function fieldValue(context, id) { return context.controls.querySelector(`#${id}`)?.value ?? ''; }
function numberValue(context, id) { return Number(fieldValue(context, id)); }
function exportResult(context, blob, name, kind) {
    context.setLastBlob(blob);
    const url = URL.createObjectURL(blob), result = context.result;
    result.replaceChildren();
    const media = document.createElement(kind === 'image' ? 'img' : kind);
    media.setAttribute('src', url);
    context.setMediaCleanup(() => { if (media instanceof HTMLMediaElement)
        media.pause(); media.removeAttribute('src'); URL.revokeObjectURL(url); });
    if (kind === 'image') {
        media.className = 'result-image';
        media.setAttribute('alt', 'Сгенерированное изображение');
    }
    else
        media.setAttribute('controls', '');
    result.append(media);
    const bar = document.createElement('div');
    bar.className = 'toolbar';
    const dl = document.createElement('button');
    dl.textContent = 'Скачать файл';
    dl.onclick = () => { Promise.resolve().then(() => __importStar(require('../media'))).then(m => m.download(blob, name)).catch(context.failure); };
    bar.append(dl);
    if (context.account && context.account.role !== 'viewer') {
        const save = document.createElement('button');
        save.textContent = 'Сохранить в проектах';
        save.onclick = () => {
            if (save.disabled)
                return;
            save.disabled = true;
            context.api('/api/studio/artifacts', { method: 'POST', headers: { 'Content-Type': blob.type, 'X-Filename': encodeURIComponent(name), 'X-Project-Id': context.projectId, 'X-Studio-Id': context.meta.id }, body: blob })
                .then(() => { save.textContent = 'Сохранено'; context.notice('Файл сохранён.'); }).catch(error => { save.disabled = false; context.failure(error); });
        };
        bar.append(save);
    }
    result.append(bar);
}
function moduleBase(meta) { return meta; }

},
"ui/studio-modules/video":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studioModule = void 0;
const studio_manifest_1 = require("../studio-manifest");
const video_studio_2_1 = require("../video-studio-2");
const meta = (0, studio_manifest_1.studioMeta)('video');
exports.studioModule = { ...meta, pendingLabel: 'Рендер WebM…', mount: video_studio_2_1.mountVideoStudio, run: video_studio_2_1.runVideoStudio, cleanup: () => (0, video_studio_2_1.cleanupVideoStudio)() };

},
"ui/studio-modules/web":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studioModule = void 0;
const studio_manifest_1 = require("../studio-manifest");
const web_workbench_1 = require("../web-workbench");
const meta = (0, studio_manifest_1.studioMeta)('web');
let cleanup = () => { };
exports.studioModule = {
    ...meta,
    mount(context) { cleanup(); cleanup = (0, web_workbench_1.mountWebWorkbench)(context); },
    cleanup() { cleanup(); cleanup = () => { }; },
};

},
"ui/studio-registry":function(module,exports,require){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.studioById = exports.studios = void 0;
exports.loadStudioModule = loadStudioModule;
const studio_manifest_1 = require("./studio-manifest");
Object.defineProperty(exports, "studioById", { enumerable: true, get: function () { return studio_manifest_1.studioById; } });
const loaders = {
    web: () => Promise.resolve().then(() => __importStar(require('./studio-modules/web'))),
    image: () => Promise.resolve().then(() => __importStar(require('./studio-modules/image'))),
    music: () => Promise.resolve().then(() => __importStar(require('./studio-modules/music'))),
    video: () => Promise.resolve().then(() => __importStar(require('./studio-modules/video'))),
    audio: () => Promise.resolve().then(() => __importStar(require('./studio-modules/audio'))),
    als: () => Promise.resolve().then(() => __importStar(require('./studio-modules/als'))),
    data: () => Promise.resolve().then(() => __importStar(require('./studio-modules/data'))),
    ledger: () => Promise.resolve().then(() => __importStar(require('./studio-modules/ledger'))),
    lab: () => Promise.resolve().then(() => __importStar(require('./studio-modules/lab'))),
};
exports.studios = studio_manifest_1.studioManifest;
async function loadStudioModule(id) {
    const loaded = await loaders[id]();
    const module = loaded.studioModule;
    const meta = (0, studio_manifest_1.studioById)(id);
    if (!meta || module.id !== id)
        throw new Error(`Studio registry mismatch for ${id}`);
    if (module.title !== meta.title || module.action !== meta.action || module.type !== meta.type)
        throw new Error(`Studio metadata drift for ${id}`);
    return module;
}

},
"ui/studio-reports":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderCSV = renderCSV;
const media_1 = require("./media");
const dom_1 = require("./components/dom");
function table(headers, rows) {
    const wrap = (0, dom_1.makeElement)('div');
    wrap.className = 'table-wrap';
    const t = (0, dom_1.makeElement)('table'), thead = (0, dom_1.makeElement)('thead'), head = (0, dom_1.makeElement)('tr');
    headers.forEach(text => head.append((0, dom_1.makeElement)('th', text)));
    thead.append(head);
    t.append(thead);
    const body = (0, dom_1.makeElement)('tbody');
    rows.forEach(values => { const row = (0, dom_1.makeElement)('tr'); values.forEach(value => row.append((0, dom_1.makeElement)('td', value))); body.append(row); });
    t.append(body);
    wrap.append(t);
    return wrap;
}
function report(host, value, name) {
    const details = (0, dom_1.makeElement)('details');
    details.append((0, dom_1.makeElement)('summary', 'Полный отчёт JSON'), (0, dom_1.makeElement)('pre', JSON.stringify(value, null, 2)));
    host.append(details);
    const button = (0, dom_1.makeElement)('button', 'Скачать отчёт JSON');
    button.onclick = () => (0, media_1.download)(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }), name);
    host.append(button);
}
const number = (value) => typeof value === 'number' && Number.isFinite(value) ? String(Math.round(value * 10000) / 10000) : 'Нет данных';
function renderCSV(host, value) {
    host.replaceChildren((0, dom_1.makeElement)('h2', `${value.rows} строк · ${value.columns.length} столбцов`));
    if (value.raggedRows)
        host.append((0, dom_1.makeElement)('p', `Проверьте ${value.raggedRows} строк: число ячеек отличается от заголовка.`));
    host.append(table(['Столбец', 'Заполнено', 'Числа', 'Минимум', 'Максимум', 'Среднее'], value.columns.map(c => [c.name, String(c.filled), String(c.numeric), number(c.min), number(c.max), number(c.mean)])));
    report(host, value, 'pulse-data-analysis.json');
}

},
"ui/studio-types":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STUDIO_IDS = void 0;
exports.STUDIO_IDS = ['web', 'image', 'music', 'video', 'audio', 'als', 'data', 'ledger', 'lab'];

},
"ui/studios":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studioById = exports.studios = void 0;
// Backward-compatible facade. The canonical Studio manifest and lazy runtime registry
// live in studio-manifest.ts and studio-registry.ts.
var studio_registry_1 = require("./studio-registry");
Object.defineProperty(exports, "studios", { enumerable: true, get: function () { return studio_registry_1.studios; } });
Object.defineProperty(exports, "studioById", { enumerable: true, get: function () { return studio_registry_1.studioById; } });

},
"ui/tool-form":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolForm = toolForm;
/** A convenience editor only. The server validates the complete JSON Schema. */
function toolForm(host, schema) {
    const make = (tag, text = '') => { const e = document.createElement(tag); e.textContent = text; return e; };
    const properties = Object.entries(schema.properties ?? {});
    const simple = properties.length <= 30 && properties.every(([, s]) => s && typeof s === 'object' && !Array.isArray(s) && (['string', 'number', 'integer', 'boolean'].includes(s.type) || Array.isArray(s.enum)));
    const getters = Object.create(null), required = new Set(schema.required ?? []);
    if (simple)
        for (const [name, s] of properties) {
            const label = make('label', (s.title ?? name) + (required.has(name) ? ' *' : ''));
            let input;
            if (Array.isArray(s.enum) || s.type === 'boolean') {
                input = make('select');
                const values = s.enum ?? [true, false];
                if (!required.has(name)) {
                    const empty = make('option', 'Не передавать');
                    empty.value = '';
                    input.append(empty);
                }
                for (const v of values) {
                    const option = make('option', typeof v === 'boolean' ? (v ? 'Да' : 'Нет') : String(v));
                    option.value = JSON.stringify(v);
                    input.append(option);
                }
                getters[name] = () => input.value === '' ? undefined : JSON.parse(input.value);
            }
            else {
                input = make('input');
                input.type = ['number', 'integer'].includes(s.type) ? 'number' : 'text';
                if (s.type === 'integer')
                    input.step = '1';
                else if (s.type === 'number')
                    input.step = 'any';
                if (Number.isFinite(s.minimum))
                    input.min = String(s.minimum);
                if (Number.isFinite(s.maximum))
                    input.max = String(s.maximum);
                getters[name] = () => input.value === '' && !required.has(name) ? undefined : ['number', 'integer'].includes(s.type) ? (input.value === '' ? undefined : Number(input.value)) : input.value;
            }
            input.required = required.has(name);
            input.setAttribute('aria-label', name);
            label.append(input);
            host.append(label);
        }
    const advanced = make('details');
    advanced.open = !simple;
    advanced.append(make('summary', 'Параметры JSON'));
    const enabled = make('input');
    enabled.type = 'checkbox';
    enabled.checked = !simple;
    enabled.disabled = !simple;
    const label = make('label', 'Использовать JSON вместо полей');
    label.prepend(enabled);
    const raw = make('textarea');
    raw.value = '{}';
    raw.rows = 6;
    raw.setAttribute('aria-label', 'Параметры инструмента в JSON');
    advanced.append(label, raw);
    host.append(advanced);
    return () => {
        let value;
        if (enabled.checked) {
            try {
                value = JSON.parse(raw.value);
            }
            catch {
                throw Error('Проверьте синтаксис JSON параметров.');
            }
        }
        else {
            value = Object.fromEntries(Object.entries(getters).map(([k, get]) => [k, get()]).filter(([, v]) => v !== undefined));
            for (const k of required)
                if (!(k in value) || value[k] === '')
                    throw Error(`Заполните обязательное поле: ${k}`);
        }
        if (!value || typeof value !== 'object' || Array.isArray(value))
            throw Error('Параметры должны быть JSON-объектом.');
        return value;
    };
}

},
"ui/video-studio-2":function(module,exports,require){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountVideoStudio = mountVideoStudio;
exports.runVideoStudio = runVideoStudio;
exports.cleanupVideoStudio = cleanupVideoStudio;
const panel_state_1 = require("./components/panel-state");
let previewRaf = 0;
let previewToken = 0;
let previewImages = [];
let currentBlob = null;
let objectUrls = new Set();
let renderJobs = [];
let queueRunning = false;
let queueAbort = null;
const esc = (s) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const q = (root, selector) => root.querySelector(selector);
const qa = (root, selector) => [...root.querySelectorAll(selector)];
const value = (root, id) => q(root, `#${id}`).value;
const num = (root, id) => Number(value(root, id));
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const lerp = (a, b, t) => a + (b - a) * t;
function urlFor(blob) { const u = URL.createObjectURL(blob); objectUrls.add(u); return u; }
function revokeUrls() { for (const u of objectUrls)
    URL.revokeObjectURL(u); objectUrls.clear(); }
function disposePreviewImages() { for (const image of previewImages)
    image.close(); previewImages = []; }
function profileDefaults(profile) {
    if (profile === 'social-9:16')
        return { aspect: '9:16', resolution: '1080p', legacy: 'social' };
    if (profile === 'social-1:1')
        return { aspect: '1:1', resolution: '1080p', legacy: 'social' };
    if (profile === 'presentation-16:9')
        return { aspect: '16:9', resolution: '1080p', legacy: 'presentation' };
    if (profile === 'master-4k')
        return { aspect: '16:9', resolution: '2160p', legacy: 'presentation' };
    return { aspect: '16:9', resolution: '1080p', legacy: 'web' };
}
function outputDims(aspect, resolution, quality) {
    if (quality === 'proxy')
        return aspect === '9:16' ? { w: 360, h: 640 } : aspect === '1:1' ? { w: 480, h: 480 } : { w: 640, h: 360 };
    if (resolution === '2160p')
        return aspect === '9:16' ? { w: 2160, h: 3840 } : aspect === '1:1' ? { w: 2160, h: 2160 } : { w: 3840, h: 2160 };
    if (resolution === '1080p')
        return aspect === '9:16' ? { w: 1080, h: 1920 } : aspect === '1:1' ? { w: 1080, h: 1080 } : { w: 1920, h: 1080 };
    return aspect === '9:16' ? { w: 720, h: 1280 } : aspect === '1:1' ? { w: 720, h: 720 } : { w: 1280, h: 720 };
}
function bitrate(config, quality) { if (quality === 'proxy')
    return 900_000; if (config.resolution === '2160p')
    return 12_000_000; return config.resolution === '1080p' ? 5_500_000 : 3_000_000; }
function defaultKeyframe() { return { zoom: 1, x: 0, y: 0, rotation: 0 }; }
function localShots(prompt, count, transition, camera) {
    const parts = prompt.replace(/\s+/g, ' ').split(/[.!?;]+/).map(v => v.trim()).filter(Boolean);
    return Array.from({ length: count }, (_, i) => ({ id: `shot-${i + 1}`, title: `Shot ${String(i + 1).padStart(2, '0')}`, prompt: (parts[i % Math.max(parts.length, 1)] || prompt || `Shot ${i + 1}`).slice(0, 420), caption: (parts[i % Math.max(parts.length, 1)] || '').slice(0, 180), model: 'auto', camera, transition, transitionDuration: .25, start: defaultKeyframe(), end: { ...defaultKeyframe(), zoom: camera === 'zoom-in' || camera === 'dolly-in' ? 1.12 : camera === 'zoom-out' || camera === 'dolly-out' ? .92 : 1 } }));
}
function continuityFrom(root) { return { character: value(root, 'video-continuity-character').trim(), clothing: value(root, 'video-continuity-clothing').trim(), lighting: value(root, 'video-continuity-lighting').trim(), location: value(root, 'video-continuity-location').trim(), camera: value(root, 'video-continuity-camera').trim(), props: value(root, 'video-continuity-props').trim(), colorPalette: value(root, 'video-continuity-palette').trim() }; }
function gradingFrom(root) { return { brightness: num(root, 'video-grade-brightness'), contrast: num(root, 'video-grade-contrast'), saturation: num(root, 'video-grade-saturation'), hue: num(root, 'video-grade-hue') }; }
function readKeyframe(card, prefix) { return { zoom: Number(q(card, `.video-kf-${prefix}-zoom`).value), x: Number(q(card, `.video-kf-${prefix}-x`).value), y: Number(q(card, `.video-kf-${prefix}-y`).value), rotation: Number(q(card, `.video-kf-${prefix}-rotation`).value) }; }
function readShots(root) { return qa(root, '.video-shot-card').map((card, i) => ({ id: card.dataset.shotId || `shot-${i + 1}`, title: q(card, '.video-shot-title').value.trim().slice(0, 100) || `Shot ${i + 1}`, prompt: q(card, '.video-shot-prompt').value.trim().slice(0, 600) || `Shot ${i + 1}`, caption: q(card, '.video-shot-caption').value.trim().slice(0, 240), model: q(card, '.video-shot-model').value, camera: q(card, '.video-shot-camera').value, transition: q(card, '.video-shot-transition').value, transitionDuration: clamp(Number(q(card, '.video-shot-transition-duration').value), 0, 1.5), start: readKeyframe(card, 'start'), end: readKeyframe(card, 'end') })); }
function currentConfig(context) {
    const root = context.controls;
    const imageFiles = [...(q(root, '#video-images').files ?? [])].slice(0, 12);
    for (const f of imageFiles)
        if (f.size > 16 * 1024 * 1024)
            throw Error('Каждое изображение должно быть ≤16 MB.');
    const referenceVideos = [...(q(root, '#video-reference-videos').files ?? [])].slice(0, 4);
    for (const f of referenceVideos)
        if (f.size > 150 * 1024 * 1024)
            throw Error('Каждое reference video должно быть ≤150 MB.');
    const getAudio = (id) => { const f = q(root, `#${id}`).files?.[0] ?? null; if (f && f.size > 80 * 1024 * 1024)
        throw Error(`${id} должен быть ≤80 MB.`); return f; };
    const shots = readShots(root);
    if (!shots.length)
        throw Error('Storyboard должен содержать минимум один shot.');
    return { title: value(root, 'video-title').trim().slice(0, 120) || 'Untitled Video', prompt: value(root, 'studio-text').trim(), aspectRatio: value(root, 'video-aspect'), resolution: value(root, 'video-resolution'), durationSeconds: num(root, 'video-duration'), fps: num(root, 'video-fps'), exportProfile: value(root, 'video-profile'), legacyExport: value(root, 'video-export'), shots, imageFiles, referenceVideos, voiceFile: getAudio('video-voiceover'), musicFile: getAudio('video-music'), sfxFile: getAudio('video-sfx'), voiceGain: num(root, 'video-voice-gain') / 100, musicGain: num(root, 'video-music-gain') / 100, sfxGain: num(root, 'video-sfx-gain') / 100, captionsEnabled: value(root, 'video-captions') === 'on', continuity: continuityFrom(root), grading: gradingFrom(root) };
}
function suggestionText(shot, continuity) {
    const base = shot.prompt.replace(/\s+/g, ' ').trim();
    return [
        `Preserve continuity${continuity.lighting ? ` with ${continuity.lighting}` : ''}; continue: ${base}`,
        `Tighter composition, same subject identity and palette. ${base}`,
        `Add a clear foreground/background separation without changing character or product identity. ${base}`,
        `Match the previous shot camera language${continuity.camera ? `: ${continuity.camera}` : ''}. ${base}`,
    ];
}
function renderShotList(context, shots) { const host = q(context.controls, '#video-shot-list'); host.innerHTML = shots.map((shot, i) => `<button type="button" data-shot-jump="${esc(shot.id)}"><strong>${String(i + 1).padStart(2, '0')}</strong><span>${esc(shot.title)}</span><small>${esc(shot.camera)} · ${esc(shot.model)}</small></button>`).join(''); for (const btn of qa(host, 'button'))
    btn.onclick = () => context.controls.querySelector(`[data-shot-id="${CSS.escape(btn.dataset.shotJump || '')}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
function renderTimelineBands(context, shots, duration) { const host = q(context.controls, '#video-timeline-bands'), per = duration / shots.length; host.innerHTML = shots.map((shot, i) => `<div class="video-timeline-band" style="--shot-share:${1 / shots.length}"><strong>${String(i + 1).padStart(2, '0')}</strong><span>${esc(shot.title)}</span><small>${(i * per).toFixed(1)}–${((i + 1) * per).toFixed(1)}s</small></div>`).join(''); }
function moveShot(context, id, delta) { const shots = readShots(context.controls), at = shots.findIndex(s => s.id === id), next = at + delta; if (at < 0 || next < 0 || next >= shots.length)
    return; [shots[at], shots[next]] = [shots[next], shots[at]]; renderStoryboard(context, shots); }
function renderStoryboard(context, shots) {
    const host = q(context.controls, '#video-storyboard');
    host.replaceChildren();
    for (let i = 0; i < shots.length; i++) {
        const shot = shots[i], card = document.createElement('article');
        card.className = 'video-shot-card';
        card.dataset.shotId = shot.id;
        card.innerHTML = `<header><div><span>SCENE CARD ${String(i + 1).padStart(2, '0')}</span><input class="video-shot-title" maxlength="100" value="${esc(shot.title)}"></div><div class="video-shot-order"><button type="button" data-move="up" aria-label="Move shot up">↑</button><button type="button" data-move="down" aria-label="Move shot down">↓</button></div></header>
  <label>Shot prompt<textarea class="video-shot-prompt" rows="3" maxlength="600">${esc(shot.prompt)}</textarea></label>
  <div class="video-shot-grid"><label>Shot model<select class="video-shot-model"><option value="auto">AUTO router intent</option><option value="local-canvas">Local Canvas Proxy</option><option disabled>Provider model — Model Registry phase</option></select></label><label>Camera<select class="video-shot-camera"><option>static</option><option>pan</option><option>tilt</option><option>dolly-in</option><option>dolly-out</option><option>zoom-in</option><option>zoom-out</option><option>orbit</option></select></label><label>Transition<select class="video-shot-transition"><option>cut</option><option>fade</option><option>slide</option><option>wipe</option><option>dissolve</option></select></label><label>Transition seconds<input class="video-shot-transition-duration" type="number" min="0" max="1.5" step="0.05" value="${shot.transitionDuration}"></label></div>
  <label>Caption<input class="video-shot-caption" maxlength="240" value="${esc(shot.caption)}"></label>
  <details class="video-keyframes"><summary>Keyframe controls</summary><div class="video-kf-grid"><label>Start zoom<input class="video-kf-start-zoom" type="number" min="0.5" max="2" step="0.05" value="${shot.start.zoom}"></label><label>End zoom<input class="video-kf-end-zoom" type="number" min="0.5" max="2" step="0.05" value="${shot.end.zoom}"></label><label>Start X<input class="video-kf-start-x" type="number" min="-1" max="1" step="0.05" value="${shot.start.x}"></label><label>End X<input class="video-kf-end-x" type="number" min="-1" max="1" step="0.05" value="${shot.end.x}"></label><label>Start Y<input class="video-kf-start-y" type="number" min="-1" max="1" step="0.05" value="${shot.start.y}"></label><label>End Y<input class="video-kf-end-y" type="number" min="-1" max="1" step="0.05" value="${shot.end.y}"></label><label>Start °<input class="video-kf-start-rotation" type="number" min="-45" max="45" step="1" value="${shot.start.rotation}"></label><label>End °<input class="video-kf-end-rotation" type="number" min="-45" max="45" step="1" value="${shot.end.rotation}"></label></div></details>
  <div class="video-shot-suggestions"><span>Подсказки для промпта по каждой сцене</span></div>`;
        q(card, '.video-shot-model').value = shot.model;
        q(card, '.video-shot-camera').value = shot.camera;
        q(card, '.video-shot-transition').value = shot.transition;
        const suggestionHost = q(card, '.video-shot-suggestions'), continuity = continuityFrom(context.controls);
        for (const text of suggestionText(shot, continuity)) {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = text.startsWith('Preserve') ? 'Continuity' : 'Suggest';
            b.title = text;
            b.onclick = () => { const area = q(card, '.video-shot-prompt'); area.value = text.slice(0, 600); area.dispatchEvent(new Event('input', { bubbles: true })); };
            suggestionHost.append(b);
        }
        q(card, '[data-move="up"]').onclick = () => moveShot(context, shot.id, -1);
        q(card, '[data-move="down"]').onclick = () => moveShot(context, shot.id, 1);
        for (const input of qa(card, 'input,textarea,select'))
            input.addEventListener('input', () => { const now = readShots(context.controls); renderShotList(context, now); renderTimelineBands(context, now, num(context.controls, 'video-duration')); });
        host.append(card);
    }
    renderShotList(context, shots);
    renderTimelineBands(context, shots, num(context.controls, 'video-duration'));
}
function renderAssetLibrary(context) { const root = context.controls, host = q(root, '#video-assets'); const groups = [['Images', [...(q(root, '#video-images').files ?? [])]], ['Reference videos', [...(q(root, '#video-reference-videos').files ?? [])]], ['Voice-over', q(root, '#video-voiceover').files ? [...q(root, '#video-voiceover').files] : []], ['Music', q(root, '#video-music').files ? [...q(root, '#video-music').files] : []], ['SFX', q(root, '#video-sfx').files ? [...q(root, '#video-sfx').files] : []]]; host.innerHTML = groups.map(([label, files]) => `<div><strong>${label}</strong><span>${files.length}</span><small>${files.map(f => esc(f.name)).join(' · ') || '—'}</small></div>`).join(''); }
function renderReferenceBoard(context) { const input = q(context.controls, '#video-reference-videos'), host = q(context.controls, '#video-reference-board'); for (const video of qa(host, 'video')) {
    const u = video.src;
    if (u && objectUrls.has(u)) {
        URL.revokeObjectURL(u);
        objectUrls.delete(u);
    }
} host.replaceChildren(); for (const file of [...(input.files ?? [])].slice(0, 4)) {
    const card = document.createElement('article'), u = urlFor(file);
    card.innerHTML = `<video muted controls preload="metadata"></video><strong>${esc(file.name)}</strong><small>${(file.size / 1024 / 1024).toFixed(1)} MB · local reference only</small>`;
    q(card, 'video').src = u;
    host.append(card);
} renderAssetLibrary(context); }
function wrap(ctx, text, maxWidth, maxLines = 4) { const words = text.split(/\s+/), lines = []; let line = ''; for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
        lines.push(line);
        line = word;
    }
    else
        line = next;
} if (line)
    lines.push(line); return lines.slice(0, maxLines); }
function drawCover(ctx, img, w, h, scale, dx, dy, rotation) { const iw = 'width' in img ? Number(img.width) : w, ih = 'height' in img ? Number(img.height) : h, r = Math.max(w / iw, h / ih) * scale, nw = iw * r, nh = ih * r; ctx.save(); ctx.translate(w / 2 + dx, h / 2 + dy); ctx.rotate(rotation * Math.PI / 180); ctx.drawImage(img, -nw / 2, -nh / 2, nw, nh); ctx.restore(); }
function cameraFrame(shot, t, w, h) { let zoom = lerp(shot.start.zoom, shot.end.zoom, t), x = lerp(shot.start.x, shot.end.x, t) * w * .22, y = lerp(shot.start.y, shot.end.y, t) * h * .22, rotation = lerp(shot.start.rotation, shot.end.rotation, t); if (shot.camera === 'pan')
    x += (t - .5) * w * .12; if (shot.camera === 'tilt')
    y += (t - .5) * h * .12; if (shot.camera === 'dolly-in' || shot.camera === 'zoom-in')
    zoom *= 1 + .15 * t; if (shot.camera === 'dolly-out' || shot.camera === 'zoom-out')
    zoom *= 1.15 - .15 * t; if (shot.camera === 'orbit') {
    x += Math.sin(t * Math.PI * 2) * w * .05;
    rotation += Math.sin(t * Math.PI * 2) * 2.5;
} return { zoom, x, y, rotation }; }
function drawFrame(canvas, config, images, time, quality) {
    const { w, h } = outputDims(config.aspectRatio, config.resolution, quality);
    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
    }
    const ctx = canvas.getContext('2d'), count = config.shots.length, per = config.durationSeconds / count, index = Math.min(count - 1, Math.floor(Math.max(0, time) / per)), shot = config.shots[index], local = clamp((time - index * per) / per, 0, 1);
    ctx.save();
    ctx.fillStyle = '#07070a';
    ctx.fillRect(0, 0, w, h);
    ctx.filter = `brightness(${config.grading.brightness}%) contrast(${config.grading.contrast}%) saturate(${config.grading.saturation}%) hue-rotate(${config.grading.hue}deg)`;
    const img = images[index] ?? images[index % Math.max(images.length, 1)];
    if (img) {
        const f = cameraFrame(shot, local, w, h);
        let alpha = 1, tx = 0;
        if ((shot.transition === 'fade' || shot.transition === 'dissolve') && shot.transitionDuration > 0) {
            const ratio = Math.min(.45, shot.transitionDuration / per);
            alpha = Math.min(1, local / Math.max(.01, ratio), (1 - local) / Math.max(.01, ratio));
        }
        if (shot.transition === 'slide' && local < .12)
            tx += (1 - local / .12) * w * .18;
        if (shot.transition === 'wipe' && local < .12) {
            ctx.beginPath();
            ctx.rect(0, 0, w * local / .12, h);
            ctx.clip();
        }
        ctx.globalAlpha = alpha;
        drawCover(ctx, img, w, h, f.zoom, f.x + tx, f.y, f.rotation);
        ctx.globalAlpha = 1;
    }
    else {
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#090812');
        g.addColorStop(.55, '#17101f');
        g.addColorStop(1, '#07070a');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
    }
    ctx.filter = 'none';
    const overlay = ctx.createLinearGradient(0, 0, 0, h);
    overlay.addColorStop(0, 'rgba(3,3,6,.12)');
    overlay.addColorStop(.72, 'rgba(3,3,6,.2)');
    overlay.addColorStop(1, 'rgba(3,3,6,.82)');
    ctx.fillStyle = overlay;
    ctx.fillRect(0, 0, w, h);
    const margin = Math.round(w * .055);
    ctx.textBaseline = 'top';
    ctx.font = `600 ${Math.max(22, Math.round(w * .028))}px Arial,sans-serif`;
    ctx.fillStyle = '#f4eff8';
    const titleLines = wrap(ctx, shot.title || shot.prompt, w - margin * 2, 2);
    let titleY = margin;
    for (const line of titleLines) {
        ctx.fillText(line, margin, titleY, w - margin * 2);
        titleY += Math.max(28, w * .032);
    }
    ctx.font = `500 ${Math.max(13, Math.round(w * .011))}px Arial,sans-serif`;
    ctx.fillStyle = '#bba4cc';
    ctx.fillText(`AZRAIL VIDEO · SHOT ${index + 1}/${count} · ${shot.camera.toUpperCase()}`, margin, margin + Math.max(62, w * .075));
    if (config.captionsEnabled && shot.caption) {
        const capFont = Math.max(18, Math.round(w * .018));
        ctx.font = `600 ${capFont}px Arial,sans-serif`;
        const lines = wrap(ctx, shot.caption, w * .78, 3), boxH = lines.length * capFont * 1.25 + capFont, boxW = Math.min(w * .86, Math.max(...lines.map(line => ctx.measureText(line).width), w * .25) + capFont * 1.6), x = (w - boxW) / 2, y = h - margin - boxH;
        ctx.fillStyle = 'rgba(0,0,0,.72)';
        ctx.fillRect(x, y, boxW, boxH);
        ctx.fillStyle = '#fff';
        let cy = y + capFont * .45;
        for (const line of lines) {
            ctx.fillText(line, x + capFont * .8, cy, boxW - capFont * 1.6);
            cy += capFont * 1.25;
        }
    }
    ctx.restore();
}
async function loadImages(files) { const bitmaps = []; for (const file of files)
    bitmaps.push(await createImageBitmap(file)); return bitmaps; }
function mimeType() { return ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(x => MediaRecorder.isTypeSupported(x)) ?? ''; }
async function connectAudioTrack(context, dest, file, gainValue, sources) { if (!file)
    return; const buffer = await context.decodeAudioData(await file.arrayBuffer()); const source = context.createBufferSource(), gain = context.createGain(); source.buffer = buffer; gain.gain.value = clamp(gainValue, 0, 1.5); source.connect(gain); gain.connect(dest); sources.push(source); }
async function renderVideo(config, canvas, signal, quality) {
    if (!('MediaRecorder' in window) || !canvas.captureStream)
        throw Error('Этот браузер не поддерживает Canvas MediaRecorder.');
    const mime = mimeType();
    if (!mime)
        throw Error('WebM encoding недоступен.');
    const images = await loadImages(config.imageFiles), fps = quality === 'proxy' ? Math.min(15, config.fps) : config.fps, videoStream = canvas.captureStream(fps), recordStream = new MediaStream(videoStream.getVideoTracks()), chunks = [];
    let audioContext = null;
    const sources = [];
    if (config.voiceFile || config.musicFile || config.sfxFile) {
        audioContext = new AudioContext();
        const dest = audioContext.createMediaStreamDestination();
        await connectAudioTrack(audioContext, dest, config.voiceFile, config.voiceGain, sources);
        await connectAudioTrack(audioContext, dest, config.musicFile, config.musicGain, sources);
        await connectAudioTrack(audioContext, dest, config.sfxFile, config.sfxGain, sources);
        for (const track of dest.stream.getAudioTracks())
            recordStream.addTrack(track);
        await audioContext.resume();
    }
    const recorder = new MediaRecorder(recordStream, { mimeType: mime, videoBitsPerSecond: bitrate(config, quality) });
    return new Promise((resolve, reject) => { let raf = 0, settled = false; const start = performance.now(), duration = config.durationSeconds * 1000; const finish = async (error) => { if (settled)
        return; settled = true; cancelAnimationFrame(raf); recordStream.getTracks().forEach(t => t.stop()); videoStream.getTracks().forEach(t => t.stop()); images.forEach(x => x.close()); for (const source of sources)
        try {
            source.stop();
        }
        catch { } if (audioContext)
        await audioContext.close().catch(() => { }); signal.removeEventListener('abort', abort); if (error)
        reject(error);
    else
        resolve(new Blob(chunks, { type: mime })); }; const abort = () => { try {
        if (recorder.state !== 'inactive')
            recorder.stop();
    }
    catch { } void finish(Error('Video render остановлен.')); }; signal.addEventListener('abort', abort, { once: true }); recorder.ondataavailable = e => { if (e.data.size)
        chunks.push(e.data); }; recorder.onerror = () => void finish(Error('MediaRecorder render error.')); recorder.onstop = () => void finish(); recorder.start(250); for (const source of sources)
        try {
            source.start(0);
        }
        catch { } const frame = (now) => { if (signal.aborted)
        return; const elapsed = now - start, seconds = Math.min(config.durationSeconds, elapsed / 1000); drawFrame(canvas, config, images, seconds, quality); if (elapsed >= duration) {
        try {
            recorder.stop();
        }
        catch (error) {
            void finish(error);
        }
        return;
    } raf = requestAnimationFrame(frame); }; raf = requestAnimationFrame(frame); });
}
async function preview(context) { const config = currentConfig(context), canvas = q(context.controls, '#video-preview-canvas'), token = ++previewToken; cancelAnimationFrame(previewRaf); disposePreviewImages(); previewImages = await loadImages(config.imageFiles); const start = performance.now(); const tick = (now) => { if (token !== previewToken)
    return; const t = ((now - start) / 1000) % config.durationSeconds; drawFrame(canvas, config, previewImages, t, 'proxy'); previewRaf = requestAnimationFrame(tick); }; previewRaf = requestAnimationFrame(tick); context.notice('Proxy Preview: low-resolution real-time preview, без provider render.'); }
async function audioPeak(file) { if (!file)
    return null; const ctx = new AudioContext(); try {
    const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
    let peak = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const data = buffer.getChannelData(channel);
        for (let i = 0; i < data.length; i += Math.max(1, Math.floor(data.length / 250000)))
            peak = Math.max(peak, Math.abs(data[i]));
    }
    return peak;
}
finally {
    await ctx.close().catch(() => { });
} }
async function runVideoQA(config) {
    const issues = [];
    const continuityFields = Object.entries(config.continuity).filter(([, v]) => v.trim());
    if (continuityFields.length < 4)
        issues.push({ severity: 'major', code: 'continuity-memory', message: 'Continuity Memory заполнена менее чем наполовину; character/lighting/location/camera drift будет трудно контролировать.' });
    if (config.imageFiles.length && config.imageFiles.length < config.shots.length)
        issues.push({ severity: 'minor', code: 'asset-coverage', message: 'Изображений меньше, чем shots: часть сцен переиспользует визуальный asset.' });
    for (const shot of config.shots) {
        if (config.captionsEnabled && shot.caption.length > 150)
            issues.push({ severity: 'minor', code: 'caption-overlap-risk', message: `${shot.title}: длинная caption может занять больше safe area.` });
        if ((shot.camera === 'orbit' || shot.camera === 'dolly-in' || shot.camera === 'dolly-out') && !config.imageFiles.length)
            issues.push({ severity: 'minor', code: 'camera-without-visual', message: `${shot.title}: camera movement задан без image layer; proxy покажет procedural background.` });
        if (shot.transition === 'cut' && ['orbit', 'dolly-in', 'dolly-out'].includes(shot.camera))
            issues.push({ severity: 'info', code: 'flicker-risk', message: `${shot.title}: hard cut + strong camera movement — проверьте flicker/continuity визуально.` });
    }
    for (const [name, file] of [['voice-over', config.voiceFile], ['music', config.musicFile], ['SFX', config.sfxFile]]) {
        const peak = await audioPeak(file);
        if (peak !== null && peak > .985)
            issues.push({ severity: 'major', code: 'audio-clipping', message: `${name}: measured peak ${peak.toFixed(3)} близок к clipping; снизьте gain.` });
    }
    if (config.resolution === '2160p')
        issues.push({ severity: 'info', code: '4k-browser-load', message: '4K profile активен: локальный MediaRecorder может быть тяжёлым для устройства; сначала проверьте Proxy Preview.' });
    if (!issues.length)
        issues.push({ severity: 'info', code: 'local-qa-clear', message: 'Local deterministic QA не обнаружил критических рисков. Provider-grade frame analysis пока не подключён.' });
    return issues;
}
function renderQA(host, issues) { host.innerHTML = `<div class="video-qa-summary"><strong>Video QA Agent</strong><span>${issues.filter(i => i.severity === 'critical' || i.severity === 'major').length} major/critical</span></div>${issues.map(i => `<article data-severity="${i.severity}"><strong>${esc(i.code)}</strong><span>${esc(i.message)}</span></article>`).join('')}`; }
async function uploadArtifact(context, blob, name) { return context.api('/api/studio/artifacts', { method: 'POST', headers: { 'Content-Type': blob.type || 'video/webm', 'X-Filename': encodeURIComponent(name), 'X-Project-Id': context.projectId ?? '', 'X-Studio-Id': 'video' }, body: blob }); }
async function saveSession(context, config, blob) { if (!context.account)
    throw Error('Войдите, чтобы сохранить Video session.'); context.notice('Сохраняю WebM и timeline metadata…'); const artifact = await uploadArtifact(context, blob, 'azrail-video.webm'); try {
    await context.api('/api/studio/video/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: context.projectId || '', prompt: config.prompt, aspectRatio: config.aspectRatio, resolution: config.resolution, durationSeconds: config.durationSeconds, fps: config.fps, transition: config.shots[0]?.transition ?? 'cut', motionPreset: (config.shots[0]?.camera ?? 'static').replace(/-(in|out)$/, '') || 'static', exportPreset: config.legacyExport, scenes: config.shots.map(s => ({ id: s.id, text: s.prompt, transition: s.transition, motion: s.camera.replace(/-(in|out)$/, '') })), hasAudio: !!(config.voiceFile || config.musicFile || config.sfxFile), imageCount: config.imageFiles.length, videoArtifactId: artifact.id }) });
}
catch (error) {
    context.api(`/api/studio/artifacts/${artifact.id}`, { method: 'DELETE' }).catch(() => { });
    throw error;
} context.notice('Video session сохранена.'); await refreshHistory(context); }
async function saveStoryboard(context) { if (!context.account)
    throw Error('Войдите, чтобы сохранить storyboard.'); if (!context.projectId)
    throw Error('Выберите Project.'); const c = currentConfig(context), payload = { projectId: context.projectId, title: c.title, prompt: c.prompt, aspectRatio: c.aspectRatio, resolution: c.resolution, exportProfile: c.exportProfile, shots: c.shots, continuity: c.continuity, referenceCount: c.referenceVideos.length, tracks: { voiceOver: !!c.voiceFile, music: !!c.musicFile, sfx: !!c.sfxFile }, captions: { enabled: c.captionsEnabled, source: 'scene-script' }, grading: c.grading }; await context.api('/api/studio/video/storyboards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); context.notice('Storyboard сохранён в проекте.'); await refreshStoryboards(context); }
async function loadHistory(context) { const host = q(context.controls, '#video-history-list'); (0, panel_state_1.renderPanelLoading)(host, 'Загружаю Video sessions…'); if (!context.account) {
    host.innerHTML = '<p class="muted">Войдите, чтобы видеть сохранённые Video sessions.</p>';
    return;
} const query = context.projectId ? `?projectId=${encodeURIComponent(context.projectId)}` : ''; const response = await context.api('/api/studio/video/sessions' + query); host.replaceChildren(); if (!response.items.length) {
    host.innerHTML = '<p class="muted">Сохранённых Video sessions пока нет.</p>';
    return;
} for (const item of response.items) {
    const card = document.createElement('article');
    card.className = 'video-session-card';
    card.innerHTML = `<div><strong>${esc(item.aspectRatio)} · ${esc(item.resolution)} · ${item.fps} FPS</strong><small>${item.durationSeconds}s · ${item.scenes.length} shots · ${esc(item.transition)}</small><p>${esc(item.prompt || item.scenes[0]?.text || 'Video session')}</p></div>`;
    const actions = document.createElement('div');
    actions.className = 'video-mini-actions';
    const btn = (label, fn, disabled = false) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.disabled = disabled; b.onclick = () => Promise.resolve(fn()).catch(context.failure); actions.append(b); };
    btn('Download WebM', async () => { if (!item.videoArtifactId)
        return; const blob = await context.blobAPI(`/api/studio/artifacts/${item.videoArtifactId}`); const { download } = await Promise.resolve().then(() => __importStar(require('./media'))); download(blob, 'azrail-video.webm'); }, !item.videoArtifactId);
    card.append(actions);
    host.append(card);
} }
async function refreshHistory(context) { const host = q(context.controls, '#video-history-list'); try {
    await loadHistory(context);
}
catch (error) {
    (0, panel_state_1.renderPanelError)(host, (0, panel_state_1.errorMessage)(error), () => refreshHistory(context));
    context.failure(error);
} }
function applyStoryboard(context, item) { const root = context.controls; q(root, '#video-title').value = item.title; q(root, '#studio-text').value = item.prompt; q(root, '#video-aspect').value = item.aspectRatio; q(root, '#video-resolution').value = item.resolution; q(root, '#video-profile').value = item.exportProfile; const pairs = [['video-continuity-character', item.continuity.character], ['video-continuity-clothing', item.continuity.clothing], ['video-continuity-lighting', item.continuity.lighting], ['video-continuity-location', item.continuity.location], ['video-continuity-camera', item.continuity.camera], ['video-continuity-props', item.continuity.props], ['video-continuity-palette', item.continuity.colorPalette]]; for (const [id, v] of pairs)
    q(root, `#${id}`).value = v; q(root, '#video-grade-brightness').value = String(item.grading.brightness); q(root, '#video-grade-contrast').value = String(item.grading.contrast); q(root, '#video-grade-saturation').value = String(item.grading.saturation); q(root, '#video-grade-hue').value = String(item.grading.hue); q(root, '#video-captions').value = item.captions.enabled ? 'on' : 'off'; q(root, '#video-scenes').value = String(item.shots.length); renderStoryboard(context, item.shots); }
async function loadStoryboards(context) { const host = q(context.controls, '#video-storyboard-history'); if (!context.account || !context.projectId) {
    host.innerHTML = '<p class="muted">Выберите Project и войдите, чтобы видеть Storyboards.</p>';
    return;
} const response = await context.api(`/api/studio/video/storyboards?projectId=${encodeURIComponent(context.projectId)}`); host.replaceChildren(); if (!response.items.length) {
    host.innerHTML = '<p class="muted">Сохранённых Storyboards пока нет.</p>';
    return;
} for (const item of response.items) {
    const card = document.createElement('article');
    card.className = 'video-session-card';
    card.innerHTML = `<strong>${esc(item.title)}</strong><small>${item.shots.length} shots · ${esc(item.exportProfile)} · ${esc(item.resolution)}</small><p>${esc(item.prompt)}</p>`;
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'Load Storyboard';
    b.onclick = () => applyStoryboard(context, item);
    card.append(b);
    host.append(card);
} }
async function refreshStoryboards(context) { const host = q(context.controls, '#video-storyboard-history'); try {
    await loadStoryboards(context);
}
catch (error) {
    (0, panel_state_1.renderPanelError)(host, (0, panel_state_1.errorMessage)(error), () => refreshStoryboards(context));
    context.failure(error);
} }
async function buildStoryboard(context) { const root = context.controls, prompt = value(root, 'studio-text').trim(), count = clamp(num(root, 'video-scenes'), 1, 12), transition = value(root, 'video-transition'), camera = value(root, 'video-motion'); let shots; if (context.account) {
    const response = await context.api('/api/studio/video/plan', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ prompt, sceneCount: Math.min(8, count), transition: transition === 'wipe' || transition === 'dissolve' ? 'fade' : transition, motion: ['dolly-in', 'dolly-out', 'zoom-in', 'zoom-out', 'orbit', 'tilt'].includes(camera) ? 'pan' : camera }) });
    shots = response.scenes.map((scene, i) => ({ ...localShots(scene.text, 1, transition, camera)[0], id: `shot-${i + 1}`, title: `Shot ${String(i + 1).padStart(2, '0')}`, prompt: scene.text, caption: scene.text }));
    if (count > shots.length)
        shots.push(...localShots(prompt, count - shots.length, transition, camera).map((s, i) => ({ ...s, id: `shot-${shots.length + i + 1}`, title: `Shot ${String(shots.length + i + 1).padStart(2, '0')}` })));
}
else {
    shots = localShots(prompt, count, transition, camera);
    context.notice('Local Storyboard Builder: войдите для AI-assisted scene planning.');
} renderStoryboard(context, shots); }
function renderQueue(context) { const host = q(context.controls, '#video-render-queue'); host.innerHTML = renderJobs.length ? renderJobs.map(job => `<article><strong>${esc(job.label)}</strong><span data-status="${job.status}">${job.status}</span>${job.error ? `<small>${esc(job.error)}</small>` : ''}</article>`).join('') : '<p class="muted">Render Queue пуста.</p>'; }
async function executeJob(context, job, config, signal) { job.status = 'running'; renderQueue(context); const canvas = q(context.controls, '#video-preview-canvas'); try {
    const qaIssues = await runVideoQA(config);
    renderQA(q(context.controls, '#video-qa-results'), qaIssues);
    const blob = await renderVideo(config, canvas, signal, job.quality);
    job.blob = blob;
    job.status = 'done';
    if (job.quality === 'final')
        resultView(context, config, blob, qaIssues, 'FINAL');
    else
        resultView(context, config, blob, qaIssues, 'PROXY');
}
catch (error) {
    job.status = signal.aborted ? 'cancelled' : 'failed';
    job.error = (0, panel_state_1.errorMessage)(error);
    throw error;
}
finally {
    renderQueue(context);
} }
async function queueProxy(context) { const job = { id: crypto.randomUUID(), quality: 'proxy', status: 'waiting', label: `Proxy ${new Date().toLocaleTimeString()}` }; renderJobs.push(job); renderQueue(context); if (queueRunning)
    return; queueRunning = true; queueAbort = new AbortController(); try {
    for (const item of renderJobs.filter(j => j.status === 'waiting')) {
        if (queueAbort.signal.aborted)
            break;
        await executeJob(context, item, currentConfig(context), queueAbort.signal).catch(context.failure);
    }
}
finally {
    queueRunning = false;
    queueAbort = null;
    renderQueue(context);
} }
function cancelQueue(context) { queueAbort?.abort(); for (const job of renderJobs)
    if (job.status === 'waiting')
        job.status = 'cancelled'; renderQueue(context); }
function resultView(context, config, blob, issues, label) { currentBlob = blob; context.setLastBlob(blob); const u = urlFor(blob); context.result.innerHTML = `<div class="video-result-head"><div><small>${label} EXPORT</small><strong>${esc(config.aspectRatio)} · ${esc(config.resolution)} · ${config.fps} FPS · ${config.durationSeconds}s</strong></div><div><small>STORYBOARD</small><strong>${config.shots.length} shots · ${esc(config.exportProfile)}</strong></div></div><video id="video-result-player" controls playsinline></video><div class="video-result-qa">${issues.map(i => `<span data-severity="${i.severity}">${esc(i.code)}</span>`).join('')}</div><div id="video-result-actions" class="toolbar"></div>`; q(context.result, '#video-result-player').src = u; const actions = q(context.result, '#video-result-actions'); const btn = (text, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.onclick = () => Promise.resolve(fn()).catch(context.failure); actions.append(b); }; btn('Download WebM', () => Promise.resolve().then(() => __importStar(require('./media'))).then(m => m.download(blob, label === 'PROXY' ? 'azrail-proxy.webm' : 'azrail-video.webm'))); if (label === 'FINAL' && context.account && context.account.role !== 'viewer')
    btn('Save session', () => saveSession(context, config, blob)); }
function updateProfile(context) { const root = context.controls, d = profileDefaults(value(root, 'video-profile')); q(root, '#video-aspect').value = d.aspect; q(root, '#video-resolution').value = d.resolution; q(root, '#video-export').value = d.legacy; }
function bindFileEvents(context) { for (const id of ['video-images', 'video-reference-videos', 'video-voiceover', 'video-music', 'video-sfx'])
    q(context.controls, `#${id}`).addEventListener('change', () => { renderAssetLibrary(context); if (id === 'video-reference-videos')
        renderReferenceBoard(context); }); }
async function mountVideoStudio(context) {
    currentBlob = null;
    previewToken++;
    cancelAnimationFrame(previewRaf);
    disposePreviewImages();
    revokeUrls();
    renderJobs = [];
    queueRunning = false;
    queueAbort?.abort();
    queueAbort = null;
    context.controls.innerHTML = `<div class="video2-shell">
<section class="video2-main"><div class="video2-intro"><div><span>SERIES F · F41–F60</span><h3>Video Studio 2.0</h3><p>Storyboard → shots → timeline → audio/captions → grading → Render Queue → QA → export. Provider video generation remains fail-closed until the approved Model Registry phase.</p></div><div class="video2-badges"><span>LOCAL RENDER</span><span>NO HIDDEN DEPLOY</span></div></div>
<div class="video2-project"><label>Project title<input id="video-title" maxlength="120" value="AZRAIL Visual Story"></label><label>Creative brief<textarea id="studio-text" rows="3" maxlength="2000">Dark minimal pulse moving through an abstract city at night.</textarea></label></div>
<div class="video-options"><label>Export Profile<select id="video-profile"><option value="web-16:9">Web · 16:9</option><option value="social-9:16">Social · 9:16</option><option value="social-1:1">Social · 1:1</option><option value="presentation-16:9">Presentation · 16:9</option><option value="master-4k">4K Master · 16:9</option></select></label><label>Aspect ratio<select id="video-aspect"><option>16:9</option><option>9:16</option><option>1:1</option></select></label><label>Resolution<select id="video-resolution"><option>720p</option><option selected>1080p</option><option>2160p</option></select></label><label>Duration<select id="video-duration"><option value="4">4 s</option><option value="8" selected>8 s</option><option value="12">12 s</option></select></label><label>FPS<select id="video-fps"><option>24</option><option>30</option></select></label><label>Shots<input id="video-scenes" type="number" min="1" max="12" value="4"></label><label>Default transition<select id="video-transition"><option value="fade">fade</option><option value="cut">cut</option><option value="slide">slide</option><option value="wipe">wipe</option><option value="dissolve">dissolve</option></select></label><label>Default camera<select id="video-motion"><option>static</option><option>pan</option><option>tilt</option><option>dolly-in</option><option>dolly-out</option><option>zoom-in</option><option>zoom-out</option><option>orbit</option></select></label></div><input id="video-export" type="hidden" value="web">
<div class="toolbar"><button id="video-build-scenes" type="button">Build Storyboard</button><button id="video-save-storyboard" type="button">Save Storyboard</button><button id="video-preview" type="button">Proxy Preview</button><button id="video-queue-proxy" type="button">Queue Proxy</button><button id="studio-run" class="primary" type="button">Render Final</button></div>
<section class="video2-story"><div class="section-heading"><div><span>F41 / F42 / F44</span><h3>Project Storyboard · Shot List · Scene Cards</h3></div><small>Reorder shots, refine prompts, choose shot-level routing intent.</small></div><div class="video2-story-grid"><aside id="video-shot-list" class="video-shot-list"></aside><div id="video-storyboard" class="video-storyboard"></div></div></section>
<section class="video2-timeline"><div class="section-heading"><div><span>F43</span><h3>Timeline Editor</h3></div><small>Equal-duration bounded timeline for local render.</small></div><div id="video-timeline-bands" class="video-timeline-bands"></div></section>
<section class="video2-assets"><div class="section-heading"><div><span>F45 / F46</span><h3>Asset Library · Reference Video Board</h3></div><small>Reference videos stay local in this RC.</small></div><div class="video-media-inputs"><label>Image assets<input id="video-images" type="file" accept="image/png,image/jpeg,image/webp" multiple></label><label>Reference videos<input id="video-reference-videos" type="file" accept="video/*" multiple></label><label>Voice-over track<input id="video-voiceover" type="file" accept="audio/*"></label><label>Music track<input id="video-music" type="file" accept="audio/*"></label><label>SFX track<input id="video-sfx" type="file" accept="audio/*"></label></div><div id="video-assets" class="video-asset-library"></div><div id="video-reference-board" class="video-reference-board"></div></section>
<section class="video2-continuity"><div class="section-heading"><div><span>CONTINUITY MEMORY</span><h3>Character / Visual Consistency</h3></div><small>Shared memory between scenes.</small></div><div class="video-continuity-grid"><label>Character<input id="video-continuity-character" maxlength="300"></label><label>Clothing<input id="video-continuity-clothing" maxlength="300"></label><label>Lighting<input id="video-continuity-lighting" maxlength="300"></label><label>Location<input id="video-continuity-location" maxlength="300"></label><label>Camera language<input id="video-continuity-camera" maxlength="300"></label><label>Props<input id="video-continuity-props" maxlength="300"></label><label>Color palette<input id="video-continuity-palette" maxlength="300"></label></div></section>
<section class="video2-audio"><div class="section-heading"><div><span>F53–F16</span><h3>Voice-over · Music / SFX · Captions · Color Grading</h3></div></div><div class="video-audio-grid"><label>Voice gain<input id="video-voice-gain" type="range" min="0" max="120" value="92"><output>92%</output></label><label>Music gain<input id="video-music-gain" type="range" min="0" max="120" value="55"><output>55%</output></label><label>SFX gain<input id="video-sfx-gain" type="range" min="0" max="120" value="70"><output>70%</output></label><label>Automatic subtitles/captions<select id="video-captions"><option value="on">On · from scene script</option><option value="off">Off</option></select></label></div><div class="video-grade-grid"><label>Brightness<input id="video-grade-brightness" type="range" min="50" max="150" value="100"></label><label>Contrast<input id="video-grade-contrast" type="range" min="50" max="150" value="100"></label><label>Saturation<input id="video-grade-saturation" type="range" min="0" max="200" value="100"></label><label>Hue<input id="video-grade-hue" type="range" min="-180" max="180" value="0"></label></div></section>
<section class="video2-render"><div class="section-heading"><div><span>F57 / F58 / F59 / F60</span><h3>Render Queue · Proxy Preview · Video QA Agent · Export Profiles</h3></div><div class="toolbar"><button id="video-run-qa" type="button">Run QA</button><button id="video-cancel-queue" type="button">Cancel Queue</button></div></div><div class="video-preview-frame"><canvas id="video-preview-canvas" aria-label="Video Proxy Preview"></canvas></div><div class="video2-bottom-grid"><div><h4>Render Queue</h4><div id="video-render-queue" class="video-render-queue"></div></div><div><h4>QA</h4><div id="video-qa-results" class="video-qa-results"><p class="muted">Run QA before final export.</p></div></div></div><p class="muted video-engine-note">Proxy/final WebM use bounded Canvas + MediaRecorder. 4K is an explicit profile, never auto-selected. Provider-grade generation, Stream delivery, frame extraction and model-based QA are intentionally not claimed until their bindings/providers are approved.</p></section>
</section>
<aside class="video2-side"><section><div class="section-heading"><h3>Storyboards</h3><button id="video-refresh-storyboards" type="button">Refresh</button></div><div id="video-storyboard-history"></div></section><section><div class="section-heading"><h3>Rendered Sessions</h3><button id="video-refresh-history" type="button">Refresh</button></div><div id="video-history-list"></div></section></aside></div>`;
    const initial = localShots(value(context.controls, 'studio-text'), 4, 'fade', 'static');
    renderStoryboard(context, initial);
    renderAssetLibrary(context);
    renderQueue(context);
    bindFileEvents(context);
    q(context.controls, '#video-profile').onchange = () => updateProfile(context);
    q(context.controls, '#video-build-scenes').onclick = () => buildStoryboard(context).catch(context.failure);
    q(context.controls, '#video-save-storyboard').onclick = () => saveStoryboard(context).catch(context.failure);
    q(context.controls, '#video-preview').onclick = () => preview(context).catch(context.failure);
    q(context.controls, '#video-queue-proxy').onclick = () => queueProxy(context).catch(context.failure);
    q(context.controls, '#video-cancel-queue').onclick = () => cancelQueue(context);
    q(context.controls, '#video-run-qa').onclick = () => runVideoQA(currentConfig(context)).then(issues => renderQA(q(context.controls, '#video-qa-results'), issues)).catch(context.failure);
    q(context.controls, '#video-refresh-history').onclick = () => void refreshHistory(context);
    q(context.controls, '#video-refresh-storyboards').onclick = () => void refreshStoryboards(context);
    q(context.controls, '#video-scenes').onchange = () => renderStoryboard(context, localShots(value(context.controls, 'studio-text'), clamp(num(context.controls, 'video-scenes'), 1, 12), value(context.controls, 'video-transition'), value(context.controls, 'video-motion')));
    q(context.controls, '#video-duration').onchange = () => renderTimelineBands(context, readShots(context.controls), num(context.controls, 'video-duration'));
    for (const id of ['video-voice-gain', 'video-music-gain', 'video-sfx-gain'])
        q(context.controls, `#${id}`).oninput = e => { const input = e.currentTarget; const out = input.parentElement?.querySelector('output'); if (out)
            out.textContent = `${input.value}%`; };
    context.mountDraft(!!context.account, { scope: context.account?.id ?? 'local', writable: context.account?.role !== 'viewer' });
    await Promise.all([refreshHistory(context), refreshStoryboards(context)]);
}
async function runVideoStudio(context) { const config = currentConfig(context), job = { id: crypto.randomUUID(), quality: 'final', status: 'waiting', label: `Final ${config.exportProfile}` }; renderJobs.push(job); renderQueue(context); context.notice(`Rendering ${config.durationSeconds}s · ${config.resolution} · ${config.fps} FPS…`); await executeJob(context, job, config, context.signal); }
function cleanupVideoStudio() { previewToken++; cancelAnimationFrame(previewRaf); disposePreviewImages(); queueAbort?.abort(); queueAbort = null; queueRunning = false; renderJobs = []; revokeUrls(); currentBlob = null; }

},
"ui/web-workbench":function(module,exports,require){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountWebWorkbench = mountWebWorkbench;
const tabs = ['files', 'preview', 'layers', 'changes', 'tests', 'logs', 'versions'];
const labels = { files: 'Files', preview: 'Preview', layers: 'Layers', changes: 'Changes', tests: 'Tests', logs: 'Logs', versions: 'Versions' };
const $q = (root, selector) => root.querySelector(selector);
const bytes = (n) => n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
const when = (n) => { const t = typeof n === 'string' ? Date.parse(n) : n; return Number.isFinite(t) ? new Date(t).toLocaleString() : '—'; };
const escapeHtml = (value) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function codeTokens(value, language) {
    const safe = value.replace(/[&<>]/g, c => c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;');
    if (language === 'json')
        return safe.replace(/(&quot;[^&]*?&quot;|"(?:\\.|[^"\\])*")(?=\s*:)/g, '<span class="syn-key">$1</span>').replace(/\b(true|false|null|\d+(?:\.\d+)?)\b/g, '<span class="syn-lit">$1</span>');
    if (['javascript', 'typescript'].includes(language))
        return safe.replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, '<span class="syn-comment">$1</span>').replace(/\b(const|let|var|function|class|interface|type|import|export|from|return|if|else|for|while|async|await|new|throw|try|catch|extends|implements)\b/g, '<span class="syn-key">$1</span>').replace(/(&quot;.*?&quot;|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/g, '<span class="syn-string">$1</span>');
    if (language === 'css')
        return safe.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="syn-comment">$1</span>').replace(/([.#]?[a-zA-Z][\w-]*)(?=\s*\{)/g, '<span class="syn-key">$1</span>').replace(/([\w-]+)(?=\s*:)/g, '<span class="syn-prop">$1</span>');
    if (['html', 'xml'].includes(language))
        return safe.replace(/(&lt;\/?)([\w:-]+)/g, '$1<span class="syn-key">$2</span>').replace(/([\w:-]+)=(&quot;.*?&quot;|".*?")/g, '<span class="syn-prop">$1</span>=<span class="syn-string">$2</span>');
    return safe;
}
function lineDiff(before, after) {
    const a = before.split('\n'), b = after.split('\n');
    let start = 0;
    while (start < a.length && start < b.length && a[start] === b[start])
        start++;
    let ae = a.length - 1, be = b.length - 1;
    while (ae >= start && be >= start && a[ae] === b[be]) {
        ae--;
        be--;
    }
    const out = [];
    for (let i = Math.max(0, start - 2); i < start; i++)
        out.push(`  ${a[i]}`);
    for (let i = start; i <= ae; i++)
        out.push(`- ${a[i]}`);
    for (let i = start; i <= be; i++)
        out.push(`+ ${b[i]}`);
    for (let i = ae + 1; i < Math.min(a.length, ae + 3); i++)
        if (i >= 0)
            out.push(`  ${a[i]}`);
    return out.join('\n') || 'Нет различий.';
}
function resolveLocal(base, ref) {
    if (/^(?:[a-z]+:|\/\/|#|data:|blob:)/i.test(ref))
        return null;
    try {
        const u = new URL(ref, `https://azrail.local/${base}`);
        return decodeURIComponent(u.pathname.replace(/^\//, ''));
    }
    catch {
        return null;
    }
}
function mountWebWorkbench(context) {
    let overview = null, current = null, activeTab = 'files', selectedSnapshot = '', previewUrl = '', closed = false, componentCache = null;
    const projectId = () => context.currentProjectId?.() || context.projectId;
    const openDialog = (title, html) => context.dialog?.(title, html) ?? null;
    const closeDialog = () => context.closeDialog?.();
    context.controls.innerHTML = '<div class="web-studio-intro"><div><span class="workbench-kicker">PROFESSIONAL WORKBENCH</span><strong>Промпт → workspace → проверка → версия → publish</strong></div><span id="web-runtime" class="runtime-chip">Не подключено</span></div>';
    context.controls.append(context.composer, context.missionPanel);
    context.result.innerHTML = `<div class="web-workbench">
  <div class="web-workbench-bar"><div><strong id="web-project-name">Web Studio</strong><span id="web-head" class="muted"></span></div><div class="toolbar"><button id="web-refresh" type="button">Обновить</button><button id="web-export" type="button">Скачать ZIP</button></div></div>
  <div class="web-tabs" role="tablist">${tabs.map(t => `<button type="button" data-web-tab="${t}" role="tab">${labels[t]}</button>`).join('')}</div>
  <section data-web-panel="files" class="web-panel"></section><section data-web-panel="preview" class="web-panel" hidden></section><section data-web-panel="layers" class="web-panel" hidden></section><section data-web-panel="changes" class="web-panel" hidden></section><section data-web-panel="tests" class="web-panel" hidden></section><section data-web-panel="logs" class="web-panel" hidden></section><section data-web-panel="versions" class="web-panel" hidden></section>
 </div>`;
    const root = context.result;
    function setRuntime() { const el = $q(context.controls, '#web-runtime'), pid = projectId(); if (!pid) {
        el.textContent = 'Новый проект';
        el.dataset.state = 'idle';
        return;
    } const status = overview?.mission?.status ?? 'workspace'; el.textContent = status === 'workspace' ? 'Workspace готов' : status.replaceAll('_', ' '); el.dataset.state = ['failed', 'unverified'].includes(status) ? 'warn' : ['executing', 'planning', 'queued', 'verifying'].includes(status) ? 'live' : 'ok'; }
    function setTab(tab) { activeTab = tab; root.querySelectorAll('[data-web-tab]').forEach(b => { const on = b.dataset.webTab === tab; b.classList.toggle('active', on); b.setAttribute('aria-selected', String(on)); }); root.querySelectorAll('[data-web-panel]').forEach(p => p.hidden = p.dataset.webPanel !== tab); void renderTab(); }
    async function load() { const pid = projectId(); if (!pid) {
        overview = null;
        root.querySelectorAll('.web-panel').forEach(p => p.innerHTML = '<div class="workbench-empty"><strong>Откройте или создайте проект.</strong><span>Запустите миссию выше — Web Studio привяжется к project workspace.</span></div>');
        setRuntime();
        return;
    } overview = await context.api(`/api/projects/${encodeURIComponent(pid)}/workbench`); selectedSnapshot = selectedSnapshot || overview.snapshots[0]?.id || ''; $q(root, '#web-head').textContent = `${overview.files.length} файлов · ${overview.publication ? bytes(overview.publication.total_bytes) : 'legacy workspace'}${overview.truncated ? ' · список ограничен' : ''}`; setRuntime(); await renderTab(); }
    async function openFile(path) { const pid = projectId(); if (!pid)
        return; current = await context.api(`/api/projects/${encodeURIComponent(pid)}/workbench/file?path=${encodeURIComponent(path)}`); if (activeTab === 'files')
        renderFiles(); }
    async function mutate(body) { const pid = projectId(); if (!pid)
        throw Error('Сначала откройте проект.'); const response = await context.api(`/api/projects/${encodeURIComponent(pid)}/workbench/files`, { method: 'POST', body: JSON.stringify(body) }); await load(); return response; }
    async function approvalMutation(path) { const pid = projectId(); if (!pid)
        return; try {
        await mutate({ action: 'delete', path });
        context.notice(`Файл ${path} удалён в новой ревизии.`);
        current = null;
        return;
    }
    catch (error) {
        const e = error, approval = e.body?.approval;
        if (e.status !== 409 || !approval)
            throw error;
        if (context.account?.role !== 'admin') {
            context.notice(`Удаление ожидает approval ${approval.id.slice(0, 8)}. Подтвердить его может администратор.`, true);
            return;
        }
        await context.api(`/api/approvals/${encodeURIComponent(approval.id)}/decision`, { method: 'POST', body: JSON.stringify({ decision: 'approved', payloadDigest: approval.payload_digest, reason: `Web Studio: delete ${path}` }) });
        await mutate({ action: 'delete', path, approvalId: approval.id });
        context.notice(`Файл ${path} удалён с approval и сохранён как новая ревизия.`);
        current = null;
    } }
    function renderFiles() {
        const panel = $q(root, '[data-web-panel="files"]');
        if (!overview) {
            panel.textContent = 'Загрузка…';
            return;
        }
        const files = overview.files, selected = current?.path ?? '';
        panel.innerHTML = `<div class="web-files-layout"><aside class="web-file-tree"><div class="web-file-actions"><input id="web-file-search" type="search" placeholder="Файл или текст"><button id="web-content-search" type="button">Искать текст</button><button id="web-file-new" type="button">+ Файл</button></div><div id="web-file-list" class="web-file-list"></div></aside><div id="web-editor" class="web-editor"></div></div>`;
        const list = $q(panel, '#web-file-list');
        const draw = (filter = '') => { list.replaceChildren(); const q = filter.toLowerCase(); for (const f of files.filter(f => !q || f.path.toLowerCase().includes(q))) {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'web-file-row';
            b.dataset.active = String(f.path === selected);
            const path = document.createElement('span');
            const depth = Math.min(6, (f.path.match(/\//g) || []).length);
            path.style.paddingLeft = `${depth * 12}px`;
            path.textContent = (depth ? '↳ ' : '') + f.path;
            const size = document.createElement('small');
            size.textContent = bytes(f.size);
            b.append(path, size);
            b.onclick = () => openFile(f.path).catch(context.failure);
            list.append(b);
        } if (!list.childElementCount)
            list.innerHTML = '<p class="muted">Файлы не найдены.</p>'; };
        draw();
        $q(panel, '#web-file-search').oninput = e => draw(e.currentTarget.value);
        $q(panel, '#web-content-search').onclick = async () => { const input = $q(panel, '#web-file-search'), q = input.value.trim(); if (!q)
            return context.notice('Введите текст для поиска.'); const pid = projectId(), r = await context.api(`/api/projects/${encodeURIComponent(pid)}/workbench/search?q=${encodeURIComponent(q)}`); const hits = new Set(r.matches.map(x => x.path)); list.replaceChildren(); for (const f of files.filter(f => hits.has(f.path))) {
            const b = document.createElement('button');
            b.className = 'web-file-row';
            const name = document.createElement('span');
            name.textContent = f.path;
            const size = document.createElement('small');
            size.textContent = bytes(f.size);
            b.append(name, size);
            b.onclick = () => openFile(f.path).catch(context.failure);
            list.append(b);
        } if (!list.childElementCount)
            list.innerHTML = '<p class="muted">Совпадений в просмотренной части workspace нет.</p>'; context.notice(`Поиск: ${r.matches.length} совпадений · просмотрено ${r.scanned}${r.scannedAll ? '' : ' · результат может быть неполным'}.`); };
        $q(panel, '#web-file-new').onclick = () => { const editor = $q(panel, '#web-editor'); editor.innerHTML = '<label>Путь нового файла<input id="web-new-path" placeholder="src/page.ts"></label><label>Содержимое<textarea id="web-new-content" rows="16" spellcheck="false"></textarea></label><button id="web-new-save" class="primary">Создать в новой ревизии</button>'; $q(editor, '#web-new-save').onclick = () => mutate({ action: 'create', path: $q(editor, '#web-new-path').value, content: $q(editor, '#web-new-content').value }).then(() => context.notice('Файл создан.')).catch(context.failure); };
        const editor = $q(panel, '#web-editor');
        if (!current) {
            editor.innerHTML = '<div class="workbench-empty"><strong>Выберите файл.</strong><span>Открытие не меняет workspace. Сохранение всегда создаёт новую immutable revision.</span></div>';
            return;
        }
        editor.innerHTML = `<div class="web-editor-head"><div><strong id="web-open-path"></strong><span class="muted">${current.language} · ${bytes(current.size)}</span></div><div class="toolbar"><button id="web-rename">Переименовать</button><button id="web-delete" class="danger-button">Удалить</button></div></div><div class="web-code-stack"><textarea id="web-code" spellcheck="false"></textarea><pre id="web-highlight" aria-hidden="true"></pre></div><div class="web-editor-save"><span id="web-dirty" class="muted">Без изменений</span><button id="web-save" class="primary" disabled>Применить в новую ревизию</button></div>`;
        $q(editor, '#web-open-path').textContent = current.path;
        const area = $q(editor, '#web-code'), highlight = $q(editor, '#web-highlight'), save = $q(editor, '#web-save'), dirty = $q(editor, '#web-dirty');
        area.value = current.content;
        highlight.innerHTML = codeTokens(current.content, current.language) + '\n';
        const sync = () => { highlight.innerHTML = codeTokens(area.value, current.language) + '\n'; highlight.scrollTop = area.scrollTop; highlight.scrollLeft = area.scrollLeft; const changed = area.value !== current.content; save.disabled = !changed; dirty.textContent = changed ? 'Есть несохранённые изменения' : 'Без изменений'; };
        area.oninput = sync;
        area.onscroll = sync;
        save.onclick = () => { save.disabled = true; mutate({ action: 'update', path: current.path, content: area.value, expectedSha256: current.sha256 }).then(async () => { context.notice('Изменения опубликованы как новая workspace revision.'); await openFile(current.path); }).catch(context.failure).finally(() => { save.disabled = false; }); };
        $q(editor, '#web-rename').onclick = () => { const root = openDialog('Переместить или переименовать файл', '<p class="muted">Изменение пути создаст новую immutable workspace revision.</p><label for="web-rename-path">Новый путь</label><input id="web-rename-path" maxlength="500"><button id="web-rename-apply" class="primary">Применить</button>'); if (!root)
            return; const input = $q(root, '#web-rename-path'); input.value = current.path; input.select(); $q(root, '#web-rename-apply').onclick = () => { const next = input.value.trim(); if (!next || next === current.path)
            return; mutate({ action: 'rename', path: current.path, targetPath: next }).then(async () => { closeDialog(); context.notice('Файл перемещён в новую ревизию.'); current = null; await openFile(next); }).catch(context.failure); }; };
        $q(editor, '#web-delete').onclick = () => { const root = openDialog('Удалить файл', '<p>Удаление не перезаписывает старую ревизию, но требует Unified Approval.</p><p><code id="web-delete-path"></code></p><label for="web-delete-confirm">Введите DELETE</label><input id="web-delete-confirm" autocomplete="off"><button id="web-delete-apply" class="danger-button" disabled>Запросить удаление</button>'); if (!root)
            return; $q(root, '#web-delete-path').textContent = current.path; const input = $q(root, '#web-delete-confirm'), button = $q(root, '#web-delete-apply'); input.oninput = () => button.disabled = input.value !== 'DELETE'; button.onclick = () => { button.disabled = true; approvalMutation(current.path).then(() => closeDialog()).catch(context.failure).finally(() => button.disabled = false); }; input.focus(); };
    }
    async function loadComponents() { if (componentCache)
        return componentCache; const pid = projectId(); if (!pid)
        return []; const result = await context.api(`/api/projects/${encodeURIComponent(pid)}/workbench/components`); componentCache = result.items ?? []; return componentCache; }
    async function openSourceAt(path, line = 1) { await openFile(path); setTab('files'); setTimeout(() => { const area = $q(root, '#web-code'); if (!area)
        return; const lines = area.value.split('\n'); let offset = 0; for (let i = 0; i < Math.max(0, line - 1) && i < lines.length; i++)
        offset += lines[i].length + 1; area.focus(); area.setSelectionRange(offset, Math.min(area.value.length, offset + (lines[line - 1]?.length ?? 0))); const lh = 19; area.scrollTop = Math.max(0, (line - 4) * lh); }, 0); }
    async function buildPreview() {
        const panel = $q(root, '[data-web-panel="preview"]'), pid = projectId();
        if (!overview || !pid)
            return;
        const htmlFile = overview.files.find(f => /(^|\/)index\.html$/i.test(f.path)) ?? overview.files.find(f => /\.html?$/i.test(f.path));
        if (!htmlFile) {
            panel.innerHTML = '<div class="workbench-empty"><strong>HTML entrypoint не найден.</strong><span>Добавьте index.html или другой HTML-файл.</span></div>';
            return;
        }
        let html = (await context.api(`/api/projects/${encodeURIComponent(pid)}/workbench/file?path=${encodeURIComponent(htmlFile.path)}`)).content;
        const cssLinks = [...html.matchAll(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi)];
        for (const m of cssLinks) {
            if (!/rel=["']?stylesheet/i.test(m[0]))
                continue;
            const path = resolveLocal(htmlFile.path, m[1]);
            if (!path)
                continue;
            try {
                const css = (await context.api(`/api/projects/${encodeURIComponent(pid)}/workbench/file?path=${encodeURIComponent(path)}`)).content;
                html = html.replace(m[0], `<style data-azrail-source="${path.replaceAll('"', '&quot;')}">${css}</style>`);
            }
            catch { }
        }
        const scripts = [...html.matchAll(/<script\b([^>]*)src=["']([^"']+)["']([^>]*)><\/script>/gi)];
        for (const m of scripts) {
            const path = resolveLocal(htmlFile.path, m[2]);
            if (!path)
                continue;
            try {
                const js = (await context.api(`/api/projects/${encodeURIComponent(pid)}/workbench/file?path=${encodeURIComponent(path)}`)).content.replace(/<\/script/gi, '<\\/script');
                html = html.replace(m[0], `<script data-azrail-source="${path.replaceAll('"', '&quot;')}">${js}<\/script>`);
            }
            catch { }
        }
        const bridge = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline';"><script>(()=>{const state={inspect:false,selected:null,consoleErrors:[],csp:[]};const send=(type,payload={})=>parent.postMessage({type,...payload},'*');const path=(el)=>{if(el.id)return '#'+CSS.escape(el.id);const parts=[];let cur=el;while(cur&&cur.nodeType===1&&parts.length<6){let part=cur.tagName.toLowerCase();if(cur.classList.length)part+='.'+[...cur.classList].slice(0,2).map(v=>CSS.escape(v)).join('.');const parentEl=cur.parentElement;if(parentEl){const same=[...parentEl.children].filter(x=>x.tagName===cur.tagName);if(same.length>1)part+=':nth-of-type('+(same.indexOf(cur)+1)+')';}parts.unshift(part);cur=parentEl;if(cur===document.body){parts.unshift('body');break;}}return parts.join(' > ');};const attrs=(el)=>{const out={};for(const name of ['id','class','role','aria-label','aria-labelledby','data-component','data-testid']){const v=el.getAttribute(name);if(v)out[name]=v.slice(0,300);}return out;};const visible=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&Number(s.opacity)!==0;};const rgb=v=>{const m=String(v).match(/rgba?\\((\\d+)[ ,]+(\\d+)[ ,]+(\\d+)/);return m?[+m[1],+m[2],+m[3]]:null;};const lum=c=>{const q=c.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*q[0]+.7152*q[1]+.0722*q[2];};const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};const add=(arr,severity,code,message,selector)=>arr.push({severity,code,message,selector});const runQa=()=>{const findings=[];if(document.documentElement.scrollWidth>innerWidth+2)add(findings,'major','horizontal-overflow','Страница шире viewport.', 'html');const ids=new Map();document.querySelectorAll('[id]').forEach(el=>{const id=el.id;if(!id)return;ids.set(id,(ids.get(id)||0)+1);});ids.forEach((count,id)=>{if(count>1)add(findings,'major','duplicate-id','Дублирующийся id: '+id,'#'+id);});document.querySelectorAll('input,select,textarea').forEach(el=>{const t=(el.getAttribute('type')||'').toLowerCase();if(['hidden','button','submit','reset'].includes(t))return;const named=(el.labels&&el.labels.length)||el.getAttribute('aria-label')||el.getAttribute('aria-labelledby');if(!named)add(findings,'major','form-label','Поле формы без label/aria-label.',path(el));});document.querySelectorAll('img').forEach(el=>{if(!el.hasAttribute('alt'))add(findings,'major','image-alt','Изображение без alt.',path(el));});document.querySelectorAll('button,a[href],[role="button"]').forEach(el=>{if(!visible(el))return;const name=(el.getAttribute('aria-label')||el.textContent||'').trim();if(!name)add(findings,'major','accessible-name','Интерактивный элемент без доступного имени.',path(el));const r=el.getBoundingClientRect();if(r.width<44||r.height<44)add(findings,'minor','touch-target','Touch target меньше 44px.',path(el));});let last=0;document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(el=>{if(!visible(el))return;const n=Number(el.tagName.slice(1));if(last&&n>last+1)add(findings,'minor','heading-order','Пропущен уровень заголовка перед '+el.tagName,path(el));last=n;});let sampled=0;document.querySelectorAll('p,span,label,button,a,h1,h2,h3,h4,h5,h6,li').forEach(el=>{if(sampled>=220||!visible(el)||(el.textContent||'').trim().length<2)return;const cs=getComputedStyle(el),fg=rgb(cs.color);let bg=rgb(cs.backgroundColor),cur=el.parentElement;while(!bg&&cur){bg=rgb(getComputedStyle(cur).backgroundColor);cur=cur.parentElement;}if(fg&&bg){sampled++;if(ratio(fg,bg)<4.5)add(findings,'major','contrast','Контраст текста ниже 4.5:1.',path(el));}});for(const msg of state.consoleErrors.slice(-20))add(findings,'critical','console-error',msg);for(const msg of state.csp.slice(-20))add(findings,'major','blocked-request',msg);const counts={critical:findings.filter(x=>x.severity==='critical').length,major:findings.filter(x=>x.severity==='major').length,minor:findings.filter(x=>x.severity==='minor').length};const score=Math.max(0,100-counts.critical*25-counts.major*8-counts.minor*2);send('azrail-browser-qa-result',{report:{viewport:innerWidth,score,counts,findings:findings.slice(0,300)}});};for(const level of ['log','warn','error']){const old=console[level];console[level]=(...a)=>{const args=a.map(v=>{try{return typeof v==='string'?v:JSON.stringify(v)}catch{return String(v)}});if(level==='error')state.consoleErrors.push(args.join(' ').slice(0,1000));send('azrail-preview-log',{level,args});old.apply(console,a)}}addEventListener('error',e=>state.consoleErrors.push(String(e.message||'runtime error').slice(0,1000)));addEventListener('unhandledrejection',e=>state.consoleErrors.push(String(e.reason||'unhandled rejection').slice(0,1000)));addEventListener('securitypolicyviolation',e=>state.csp.push(('Blocked '+(e.blockedURI||e.violatedDirective||'request')).slice(0,1000)));addEventListener('message',e=>{if(e.data?.type==='azrail-inspect-mode'){state.inspect=!!e.data.enabled;if(!state.inspect&&state.selected)state.selected.style.outline='';}if(e.data?.type==='azrail-run-browser-qa')runQa();if(e.data?.type==='azrail-preview-layer'){const el=document.querySelector(e.data.selector);if(el){if(e.data.action==='hide')el.toggleAttribute('hidden');if(e.data.action==='lock')el.toggleAttribute('data-azrail-preview-locked');}}});document.addEventListener('click',e=>{if(!state.inspect)return;const el=e.target instanceof Element?e.target:null;if(!el)return;e.preventDefault();e.stopPropagation();if(state.selected&&state.selected!==el)state.selected.style.outline='';state.selected=el;el.style.outline='2px solid #a78bfa';const rect=el.getBoundingClientRect();send('azrail-inspect-selection',{selection:{selector:path(el),tag:el.tagName.toLowerCase(),id:el.id||'',classes:[...el.classList].slice(0,12),text:(el.textContent||'').trim().slice(0,240),attrs:attrs(el),rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height}}});},true);})();<\/script>`;
        html = html.includes('<head') ? html.replace(/<head([^>]*)>/i, `<head$1>${bridge}`) : bridge + html;
        panel.innerHTML = `<div class="web-preview-toolbar"><div class="segmented web-breakpoints" role="group" aria-label="Responsive viewport"><button data-width="1440" class="active">1440</button><button data-width="1024">1024</button><button data-width="768">768</button><button data-width="390">390</button></div><div class="toolbar"><button id="web-preview-inspect">Inspect</button><button id="web-browser-qa" class="primary">Run Browser QA</button><button id="web-preview-refresh">Refresh</button><button id="web-preview-open">Open standalone</button></div></div><div class="web-preview-meta"><span id="web-preview-size">1440px responsive canvas</span><span>Static preview · network denied by CSP</span></div><div class="web-preview-stage" style="--preview-width:1440px"><iframe id="web-preview-frame" sandbox="allow-scripts allow-forms allow-modals" title="Web Studio preview"></iframe></div><div class="web-inspector-grid"><section id="web-inspector-panel" class="web-inspector-panel"><div class="section-heading"><strong>Visual ↔ Code Inspector</strong><span class="muted">Нажмите Inspect и выберите элемент.</span></div><div id="web-inspector-body" class="workbench-empty compact"><span>Элемент не выбран.</span></div></section><section id="web-browser-qa-report" class="web-qa-report"><div class="section-heading"><strong>Browser QA</strong><span class="muted">Результат ещё не запускался.</span></div></section></div><div class="web-console"><div class="section-heading"><strong>Console</strong><button id="web-console-clear" class="text-button">Очистить</button></div><pre id="web-console-output">Static preview · network disabled by CSP\n</pre></div>`;
        const frame = $q(panel, '#web-preview-frame'), stage = $q(panel, '.web-preview-stage'), consoleOut = $q(panel, '#web-console-output'), inspectButton = $q(panel, '#web-preview-inspect'), qaReport = $q(panel, '#web-browser-qa-report');
        frame.srcdoc = html;
        let inspect = false;
        const listener = async (event) => { if (event.source !== frame.contentWindow)
            return; if (event.data?.type === 'azrail-preview-log') {
            consoleOut.textContent += `[${event.data.level}] ${(event.data.args ?? []).join(' ')}\n`;
            return;
        } if (event.data?.type === 'azrail-inspect-selection') {
            const raw = event.data.selection ?? {}, selector = String(raw.selector ?? ''), items = await loadComponents().catch(() => []), mapped = items.find(item => item.path === htmlFile.path && item.selector === selector) || items.find(item => item.path === htmlFile.path && raw.id && item.selector === `#${raw.id}`);
            const selection = { selector, tag: String(raw.tag ?? ''), id: String(raw.id ?? ''), classes: Array.isArray(raw.classes) ? raw.classes.map(String) : [], text: String(raw.text ?? ''), sourcePath: mapped?.path ?? htmlFile.path, line: mapped?.line, attrs: raw.attrs && typeof raw.attrs === 'object' ? raw.attrs : {} };
            renderInspector(selection);
            return;
        } if (event.data?.type === 'azrail-browser-qa-result') {
            const report = event.data.report;
            renderQa(report);
            try {
                await context.api(`/api/projects/${encodeURIComponent(pid)}/workbench/browser-qa`, { method: 'POST', body: JSON.stringify(report) });
            }
            catch (error) {
                context.failure(error);
            }
            return;
        } };
        window.addEventListener('message', listener);
        context.setMediaCleanup(() => { window.removeEventListener('message', listener); if (previewUrl)
            URL.revokeObjectURL(previewUrl); previewUrl = ''; });
        const renderInspector = (selection) => { const body = $q(panel, '#web-inspector-body'); body.className = 'web-inspector-body'; body.replaceChildren(); const meta = document.createElement('div'); meta.className = 'web-inspector-meta'; const title = document.createElement('strong'); title.textContent = `<${selection.tag}> ${selection.selector}`; const source = document.createElement('code'); source.textContent = `${selection.sourcePath}${selection.line ? `:${selection.line}` : ''}`; const text = document.createElement('small'); text.textContent = selection.text || 'Без текстового содержимого'; meta.append(title, source, text); const input = document.createElement('textarea'); input.id = 'web-inspector-command'; input.rows = 3; input.placeholder = 'Например: сделай эту карточку компактнее и сохрани адаптивность'; const actions = document.createElement('div'); actions.className = 'toolbar'; const open = document.createElement('button'); open.textContent = 'Open source'; open.onclick = () => openSourceAt(selection.sourcePath, selection.line ?? 1).catch(context.failure); const edit = document.createElement('button'); edit.className = 'primary'; edit.textContent = 'Edit with AZRAIL'; edit.disabled = !context.startMission || context.account?.role === 'viewer'; edit.onclick = () => { const command = input.value.trim(); if (!command)
            return context.notice('Введите инструкцию для выбранного элемента.', true); const attrs = Object.entries(selection.attrs).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', '); context.startMission?.(`Web Studio Visual→Code edit. Изменяй только исходный проект и не делай deploy/push. Выбранный элемент: ${selection.selector}; source: ${selection.sourcePath}${selection.line ? `:${selection.line}` : ''}; attrs: ${attrs || 'none'}. Требование пользователя: ${command}. Сохрани design contract, responsive 390/768/1024/1440, loading/error/empty states и клавиатурную доступность. После правки запусти безопасные локальные проверки.`).catch(context.failure); }; actions.append(open, edit); body.append(meta, input, actions); };
        const renderQa = (report) => { qaReport.replaceChildren(); const head = document.createElement('div'); head.className = 'web-qa-score'; const score = document.createElement('strong'); score.textContent = `${report.score}/100`; const meta = document.createElement('span'); meta.textContent = `${report.viewport}px · Critical ${report.counts.critical} · Major ${report.counts.major} · Minor ${report.counts.minor}`; head.append(score, meta); const list = document.createElement('div'); list.className = 'web-qa-findings'; for (const finding of report.findings.slice(0, 80)) {
            const row = document.createElement('div');
            row.className = `web-qa-finding severity-${finding.severity}`;
            const label = document.createElement('strong');
            label.textContent = finding.severity.toUpperCase();
            const message = document.createElement('span');
            message.textContent = finding.message;
            const sel = document.createElement('code');
            sel.textContent = finding.selector ?? finding.code;
            row.append(label, message, sel);
            list.append(row);
        } if (!report.findings.length) {
            const ok = document.createElement('div');
            ok.className = 'web-qa-clean';
            ok.textContent = 'DOM checks не нашли проблем в этом статическом preview.';
            list.append(ok);
        } qaReport.append(head, list); };
        panel.querySelectorAll('[data-width]').forEach(b => b.onclick = () => { panel.querySelectorAll('[data-width]').forEach(x => x.classList.toggle('active', x === b)); const width = Number(b.dataset.width || 1440); stage.style.setProperty('--preview-width', `${width}px`); $q(panel, '#web-preview-size').textContent = `${width}px responsive canvas`; });
        inspectButton.onclick = () => { inspect = !inspect; inspectButton.classList.toggle('active', inspect); inspectButton.textContent = inspect ? 'Inspect: ON' : 'Inspect'; frame.contentWindow?.postMessage({ type: 'azrail-inspect-mode', enabled: inspect }, '*'); };
        $q(panel, '#web-browser-qa').onclick = () => frame.contentWindow?.postMessage({ type: 'azrail-run-browser-qa' }, '*');
        $q(panel, '#web-preview-refresh').onclick = () => buildPreview().catch(context.failure);
        $q(panel, '#web-console-clear').onclick = () => consoleOut.textContent = '';
        $q(panel, '#web-preview-open').onclick = () => { if (previewUrl)
            URL.revokeObjectURL(previewUrl); previewUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' })); window.open(previewUrl, '_blank', 'noopener,noreferrer'); };
    }
    async function renderLayers() { const panel = $q(root, '[data-web-panel="layers"]'), items = await loadComponents(); panel.innerHTML = '<div class="web-layer-head"><div><strong>Source-aware component tree</strong><p class="muted">Компоненты определяются из исходников. Open source ведёт к реальному файлу/строке; AI Edit изменяет source через миссию, а не рисует новый HTML поверх проекта.</p></div><button id="web-layers-refresh">Rescan</button></div><div id="web-layer-list" class="web-layer-list"></div>'; const list = $q(panel, '#web-layer-list'), groups = new Map(); for (const item of items) {
        const arr = groups.get(item.path) ?? [];
        arr.push(item);
        groups.set(item.path, arr);
    } for (const [path, rows] of groups) {
        const group = document.createElement('section');
        group.className = 'web-layer-group';
        const heading = document.createElement('div');
        heading.className = 'web-layer-file';
        const name = document.createElement('strong');
        name.textContent = path;
        const count = document.createElement('span');
        count.textContent = `${rows.length} components`;
        heading.append(name, count);
        group.append(heading);
        for (const item of rows) {
            const row = document.createElement('div');
            row.className = 'web-layer-row';
            const meta = document.createElement('div');
            const title = document.createElement('strong');
            title.textContent = item.name;
            const detail = document.createElement('code');
            detail.textContent = `${item.kind} · line ${item.line}${item.selector ? ` · ${item.selector}` : ''}`;
            meta.append(title, detail);
            const actions = document.createElement('div');
            actions.className = 'toolbar';
            const open = document.createElement('button');
            open.textContent = 'Open';
            open.onclick = () => openSourceAt(item.path, item.line).catch(context.failure);
            const edit = document.createElement('button');
            edit.textContent = 'AI Edit';
            edit.disabled = !context.startMission || context.account?.role === 'viewer';
            edit.onclick = () => context.startMission?.(`Web Studio component edit. Source ${item.path}:${item.line}, component ${item.name} (${item.kind})${item.selector ? `, selector ${item.selector}` : ''}. Сначала изучи соседние компоненты и design contract. Запроси у пользователя конкретную правку, если она не указана в текущем контексте. Не делай deploy/push.`).catch(context.failure);
            actions.append(open, edit);
            row.append(meta, actions);
            group.append(row);
        }
        list.append(group);
    } if (!items.length)
        list.innerHTML = '<div class="workbench-empty"><strong>Компоненты не обнаружены.</strong><span>Поддерживается source scan для React/TSX и HTML id/data-component.</span></div>'; $q(panel, '#web-layers-refresh').onclick = () => { componentCache = null; renderLayers().catch(context.failure); }; }
    async function renderChanges() {
        const panel = $q(root, '[data-web-panel="changes"]');
        if (!overview?.snapshots.length) {
            panel.innerHTML = '<div class="workbench-empty"><strong>Нет snapshot для сравнения.</strong><span>Создайте snapshot во вкладке Versions.</span></div>';
            return;
        }
        panel.innerHTML = `<div class="web-change-toolbar"><label>База сравнения<select id="web-change-snapshot">${overview.snapshots.map(s => `<option value="${s.id}">${escapeHtml(s.label)}</option>`).join('')}</select></label><button id="web-compare-refresh">Сравнить</button></div><div class="web-change-layout"><div id="web-change-list" class="web-change-list"></div><div id="web-change-detail" class="web-change-detail"><div class="workbench-empty"><span>Выберите изменённый файл.</span></div></div></div>`;
        const select = $q(panel, '#web-change-snapshot');
        select.value = selectedSnapshot || overview.snapshots[0].id;
        const loadCompare = async () => { selectedSnapshot = select.value; const pid = projectId(), r = await context.api(`/api/projects/${encodeURIComponent(pid)}/workbench/compare?snapshotId=${encodeURIComponent(selectedSnapshot)}`); const list = $q(panel, '#web-change-list'); list.replaceChildren(); if (!r.changes.length) {
            list.innerHTML = '<p class="muted">Нет изменений относительно snapshot.</p>';
            return;
        } for (const ch of r.changes) {
            const b = document.createElement('button');
            b.className = 'web-change-row';
            b.innerHTML = `<span class="change-${ch.status}">${ch.status.toUpperCase()}</span><code></code>`;
            $q(b, 'code').textContent = ch.path;
            b.onclick = () => showDetail(ch.path);
            list.append(b);
        } };
        const showDetail = async (path) => { const pid = projectId(), r = await context.api(`/api/projects/${encodeURIComponent(pid)}/workbench/compare?snapshotId=${encodeURIComponent(selectedSnapshot)}&path=${encodeURIComponent(path)}`), detail = $q(panel, '#web-change-detail'); if (!r.detail)
            return; detail.replaceChildren(); const head = document.createElement('div'); head.className = 'web-editor-head'; const title = document.createElement('strong'); title.textContent = path; const revert = document.createElement('button'); revert.textContent = 'Revert file → new revision'; revert.disabled = context.account?.role === 'viewer'; revert.onclick = () => context.api(`/api/projects/${encodeURIComponent(pid)}/workbench/revert-file`, { method: 'POST', body: JSON.stringify({ snapshotId: selectedSnapshot, path }) }).then(async () => { context.notice('Файл восстановлен в новой workspace revision.'); await load(); }).catch(context.failure); head.append(title, revert); const pre = document.createElement('pre'); pre.className = 'web-diff'; pre.textContent = lineDiff(r.detail.before, r.detail.after); detail.append(head, pre); };
        $q(panel, '#web-compare-refresh').onclick = () => loadCompare().catch(context.failure);
        select.onchange = () => loadCompare().catch(context.failure);
        await loadCompare();
    }
    function renderTests() { const panel = $q(root, '[data-web-panel="tests"]'), checks = ['unit', 'integration', 'typecheck', 'lint', 'build', 'security'], events = overview?.events ?? []; panel.innerHTML = '<div class="web-test-head"><div><strong>Quality checks</strong><p class="muted">Результаты берутся из Unified Event Stream. Web Studio не придумывает PASS без события проверки.</p></div><button id="web-run-qa" class="primary">Run AZRAIL QA</button></div><div id="web-test-grid" class="web-test-grid"></div>'; const grid = $q(panel, '#web-test-grid'); for (const check of checks) {
        const related = [...events].reverse().find(e => e.type.toLowerCase().includes(check) || e.type.toLowerCase().includes(`check.${check}`));
        const card = document.createElement('div');
        card.className = 'web-test-card';
        const state = related ? (related.type.includes('failed') ? 'FAILED' : related.type.includes('passed') || related.type.includes('completed') ? 'PASSED' : 'RECORDED') : 'NOT RUN';
        card.innerHTML = `<span>${check}</span><strong data-state="${state.toLowerCase().replace(' ', '-')}">${state}</strong><small>${related ? when(related.created_at) : 'Нет подтверждённого события'}</small>`;
        grid.append(card);
    } const run = $q(panel, '#web-run-qa'); run.disabled = !context.startMission || context.account?.role === 'viewer'; run.onclick = () => context.startMission?.('Проверь текущий Web Studio проект. Запусти unit, integration, typecheck, lint, build и security checks. Исправляй только безопасные локальные ошибки. Не делай deploy, push, PR или другие внешние изменения.').catch(context.failure); }
    function renderLogs() { const panel = $q(root, '[data-web-panel="logs"]'), events = overview?.events ?? []; panel.innerHTML = '<div class="web-log-toolbar"><label>Поток<select id="web-log-filter"><option value="all">Все</option><option value="agent">Agent</option><option value="tool">Tool</option><option value="build">Build</option><option value="runtime">Runtime</option><option value="provider">Provider</option><option value="connector">Connector</option></select></label></div><div id="web-log-list" class="web-log-list"></div>'; const select = $q(panel, '#web-log-filter'), list = $q(panel, '#web-log-list'); const draw = () => { list.replaceChildren(); const f = select.value; const rows = events.filter(e => f === 'all' || e.domain === f || e.type.toLowerCase().includes(f)); for (const e of rows.slice(-100).reverse()) {
        const row = document.createElement('div');
        row.className = 'web-log-row';
        const seq = document.createElement('code');
        seq.textContent = `#${e.seq}`;
        const type = document.createElement('span');
        type.textContent = e.type;
        const meta = document.createElement('small');
        meta.textContent = `${e.domain} · ${e.actor ?? 'system'} · ${when(e.created_at)}`;
        row.append(seq, type, meta);
        list.append(row);
    } if (!list.childElementCount)
        list.innerHTML = '<p class="muted">Для этого фильтра событий нет.</p>'; }; select.onchange = draw; draw(); }
    async function restoreSnapshot(snapshot) { const pid = projectId(); if (!pid)
        return; try {
        await context.api(`/api/projects/${encodeURIComponent(pid)}/workbench/restore`, { method: 'POST', body: JSON.stringify({ snapshotId: snapshot.id }) });
        context.notice('Snapshot восстановлен в новую workspace revision.');
        await load();
    }
    catch (error) {
        const e = error, approval = e.body?.approval;
        if (e.status !== 409 || !approval)
            throw error;
        if (context.account?.role !== 'admin') {
            context.notice(`Restore ожидает approval ${approval.id.slice(0, 8)}.`, true);
            return;
        }
        await context.api(`/api/approvals/${encodeURIComponent(approval.id)}/decision`, { method: 'POST', body: JSON.stringify({ decision: 'approved', payloadDigest: approval.payload_digest, reason: `Web Studio restore ${snapshot.label}` }) });
        await context.api(`/api/projects/${encodeURIComponent(pid)}/workbench/restore`, { method: 'POST', body: JSON.stringify({ snapshotId: snapshot.id, approvalId: approval.id }) });
        context.notice('Snapshot восстановлен в новую workspace revision.');
        await load();
    } }
    function renderVersions() {
        const panel = $q(root, '[data-web-panel="versions"]');
        if (!overview)
            return;
        panel.innerHTML = '<div class="web-version-head"><div><strong>Immutable workspace snapshots</strong><p class="muted">Snapshot хранит ссылку на immutable publication. Restore всегда создаёт новую revision и не уничтожает текущую историю.</p></div><div class="toolbar"><button id="web-snapshot-create" class="primary">Create snapshot</button><button id="web-version-export">Download ZIP</button></div></div><div id="web-snapshot-list" class="web-snapshot-list"></div>';
        const list = $q(panel, '#web-snapshot-list');
        for (const s of overview.snapshots) {
            const row = document.createElement('div');
            row.className = 'web-snapshot-row';
            const body = document.createElement('div');
            const title = document.createElement('strong');
            title.textContent = s.label;
            const meta = document.createElement('small');
            meta.textContent = `${when(s.createdAt)} · ${s.manifestHash.slice(0, 12)}`;
            body.append(title, meta);
            const actions = document.createElement('div');
            actions.className = 'toolbar';
            const compare = document.createElement('button');
            compare.textContent = 'Compare';
            compare.onclick = () => { selectedSnapshot = s.id; setTab('changes'); };
            const restore = document.createElement('button');
            restore.textContent = 'Restore → new revision';
            restore.disabled = context.account?.role === 'viewer';
            restore.onclick = () => restoreSnapshot(s).catch(context.failure);
            actions.append(compare, restore);
            row.append(body, actions);
            list.append(row);
        }
        if (!overview.snapshots.length)
            list.innerHTML = '<p class="muted">Snapshot ещё не создан.</p>';
        $q(panel, '#web-snapshot-create').onclick = () => { const root = openDialog('Создать workspace snapshot', '<p class="muted">Snapshot указывает на текущую immutable publication и не копирует R2 повторно.</p><label for="web-snapshot-label">Название</label><input id="web-snapshot-label" maxlength="120"><button id="web-snapshot-apply" class="primary">Создать snapshot</button>'); if (!root)
            return; const input = $q(root, '#web-snapshot-label'); input.value = `Checkpoint ${new Date().toLocaleString()}`; input.select(); $q(root, '#web-snapshot-apply').onclick = () => { const label = input.value.trim(); if (!label)
            return; context.api(`/api/projects/${encodeURIComponent(projectId())}/workbench/snapshots`, { method: 'POST', body: JSON.stringify({ label }) }).then(async () => { closeDialog(); context.notice('Snapshot создан без копирования R2: сохранена immutable publication reference.'); await load(); }).catch(context.failure); }; };
        $q(panel, '#web-version-export').onclick = () => context.blobAPI(`/api/studio/project-zip?projectId=${encodeURIComponent(projectId())}`).then(async (blob) => (await Promise.resolve().then(() => __importStar(require('./media')))).download(blob, 'azrail-web-project.zip')).catch(context.failure);
    }
    async function renderTab() { if (closed)
        return; if (activeTab === 'files')
        renderFiles();
    else if (activeTab === 'preview')
        await buildPreview();
    else if (activeTab === 'layers')
        await renderLayers();
    else if (activeTab === 'changes')
        await renderChanges();
    else if (activeTab === 'tests')
        renderTests();
    else if (activeTab === 'logs')
        renderLogs();
    else
        renderVersions(); }
    root.querySelectorAll('[data-web-tab]').forEach(b => b.onclick = () => setTab(b.dataset.webTab));
    $q(root, '#web-refresh').onclick = () => load().catch(context.failure);
    $q(root, '#web-export').onclick = () => { const pid = projectId(); if (!pid)
        return context.failure(Error('Откройте проект.')); context.blobAPI(`/api/studio/project-zip?projectId=${encodeURIComponent(pid)}`).then(async (blob) => (await Promise.resolve().then(() => __importStar(require('./media')))).download(blob, 'azrail-web-project.zip')).catch(context.failure); };
    context.mountDraft(false, { scope: `${context.account?.id ?? 'local'}:${projectId() || 'new'}`, preferCurrent: true });
    setTab('files');
    void load().catch(context.failure);
    return () => { closed = true; if (previewUrl)
        URL.revokeObjectURL(previewUrl); previewUrl = ''; };
}

}};const cache={};const norm=p=>{const parts=[];for(const x of p.split('/')){if(!x||x==='.')continue;if(x==='..')parts.pop();else parts.push(x);}return parts.join('/');};function load(id){id=id.replace(/\.js$/,'');if(cache[id])return cache[id].exports;const factory=modules[id];if(!factory)throw new Error('AZRAIL fallback bundle: missing module '+id);const module={exports:{}};cache[id]=module;const base=id.includes('/')?id.slice(0,id.lastIndexOf('/')):'';const req=request=>load(request.startsWith('.')?norm(base+'/'+request):request);factory(module,module.exports,req);return module.exports;}load('ui/app');})();
