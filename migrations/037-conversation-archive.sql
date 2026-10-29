-- Archive chats in the sidebar without deleting history.
ALTER TABLE conversations ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;
