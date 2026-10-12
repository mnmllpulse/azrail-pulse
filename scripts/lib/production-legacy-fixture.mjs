export const PRODUCTION_LEGACY_SCHEMA_SQL = `
CREATE TABLE users (id TEXT PRIMARY KEY, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, email TEXT, name TEXT);
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE TABLE projects (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, status TEXT DEFAULT 'pending', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, description TEXT, stack TEXT, r2_prefix TEXT, updated_at TEXT, FOREIGN KEY (user_id) REFERENCES users(id));
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE TABLE project_versions (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, version_number INTEGER NOT NULL, r2_object_key TEXT NOT NULL, summary TEXT, created_by_agent TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (project_id) REFERENCES projects(id));
CREATE INDEX idx_versions_project ON project_versions(project_id);
CREATE TABLE task_history (id TEXT PRIMARY KEY, project_id TEXT, agent TEXT NOT NULL, intent TEXT, input_type TEXT, status TEXT NOT NULL DEFAULT 'pending', input_summary TEXT, output_summary TEXT, error TEXT, started_at TEXT NOT NULL DEFAULT (datetime('now')), finished_at TEXT, FOREIGN KEY (project_id) REFERENCES projects(id));
CREATE INDEX idx_history_project ON task_history(project_id);
CREATE TABLE project_memory (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, category TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, source_agent TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (project_id) REFERENCES projects(id));
CREATE UNIQUE INDEX idx_memory_project_key ON project_memory(project_id, category, key);
CREATE TABLE conversations (id TEXT PRIMARY KEY, project_id TEXT, title TEXT NOT NULL DEFAULT 'AZRAIL Chat', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE messages (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, parent_message_id TEXT, model TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (conversation_id) REFERENCES conversations(id));
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_parent ON messages(parent_message_id);
CREATE TABLE missions (id TEXT PRIMARY KEY, project_id TEXT, conversation_id TEXT, goal TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', current_step TEXT, progress INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), finished_at TEXT);
CREATE INDEX idx_missions_project ON missions(project_id, updated_at);
CREATE TABLE mission_events (id TEXT PRIMARY KEY, mission_id TEXT NOT NULL, type TEXT NOT NULL, data TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (mission_id) REFERENCES missions(id));
CREATE INDEX idx_mission_events ON mission_events(mission_id, created_at);
CREATE TABLE mission_steps (id TEXT PRIMARY KEY, mission_id TEXT NOT NULL, position INTEGER NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', note TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX idx_mission_steps_mission ON mission_steps(mission_id, position);
CREATE TABLE mission_checks (id TEXT PRIMARY KEY, mission_id TEXT NOT NULL, attempt INTEGER NOT NULL, passed INTEGER NOT NULL, reason TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX idx_mission_checks_mission ON mission_checks(mission_id);
CREATE TABLE tool_calls (id TEXT PRIMARY KEY, mission_id TEXT NOT NULL, tool TEXT NOT NULL, status TEXT NOT NULL, input TEXT, output TEXT, error TEXT, started_at TEXT, finished_at TEXT, FOREIGN KEY (mission_id) REFERENCES missions(id));
CREATE INDEX idx_tool_calls_mission ON tool_calls(mission_id, started_at);
CREATE TABLE approvals (id TEXT PRIMARY KEY, mission_id TEXT NOT NULL, action TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', decided_at TEXT, FOREIGN KEY (mission_id) REFERENCES missions(id));
CREATE TABLE sessions (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, agent_type TEXT NOT NULL, context TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (project_id) REFERENCES projects(id));
`;

export const PRODUCTION_LEGACY_FIXTURE_SQL = `
INSERT INTO users(id,email,name) VALUES('u1','fixture@example.invalid','Fixture');
INSERT INTO projects(id,user_id,name,status,updated_at,description,stack,r2_prefix) VALUES('p1','u1','Production legacy fixture','active',datetime('now'),'restore proof','ts','projects/p1/');
INSERT INTO conversations(id,project_id,title) VALUES('c1','p1','Restore proof');
INSERT INTO messages(id,conversation_id,role,content) VALUES('msg1','c1','user','fixture message');
INSERT INTO missions(id,project_id,conversation_id,goal,status) VALUES('m1','p1','c1','fixture','completed');
INSERT INTO mission_events(id,mission_id,type,data) VALUES('e1','m1','verification.legacy','{}');
INSERT INTO task_history(id,project_id,agent,status,input_summary,output_summary) VALUES('t1','p1','fixture','completed','before backup','after backup');
INSERT INTO project_memory(id,project_id,category,key,value,source_agent) VALUES('mem1','p1','notes','unicode','данные ✓','fixture');
`;

export function createObservedProductionLegacyFixture(db,{seed=true}={}){
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(PRODUCTION_LEGACY_SCHEMA_SQL);
  if(seed) db.exec(PRODUCTION_LEGACY_FIXTURE_SQL);
}
