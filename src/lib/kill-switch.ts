import type { Env } from '../types';
import { AccessError } from './accounts';

const keys = {
  music: 'AZRAIL_SWITCH_MUSIC',
  video: 'AZRAIL_SWITCH_VIDEO',
  ai: 'AZRAIL_SWITCH_AI',
  sandbox: 'AZRAIL_SWITCH_SANDBOX',
  tools: 'AZRAIL_SWITCH_TOOLS',
} as const;

export type KillSwitch = keyof typeof keys;

/** Absent or any value other than "off" leaves the subsystem running. */
export function subsystemOff(env: Env, name: KillSwitch) {
  return env[keys[name]] === 'off';
}

export function assertSubsystem(env: Env, name: KillSwitch) {
  if (subsystemOff(env, name)) throw new AccessError('Этот контур выключен. Остальной AZRAIL работает.', 503);
}
