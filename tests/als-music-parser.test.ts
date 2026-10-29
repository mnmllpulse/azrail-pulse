import {describe,expect,it} from 'vitest';
import {MELODIC_HOUSE_TECHNO,classifyTrackRole} from '../src/lib/als-music-parser';

describe('Music Studio ALS role parser and melodic template',()=>{
 it('classifies whole words and does not treat the packed time-signature integer as a role',()=>{
  expect(classifyTrackRole('Kick')).toBe('rhythm/kick');
  expect(classifyTrackRole('Hi-Hat Loop')).toBe('rhythm/hihat');
  expect(classifyTrackRole('Sub Bass')).toBe('bass/sub');
  expect(classifyTrackRole('Somebody')).toBe('unknown/unclassified');
  expect(classifyTrackRole('Return A','return')).toBe('bus/return');
 });
 it('keeps the Melodic House template inside the composer bounds',()=>{
  expect(MELODIC_HOUSE_TECHNO.bpm).toBe(124);
  expect(MELODIC_HOUSE_TECHNO.bpmRange).toEqual([120,126]);
  expect(MELODIC_HOUSE_TECHNO.sections).toHaveLength(8);
  expect(MELODIC_HOUSE_TECHNO.bands.length).toBeGreaterThanOrEqual(6);
  expect(MELODIC_HOUSE_TECHNO.bars).toBeLessThanOrEqual(16);
  expect(MELODIC_HOUSE_TECHNO.genre).toBe('melodic-techno');
 });
});
