-- Long-term user facts recalled across conversations.
CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fact TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- Users can only see their own memories.
CREATE POLICY memories_select_own ON memories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY memories_insert_own ON memories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY memories_update_own ON memories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY memories_delete_own ON memories
    FOR DELETE USING (auth.uid() = user_id);
