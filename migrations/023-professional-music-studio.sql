-- RC30: Professional Music Studio sessions and project-bound export provenance.
CREATE TABLE IF NOT EXISTS music_sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  project_id TEXT,
  prompt TEXT NOT NULL,
  genre TEXT NOT NULL,
  mood TEXT NOT NULL,
  bpm INTEGER NOT NULL,
  key_root TEXT NOT NULL,
  scale TEXT NOT NULL,
  bars INTEGER NOT NULL,
  time_signature TEXT NOT NULL,
  pattern TEXT NOT NULL,
  arrangement TEXT NOT NULL,
  synth_preset TEXT NOT NULL,
  seed INTEGER NOT NULL,
  wav_artifact_id TEXT,
  midi_artifact_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id),
  FOREIGN KEY(wav_artifact_id) REFERENCES studio_artifacts(id) ON DELETE SET NULL,
  FOREIGN KEY(midi_artifact_id) REFERENCES studio_artifacts(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_music_sessions_account ON music_sessions(account_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_music_sessions_project ON music_sessions(project_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_music_sessions_wav ON music_sessions(wav_artifact_id);
CREATE INDEX IF NOT EXISTS idx_music_sessions_midi ON music_sessions(midi_artifact_id);
