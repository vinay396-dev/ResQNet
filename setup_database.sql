-- ============================================
-- ANIMAL RESCUE PLATFORM - COMPLETE DATABASE SETUP
-- ============================================
-- Copy and paste this entire file into Supabase SQL Editor
-- Run it in order (or all at once)
-- ============================================

-- ============================================
-- STEP 1: CREATE ALL TABLES
-- ============================================

-- 1. CREATE registered_users TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS registered_users (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CREATE reports TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
    id BIGINT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'success')),
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    animal_type TEXT NOT NULL,
    condition TEXT NOT NULL,
    location TEXT NOT NULL,
    description_note TEXT,
    user_phone TEXT NOT NULL,
    user_name TEXT NOT NULL,
    has_photo BOOLEAN DEFAULT false,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CREATE activities TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS activities (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('report', 'verification', 'rescue', 'feedback')),
    user_phone TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CREATE memories TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS memories (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    animal_type TEXT NOT NULL,
    location TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    image TEXT NOT NULL,
    user_photo BOOLEAN DEFAULT false,
    user_phone TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STEP 2: CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Indexes for reports table
CREATE INDEX IF NOT EXISTS idx_reports_user_phone ON reports(user_phone);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(date DESC);

-- Indexes for activities table
CREATE INDEX IF NOT EXISTS idx_activities_user_phone ON activities(user_phone);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date DESC);

-- Indexes for memories table
CREATE INDEX IF NOT EXISTS idx_memories_user_phone ON memories(user_phone);
CREATE INDEX IF NOT EXISTS idx_memories_date ON memories(date DESC);

-- ============================================
-- STEP 3: CONFIGURE ROW LEVEL SECURITY (RLS)
-- ============================================
-- Choose ONE option: Option A (Disable) or Option B (Enable with policies)
-- ============================================

-- ============================================
-- OPTION A: DISABLE RLS (EASIER FOR TESTING)
-- ============================================
-- Uncomment the lines below to disable RLS for testing
-- ============================================
/*
ALTER TABLE registered_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE memories DISABLE ROW LEVEL SECURITY;
*/

-- ============================================
-- OPTION B: ENABLE RLS WITH POLICIES (RECOMMENDED)
-- ============================================
-- Uncomment the lines below to enable RLS with security policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE registered_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- 1. POLICIES FOR registered_users TABLE
-- ============================================
-- Allow anyone to read (for login checks)
CREATE POLICY "Allow public read on registered_users"
ON registered_users FOR SELECT
USING (true);

-- Allow anyone to insert (for registration)
CREATE POLICY "Allow public insert on registered_users"
ON registered_users FOR INSERT
WITH CHECK (true);

-- 2. POLICIES FOR reports TABLE
-- ============================================
-- Allow public read (users can see their own reports)
CREATE POLICY "Allow public read on reports"
ON reports FOR SELECT
USING (true);

-- Allow anyone to insert reports
CREATE POLICY "Allow public insert on reports"
ON reports FOR INSERT
WITH CHECK (true);

-- Allow updates for status changes
CREATE POLICY "Allow update on reports"
ON reports FOR UPDATE
USING (true)
WITH CHECK (true);

-- 3. POLICIES FOR activities TABLE
-- ============================================
-- Allow public read (users see their own activities)
CREATE POLICY "Allow public read on activities"
ON activities FOR SELECT
USING (true);

-- Allow public insert
CREATE POLICY "Allow public insert on activities"
ON activities FOR INSERT
WITH CHECK (true);

-- 4. POLICIES FOR memories TABLE
-- ============================================
-- Allow public read (users see their own memories)
CREATE POLICY "Allow public read on memories"
ON memories FOR SELECT
USING (true);

-- Allow public insert
CREATE POLICY "Allow public insert on memories"
ON memories FOR INSERT
WITH CHECK (true);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT '✅ All tables, indexes, and RLS policies created successfully!' AS message;




