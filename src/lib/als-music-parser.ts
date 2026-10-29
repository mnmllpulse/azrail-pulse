/** Music-role classification for Ableton track names, plus the Melodic House & Techno arrangement reference. */

const ROLE_KEYWORDS: ReadonlyArray<readonly [string, string]> = [
  ['bassdrum', 'rhythm/kick'],
  ['downlifter', 'fx/downlifter'],
  ['percussion', 'rhythm/percussion'],
  ['tambourine', 'rhythm/percussion'],
  ['atmosphere', 'atmosphere/texture'],
  ['transition', 'fx/transition'],
  ['subbass', 'bass/sub'],
  ['sequence', 'melodic/arp'],
  ['hi hat', 'rhythm/hihat'],
  ['hihat', 'rhythm/hihat'],
  ['rimshot', 'rhythm/snare'],
  ['shaker', 'rhythm/percussion'],
  ['cymbal', 'rhythm/hihat'],
  ['conga', 'rhythm/percussion'],
  ['bongo', 'rhythm/percussion'],
  ['texture', 'atmosphere/texture'],
  ['downlift', 'fx/downlifter'],
  ['melody', 'melodic/lead'],
  ['pluck', 'melodic/pluck'],
  ['piano', 'melodic/pluck'],
  ['chord', 'melodic/chords'],
  ['atmos', 'atmosphere/texture'],
  ['reverb', 'atmosphere/reverb_return'],
  ['delay', 'atmosphere/delay_return'],
  ['vocal', 'vocal/lead'],
  ['voice', 'vocal/lead'],
  ['chop', 'vocal/chop'],
  ['riser', 'fx/riser'],
  ['sweep', 'fx/sweep'],
  ['impact', 'fx/impact'],
  ['synth', 'melodic/lead'],
  ['drone', 'atmosphere/texture'],
  ['noise', 'atmosphere/texture'],
  ['stab', 'melodic/stab'],
  ['lead', 'melodic/lead'],
  ['kick', 'rhythm/kick'],
  ['snare', 'rhythm/snare'],
  ['clap', 'rhythm/snare'],
  ['ride', 'rhythm/hihat'],
  ['perc', 'rhythm/percussion'],
  ['loop', 'rhythm/percussion'],
  ['drum', 'rhythm/drum_bus'],
  ['bass', 'bass/mid'],
  ['reese', 'bass/mid'],
  ['growl', 'bass/mid'],
  ['sub', 'bass/sub'],
  ['arp', 'melodic/arp'],
  ['seq', 'melodic/arp'],
  ['pad', 'melodic/pad'],
  ['room', 'atmosphere/reverb_return'],
  ['vox', 'vocal/lead'],
  ['sample', 'vocal/chop'],
  ['speak', 'vocal/lead'],
  ['fill', 'fx/fill'],
  ['hit', 'fx/impact'],
  ['fx', 'fx/misc'],
  ['effect', 'fx/misc'],
  ['trans', 'fx/transition'],
  ['group', 'bus/group'],
  ['master', 'bus/master'],
  ['return', 'bus/return'],
  ['send', 'bus/return'],
  ['bus', 'bus/group'],
  ['mix', 'bus/group'],
  ['sum', 'bus/group'],
  ['hat', 'rhythm/hihat'],
  ['hh', 'rhythm/hihat'],
  ['bd', 'rhythm/kick'],
  ['tom', 'rhythm/percussion'],
];

const ROLE_BY_KEYWORD = new Map(ROLE_KEYWORDS);

const COLOR_GROUP_MAP: Record<number, string> = {
  0: 'grey', 1: 'grey_light', 2: 'pink', 3: 'red', 4: 'orange', 5: 'yellow',
  6: 'green_light', 7: 'green', 8: 'teal', 9: 'blue_light', 10: 'blue',
  11: 'blue_dark', 12: 'purple', 13: 'magenta', 14: 'pink_light', 15: 'brown',
};

export function colorGroupFor(colorIndex: number): string {
  return COLOR_GROUP_MAP[colorIndex] ?? 'unknown';
}

