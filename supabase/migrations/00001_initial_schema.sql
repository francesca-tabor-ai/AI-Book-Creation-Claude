-- ============================================================
-- AI Book Creation Studio - Initial Database Schema
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USERS TABLE
-- ============================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  picture TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'Free'
    CHECK (subscription_tier IN ('Free', 'Creator', 'Pro Author', 'Studio', 'Enterprise')),
  generation_credits INTEGER NOT NULL DEFAULT 50000,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  tokens_this_month INTEGER NOT NULL DEFAULT 0,
  token_limit INTEGER NOT NULL DEFAULT 50000,
  project_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================
-- 2. PROJECTS TABLE
-- ============================================================
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT,
  seed_keyword TEXT NOT NULL,
  description TEXT,
  genre TEXT NOT NULL DEFAULT 'Non-Fiction'
    CHECK (genre IN ('Non-Fiction', 'Fiction', 'Academic', 'Business', 'Self-Help', 'Textbook')),
  target_audience TEXT NOT NULL DEFAULT 'General',
  writing_style TEXT NOT NULL DEFAULT 'Formal'
    CHECK (writing_style IN ('Formal', 'Conversational', 'Academic', 'Narrative', 'Technical', 'Inspirational')),
  cover_style TEXT NOT NULL DEFAULT 'Minimalist'
    CHECK (cover_style IN ('Minimalist', 'Vibrant', 'Classic', 'Dark & Moody', 'High-Tech')),
  word_count_goal INTEGER NOT NULL DEFAULT 30000,
  status TEXT NOT NULL DEFAULT 'setup'
    CHECK (status IN ('setup', 'brainstorm', 'concept', 'outline', 'writing', 'design', 'finalize', 'complete')),
  tone_voice_settings JSONB DEFAULT '{}',
  current_step INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================
-- 3. BOOK CONCEPTS TABLE
-- ============================================================
CREATE TABLE public.book_concepts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  thesis_statement TEXT,
  brainstorm_map JSONB DEFAULT '{}',
  concepts_json JSONB DEFAULT '[]',
  selected_title TEXT,
  selected_tagline TEXT,
  selected_description TEXT,
  market_positioning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================
-- 4. CHAPTERS TABLE
-- ============================================================
CREATE TABLE public.chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  summary_context TEXT,
  sections JSONB DEFAULT '[]',
  content_markdown TEXT,
  target_word_count INTEGER NOT NULL DEFAULT 2000,
  word_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'generating', 'generated', 'edited')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (project_id, order_index)
);

-- ============================================================
-- 5. COVER DESIGNS TABLE
-- ============================================================
CREATE TABLE public.cover_designs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  image_prompt TEXT,
  image_url TEXT,
  storage_path TEXT,
  style_variant TEXT NOT NULL
    CHECK (style_variant IN ('Minimalist', 'Vibrant', 'Classic', 'Dark & Moody', 'High-Tech')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================
-- 6. INDEXES (partial - exclude soft-deleted rows)
-- ============================================================
CREATE INDEX idx_users_auth_id ON users (auth_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_user ON projects (user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_chapters_project_order ON chapters (project_id, order_index) WHERE deleted_at IS NULL;
CREATE INDEX idx_concepts_project ON book_concepts (project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cover_designs_project ON cover_designs (project_id) WHERE deleted_at IS NULL;

-- ============================================================
-- 7. AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON book_concepts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON chapters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON cover_designs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 8. AUTO-CREATE USER PROFILE ON AUTH SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, name, picture)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 9. ATOMIC TOKEN USAGE TRACKING
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_token_usage(p_user_id UUID, p_tokens INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.users
  SET
    tokens_used = tokens_used + p_tokens,
    tokens_this_month = tokens_this_month + p_tokens
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 10. ROW-LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cover_designs ENABLE ROW LEVEL SECURITY;

-- Users: can only read/update own record
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth_id = auth.uid());
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth_id = auth.uid());

-- Projects: full CRUD scoped to own user_id
CREATE POLICY "projects_select_own" ON public.projects
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );
CREATE POLICY "projects_insert_own" ON public.projects
  FOR INSERT WITH CHECK (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );
CREATE POLICY "projects_update_own" ON public.projects
  FOR UPDATE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );
CREATE POLICY "projects_delete_own" ON public.projects
  FOR DELETE USING (
    user_id IN (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Book concepts: access via project ownership
CREATE POLICY "concepts_select_own" ON public.book_concepts
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.users u ON u.id = p.user_id
      WHERE u.auth_id = auth.uid()
    )
  );
CREATE POLICY "concepts_insert_own" ON public.book_concepts
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.users u ON u.id = p.user_id
      WHERE u.auth_id = auth.uid()
    )
  );
CREATE POLICY "concepts_update_own" ON public.book_concepts
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.users u ON u.id = p.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Chapters: access via project ownership
CREATE POLICY "chapters_select_own" ON public.chapters
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.users u ON u.id = p.user_id
      WHERE u.auth_id = auth.uid()
    )
  );
CREATE POLICY "chapters_insert_own" ON public.chapters
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.users u ON u.id = p.user_id
      WHERE u.auth_id = auth.uid()
    )
  );
CREATE POLICY "chapters_update_own" ON public.chapters
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.users u ON u.id = p.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Cover designs: access via project ownership
CREATE POLICY "covers_select_own" ON public.cover_designs
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.users u ON u.id = p.user_id
      WHERE u.auth_id = auth.uid()
    )
  );
CREATE POLICY "covers_insert_own" ON public.cover_designs
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.users u ON u.id = p.user_id
      WHERE u.auth_id = auth.uid()
    )
  );
CREATE POLICY "covers_update_own" ON public.cover_designs
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.users u ON u.id = p.user_id
      WHERE u.auth_id = auth.uid()
    )
  );

-- ============================================================
-- 11. STORAGE BUCKET FOR COVER IMAGES
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true);

CREATE POLICY "covers_upload_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'covers' AND
    (storage.foldername(name))[1] = (
      SELECT id::text FROM public.users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "covers_read_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'covers');
