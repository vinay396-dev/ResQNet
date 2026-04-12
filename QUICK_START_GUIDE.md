# 🚀 Quick Start Guide - Supabase Setup

## ⚡ Fast Setup (5 Steps)

### ✅ Step 1: Go to Supabase SQL Editor
1. Open [https://supabase.com](https://supabase.com)
2. Sign in → Click your project: **`fcmeufsbenilwfvmxqpg`**
3. Click **SQL Editor** (left sidebar)
4. Click **New query**

### ✅ Step 2: Copy & Run This SQL (All-in-One)

**Copy everything from `setup_database.sql` file** and paste in SQL Editor, then click **Run**.

OR copy this:

```sql
-- CREATE TABLES
CREATE TABLE IF NOT EXISTS registered_users (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS activities (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('report', 'verification', 'rescue', 'feedback')),
    user_phone TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_reports_user_phone ON reports(user_phone);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(date DESC);
CREATE INDEX IF NOT EXISTS idx_activities_user_phone ON activities(user_phone);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date DESC);
CREATE INDEX IF NOT EXISTS idx_memories_user_phone ON memories(user_phone);
CREATE INDEX IF NOT EXISTS idx_memories_date ON memories(date DESC);

-- DISABLE RLS FOR TESTING (EASIER)
ALTER TABLE registered_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE memories DISABLE ROW LEVEL SECURITY;

SELECT '✅ All tables created successfully!' AS message;
```

### ✅ Step 3: Create Storage Bucket
1. Click **Storage** (left sidebar)
2. Click **New bucket**
3. **Name**: `report-photos`
4. **Public bucket**: ✅ **Toggle ON** (Important!)
5. Click **Create bucket**

### ✅ Step 4: Verify Tables Created
1. Click **Table Editor** (left sidebar)
2. Verify you see:
   - ✅ `registered_users`
   - ✅ `reports`
   - ✅ `activities`
   - ✅ `memories`

### ✅ Step 5: Test Your App
1. Open `index.html` in browser
2. Click **Sign Up** → **User Registration**
3. Register a test user
4. Check Supabase **Table Editor** → `registered_users` - you should see your user!

---

## ✅ That's It! You're Ready!

---

## 📋 Files Created for You:

1. **`SUPABASE_SETUP_GUIDE.md`** - Complete detailed step-by-step guide
2. **`setup_database.sql`** - All SQL in one file (easy copy/paste)
3. **`storage_bucket_setup.sql`** - Storage policies (if needed)
4. **`QUICK_START_GUIDE.md`** - This file (quick reference)

---

## 🆘 Troubleshooting

**"relation does not exist"** → Run the SQL script again
**"permission denied"** → Make sure RLS is disabled (Step 2 includes this)
**Photos not uploading** → Make sure bucket is **Public**
**Can't see data** → Refresh Table Editor page

---

## 📚 Need More Details?

See **`SUPABASE_SETUP_GUIDE.md`** for complete instructions with screenshots and explanations.