export function classifyTrackRole(name: string, trackType?: string): string {
  if (trackType === 'return') return 'bus/return';
  if (trackType === 'master') return 'bus/master';
  const normalized = name.toLowerCase().replace(/[_-]+/g, ' ');
  const tokens = normalized.split(/[^a-z0-9#]+/).filter(Boolean);
  const padded = ` ${normalized} `;
  const phrases = ROLE_KEYWORDS.filter(([keyword]) => keyword.includes(' ')).sort((a, b) => b[0].length - a[0].length);
  for (const [keyword, role] of phrases) if (padded.includes(` ${keyword} `)) return role;
  for (const token of tokens) {
    const role = ROLE_BY_KEYWORD.get(token) ?? (token.endsWith('s') ? ROLE_BY_KEYWORD.get(token.slice(0, -1)) : undefined);
    if (role) return role;
  }
  return 'unknown/unclassified';
}

export function summarizeRoles(roles: string[]): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const role of roles) {
    const category = role.split('/')[0] || 'unknown';
    summary[category] = (summary[category] ?? 0) + 1;
  }
  return summary;
}

export type MelodicHouseSection = {name: string; bars: string; clock: string; intent: string};
export type MelodicHouseBand = {range: string; role: string};

export const MELODIC_HOUSE_TECHNO = {
  id: 'melodic-house-techno',
  name: 'Melodic House & Techno',
  bpm: 124,
  bpmRange: [120, 126] as const,
  clubLufsRange: [-8, -6] as const,
  timeSignature: '4/4' as const,
  keyRoot: 'A',
  scale: 'minor' as const,
  genre: 'melodic-techno' as const,
  mood: 'euphoric' as const,
  pattern: 'arpeggio' as const,
  arrangement: 'intro-build-drop' as const,
  synthPreset: 'warm-pad' as const,
  bars: 16,
  prompt: 'Melodic house and techno at 124 BPM: rolling bass, filtered pad, short pluck, airy hats and a vocal-chop space. Build an original motif through intro, break and drop. Do not copy an existing record.',
  bands: [
    {range: '30–60 Hz', role: 'Sub-bass and the physical body of the kick'},
    {range: '60–250 Hz', role: 'Kick body and the rolling bass line; keep them separated'},
    {range: '250–500 Hz', role: 'Low-mid synth harmonics; clear mud so the groove stays clean'},
    {range: '500–2000 Hz', role: 'Pads, plucks and vocal chops'},
    {range: '2–6 kHz', role: 'Lead, arp, clap and snare attack'},
    {range: '6–20 kHz', role: 'Hats, shakers, noise, uplifters and reverb air'},
  ] satisfies MelodicHouseBand[],
  sections: [
    {name: 'Intro', bars: '1–32', clock: '0:00–1:00', intent: 'Kick, sub, hat and a closed pad so a DJ can mix in'},
    {name: 'Bass introduction', bars: '33–64', clock: '1:00–2:00', intent: 'Open the bass filter, add a pluck, then a short fill'},
    {name: 'Melodic break', bars: '65–80', clock: '2:00–2:30', intent: 'Drop kick and bass; state the lead with a low-pass filter'},
    {name: 'Build', bars: '81–96', clock: '2:30–3:00', intent: 'Open the lead filter, riser and snare roll, still no kick'},
    {name: 'Drop', bars: '97–128', clock: '3:00–4:00', intent: 'Kick, sub, mid bass, full lead and an open hat'},
    {name: 'Main break', bars: '129–160', clock: '4:00–5:00', intent: 'Rhythm out; pads, lead and a higher harmony, then a build'},
    {name: 'Final drop', bars: '161–192', clock: '5:00–6:00', intent: 'All layers together at full energy'},
    {name: 'Outro', bars: '193–224', clock: '6:00–7:00', intent: 'Remove melody, close the bass filter, leave kick and sub'},
  ] satisfies MelodicHouseSection[],
} as const;
