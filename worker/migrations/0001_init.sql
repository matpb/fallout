CREATE TABLE characters (
	id          TEXT PRIMARY KEY,
	token_hash  TEXT NOT NULL,
	payload     TEXT NOT NULL,
	updated_at  INTEGER NOT NULL,
	server_at   INTEGER NOT NULL,
	created_at  INTEGER NOT NULL,
	deleted_at  INTEGER
);

CREATE INDEX idx_characters_token_hash ON characters(token_hash);
