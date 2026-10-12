import { XMLParser } from 'fast-xml-parser';
import zlib from 'zlib';
import fs from 'fs';

export interface TrackInfo {
  id: number;
  name: string;
  type: 'audio' | 'midi' | 'return' | 'master';
  role: string;
  colorIndex: number;
  clipCount: number;
}

export interface ProjectIR {
  bpm: number;
  timeSignature: string;
  keyRoot: string;
  keyScale: string;
  tracks: TrackInfo[];
}

const TRACK_ROLE_MAP: Record<string, string> = {
  "kick": "rhythm/kick",
  "bd": "rhythm/kick",
  "bassdrum": "rhythm/kick",
  "snare": "rhythm/snare",
  "clap": "rhythm/snare",
  "hihat": "rhythm/hihat",
  "hh": "rhythm/hihat",
  "hat": "rhythm/hihat",
  "perc": "rhythm/percussion",
  "percussion": "rhythm/percussion",
  "shaker": "rhythm/percussion",
  "drum": "rhythm/drum_bus",
  "sub": "bass/sub",
  "bass": "bass/mid",
  "reese": "bass/mid",
  "lead": "melodic/lead",
  "melody": "melodic/lead",
  "synth": "melodic/lead",
  "arp": "melodic/arp",
  "chord": "melodic/chords",
  "pad": "melodic/pad",
  "vocal": "vocal/lead",
  "vox": "vocal/lead",
  "riser": "fx/riser",
  "sweep": "fx/sweep",
  "downlift": "fx/downlifter",
  "impact": "fx/impact",
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SCALE_NAMES: Record<number, string> = {
  0: "Major",
  1: "Minor",
  2: "Dorian",
  3: "Mixolydian",
  4: "Lydian",
  5: "Phrygian",
  6: "Locrian",
};

export function classifyTrack(name: string): string {
  const lower = name.toLowerCase().replace(/[_]/g, ' ');
  for (const [kw, role] of Object.entries(TRACK_ROLE_MAP)) {
    if (lower.includes(kw)) return role;
  }
  return "unknown/unclassified";
}

export async function parseALS(filePath: string): Promise<ProjectIR> {
  const buffer = fs.readFileSync(filePath);
  let xmlData: string;

  try {
    xmlData = zlib.gunzipSync(buffer).toString();
  } catch (e) {
    xmlData = buffer.toString();
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const jsonObj = parser.parse(xmlData);
  const liveSet = jsonObj.Ableton.LiveSet;

  const bpm = parseFloat(liveSet.MasterTrack.DeviceChain.MainSequencer.Tempo.Manual["@_Value"] || "120");
  
  const rootNoteIdx = parseInt(liveSet.MasterTrack.DeviceChain.MainSequencer.KeyScale?.RootNote?.["@_Value"] || "0");
  const scaleIdx = parseInt(liveSet.MasterTrack.DeviceChain.MainSequencer.KeyScale?.Scale?.["@_Value"] || "1");

  const tracks: TrackInfo[] = [];

  const processTracks = (trackList: any[], type: 'audio' | 'midi' | 'return' | 'master') => {
    if (!trackList) return;
    const items = Array.isArray(trackList) ? trackList : [trackList];
    items.forEach((t: any) => {
      const name = t.Name.EffectiveName["@_Value"] || "Unnamed";
      tracks.push({
        id: parseInt(t["@_Id"] || "-1"),
        name,
        type,
        role: type === 'master' ? 'bus/master' : (type === 'return' ? 'bus/return' : classifyTrack(name)),
        colorIndex: parseInt(t.ColorIndex?.["@_Value"] || "0"),
        clipCount: 0 // Simplification for now
      });
    });
  };

  processTracks(liveSet.Tracks.AudioTrack, 'audio');
  processTracks(liveSet.Tracks.MidiTrack, 'midi');
  processTracks(liveSet.Tracks.ReturnTrack, 'return');
  processTracks(liveSet.MasterTrack, 'master');

  return {
    bpm,
    timeSignature: "4/4", // Default for many versions
    keyRoot: NOTE_NAMES[rootNoteIdx % 12],
    keyScale: SCALE_NAMES[scaleIdx] || "Minor",
    tracks
  };
}
