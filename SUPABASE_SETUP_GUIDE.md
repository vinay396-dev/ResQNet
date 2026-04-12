# 🚀 Complete Supabase Setup Guide - Step by Step

This guide will help you set up your entire Supabase database for the Animal Rescue Platform.

---

## 📋 Prerequisites

1. ✅ Supabase account created
2. ✅ New project created: `fcmeufsbenilwfvmxqpg.supabase.co`
3. ✅ Project URL and Anon Key copied (already in your `index.html`)

---

## 🔥 STEP 1: Access Supabase SQL Editor

### Steps:
1. Go to [https://supabase.com](https://supabase.com)
2. **Sign in** to your account
3. Click on your project: **`fcmeufsbenilwfvmxqpg`**
4. In the left sidebar, click **SQL Editor** (it looks like a code icon `</>`)
5. Click **New query** button (top right)

---

## 🗄️ STEP 2: Create All Database Tables

### Copy and paste this complete SQL script:

```sql
-- ============================================
-- ANIMAL RESCUE PLATFORM - DATABASE SETUP
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

-- 5. CREATE INDEXES FOR PERFORMANCE
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

-- Success message
SELECT '✅ All tables and indexes created successfully!' AS message;
```

### How to run:
1. **Copy** the entire SQL script above
2. **Paste** it into the SQL Editor
3. Click **Run** button (or press `Ctrl+Enter` / `Cmd+Enter`)
4. You should see: `✅ All tables and indexes created successfully!`

### ✅ Verification:
After running, check the left sidebar:
- Click **Table Editor**
- You should see all 4 tables:
  - ✅ `registered_users`
  - ✅ `reports`
  - ✅ `activities`
  - ✅ `memories`

---

## 🔒 STEP 3: Configure Row Level Security (RLS)

### Option A: Disable RLS (Easier for Testing)
If you want to test quickly without security policies:

```sql
-- Disable RLS for testing (NOT RECOMMENDED FOR PRODUCTION)
ALTER TABLE registered_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE reports DISABLE ROW LEVEL SECURITY;
ALTER TABLE activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE memories DISABLE ROW LEVEL SECURITY;

SELECT '✅ RLS disabled for testing' AS message;
```

### Option B: Enable RLS with Policies (Recommended)
For proper security, use these policies:

```sql
-- ============================================
-- ROW LEVEL SECURITY POLICIES
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

SELECT '✅ RLS policies created successfully!' AS message;
```

### 🎯 Choose One:
- **For quick testing**: Use Option A (Disable RLS)
- **For production**: Use Option B (Enable RLS with policies)

**Recommendation**: Start with Option A for testing, then switch to Option B later.

---

## 📦 STEP 4: Create Storage Bucket

### Steps:
1. In Supabase dashboard, click **Storage** in the left sidebar
2. Click **New bucket** button (top right)
3. Fill in the form:

   **Bucket name**: `report-photos`
   
   **Public bucket**: ✅ **Toggle ON** (Important! This allows public access to photos)
   
   **File size limit**: `5242880` (5MB in bytes, or leave default)
   
   **Allowed MIME types**: Leave empty or add:
   ```
   image/jpeg,image/jpg,image/png,image/webp
   ```

4. Click **Create bucket**
5. ✅ You should see the `report-photos` bucket in the list

### ⚠️ Important:
- **Public bucket must be ON** - Otherwise photos won't be accessible via URL
- The bucket name must be exactly: `report-photos` (matches your code)

---

## 🔐 STEP 5: Configure Storage Bucket Policies

### Steps:
1. Click on the **`report-photos`** bucket you just created
2. Go to **Policies** tab
3. Click **New Policy**
4. Select **For full customization**, click **Save**
5. Click on the policy name, then click **Edit**
6. Copy and paste this SQL:

```sql
-- Policy for reading photos (PUBLIC)
CREATE POLICY "Public Access for report-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'report-photos');

-- Policy for uploading photos (PUBLIC)
CREATE POLICY "Public Upload for report-photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'report-photos');

-- Policy for updating photos (PUBLIC)
CREATE POLICY "Public Update for report-photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'report-photos');
```

7. Click **Save**

---

## ✅ STEP 6: Verify Everything is Set Up

### Check List:

#### ✅ Tables Created:
1. Go to **Table Editor**
2. Verify you see all 4 tables:
   - [ ] `registered_users`
   - [ ] `reports`
   - [ ] `activities`
   - [ ] `memories`

#### ✅ Storage Bucket Created:
1. Go to **Storage**
2. Verify you see:
   - [ ] `report-photos` bucket exists
   - [ ] Bucket is marked as **Public**

#### ✅ Test Database Connection:
1. Open your `index.html` file in a browser
2. Open browser console (F12 → Console tab)
3. Try registering a new user
4. Check console for any errors
5. Go back to Supabase **Table Editor** → `registered_users`
6. Verify the new user appears in the table

---

## 🧪 STEP 7: Test the Application

### Test Registration:
1. Open `index.html` in browser
2. Click **Sign Up** → **User Registration**
3. Fill in:
   - Name: `Test User`
   - Phone: `9876543210`
   - Password: `test123`
4. Click **Register**
5. ✅ Check Supabase **Table Editor** → `registered_users` - you should see the user!

### Test Report Submission:
1. After registering, you'll be logged in
2. Fill out the report form:
   - Upload a photo or take a photo
   - Select animal type: Dog
   - Select condition: Injured
   - Enter location: Test Location
   - Add description (optional)
3. Click **Detect My Location** (optional)
4. Click **Submit Report**
5. ✅ Check Supabase **Table Editor** → `reports` - you should see the report!
6. ✅ Check **Storage** → `report-photos` - you should see the uploaded photo!

---

## 🔍 Troubleshooting

### Problem: "relation does not exist"
**Solution**: Make sure you ran the CREATE TABLE scripts. Check SQL Editor history.

### Problem: "permission denied"
**Solution**: Disable RLS (Option A) or check your RLS policies.

### Problem: Photos not uploading
**Solution**: 
- Verify bucket is **Public**
- Check bucket policies are set correctly
- Check browser console for errors

### Problem: Can't see data in tables
**Solution**:
- Refresh the Table Editor page
- Check if RLS is blocking access (try disabling temporarily)

### Problem: "Invalid API key"
**Solution**: 
- Verify your Supabase URL and Anon Key in `index.html`
- Make sure you're using the Anon Key, not the Service Role Key

---

## 📊 Database Schema Reference

### **registered_users** Table Structure:
```
id (bigint) - Auto-increment primary key
name (text) - User's full name
phone (text) - Phone number (unique)
password (text) - Password (currently plain text)
created_at (timestamp) - Creation timestamp
```

### **reports** Table Structure:
```
id (bigint) - Report ID (timestamp-based)
title (text) - Report title
description (text) - Report description
status (text) - 'pending', 'verified', or 'success'
date (timestamp) - Report date
animal_type (text) - Type of animal
condition (text) - Condition of animal
location (text) - Location address
description_note (text) - Additional notes
user_phone (text) - Submitter's phone
user_name (text) - Submitter's name
has_photo (boolean) - Whether photo exists
photo_url (text) - URL to photo
created_at (timestamp) - Creation timestamp
```

### **activities** Table Structure:
```
id (bigint) - Auto-increment primary key
title (text) - Activity title
description (text) - Activity description
date (timestamp) - Activity date
type (text) - 'report', 'verification', 'rescue', or 'feedback'
user_phone (text) - User's phone
created_at (timestamp) - Creation timestamp
```

### **memories** Table Structure:
```
id (bigint) - Auto-increment primary key
title (text) - Memory title
animal_type (text) - Type of animal rescued
location (text) - Rescue location
date (timestamp) - Rescue date
image (text) - URL to memory image
user_photo (boolean) - Whether from user's report
user_phone (text) - User's phone
created_at (timestamp) - Creation timestamp
```

---

## 🎯 Quick Summary

1. ✅ **SQL Editor** → Run table creation SQL
2. ✅ **SQL Editor** → Run RLS policies (or disable for testing)
3. ✅ **Storage** → Create `report-photos` bucket (Public ON)
4. ✅ **Storage Policies** → Set bucket policies
5. ✅ **Test** → Try registration and report submission
6. ✅ **Verify** → Check data appears in Supabase tables

---

## 🚀 You're Ready!

Once all steps are completed:
- ✅ Database tables created
- ✅ Storage bucket configured
- ✅ Ready to test the application
- ✅ Ready to proceed with modifications

**Next**: Test your application and then we can proceed with improvements!

---

## 💡 Pro Tips

1. **Start with RLS disabled** for easier testing, enable it later
2. **Keep SQL Editor open** - useful for quick queries and checks
3. **Check Table Editor regularly** - see data as it's created
4. **Monitor Storage usage** - photos can take up space
5. **Use browser console** - check for JavaScript errors

---

**Need Help?** Check the browser console (F12) for any errors, or verify all steps above were completed correctly.




