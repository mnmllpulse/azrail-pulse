import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { gunzipSync } from 'node:zlib';
import { HttpError } from './http';

export async function parseALSBuffer(buffer: Uint8Array) {
  let raw: Uint8Array;
  try { raw = buffer[0] === 0x1f && buffer[1] === 0x8b ? gunzipSync(buffer, { maxOutputLength: 8 * 1024 * 1024 }) : buffer; }
  catch { throw new HttpError(400, 'invalid_als', 'Повреждённый ALS или превышен размер распаковки.'); }
  if (raw.byteLength > 8 * 1024 * 1024) throw new HttpError(413, 'als_too_large', 'Размер XML превышает 8 МБ.');
  const xml = new TextDecoder().decode(raw);
  if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) throw new HttpError(400, 'invalid_xml', 'Нужен корректный XML Ableton без внешних сущностей.');
  const parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', processEntities: false }).parse(xml);
  const live = parsed?.Ableton?.LiveSet;
  if (!live || typeof live !== 'object') throw new HttpError(400, 'invalid_als', 'В файле отсутствует Ableton LiveSet.');
  const master = live.MasterTrack ?? live.MainTrack;
  const tempo = master?.DeviceChain?.Mixer?.Tempo?.Manual ?? master?.DeviceChain?.MainSequencer?.Tempo?.Manual;
  const bpm = Number(tempo?.['@_Value']);
  const roles: Array<[RegExp, string]> = [[/kick|bassdrum|\bbd\b/i, 'rhythm/kick'], [/snare|clap/i, 'rhythm/snare'], [/hihat|\bhh\b|hat/i, 'rhythm/hihat'], [/sub|bass|reese/i, 'bass'], [/pad/i, 'melodic/pad'], [/arp/i, 'melodic/arp'], [/vocal|vox/i, 'vocal/lead'], [/lead|synth|melody/i, 'melodic/lead']];
  const tracks: Array<{ id: number; name: string; type: string; role: string; colorIndex: number; clipCount: null }> = [];
  for (const [key, type] of [['AudioTrack','audio'], ['MidiTrack','midi'], ['ReturnTrack','return']] as const) {
    const rows = live.Tracks?.[key];
    for (const row of (Array.isArray(rows) ? rows : rows ? [rows] : [])) {
      const name = String(row.Name?.EffectiveName?.['@_Value'] ?? row.Name?.UserName?.['@_Value'] ?? 'Unnamed');
      tracks.push({ id: Number(row['@_Id'] ?? -1), name, type, role: type === 'return' ? 'bus/return' : roles.find(([re]) => re.test(name))?.[1] ?? 'unclassified', colorIndex: Number(row.Color?.['@_Value'] ?? row.ColorIndex?.['@_Value'] ?? 0), clipCount: null });
    }
  }
  return { bpm: Number.isFinite(bpm) && bpm > 0 ? bpm : null, timeSignature: null, keyRoot: null, keyScale: null, tracks, warnings: ['Тональность, размер и количество клипов пока не извлекаются. Аудио не анализировалось.'] };
}
