# 📊 Database Setup Guide - Animal Rescue Platform

## ✅ Current Configuration

### Supabase Credentials (Already Set)
- **Supabase URL**: `https://fcmeufsbenilwfvmxqpg.supabase.co`
- **Supabase Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjbWV1ZnNiZW5pbHdmdm14cXBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE5NzAyNDEsImV4cCI6MjA3NzU0NjI0MX0.95I5gOwqiNcpXslhzEb6lHPTKc-a5A_KqOz9QWhBEsQ`

**Location**: `index.html` lines 711-712

---

## 🗄️ Database Tables Required

### 1. **registered_users** Table
**Purpose**: Store user registration information

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `id` | bigint | PRIMARY KEY, auto-increment | Unique user ID |
| `name` | text | NOT NULL | User's full name |
| `phone` | text | NOT NULL, UNIQUE | User's phone number (used for login) |
| `password` | text | NOT NULL | User password (currently plain text - needs hashing) |
| `created_at` | timestamp | DEFAULT now() | Registration timestamp |

**SQL to create:**
```sql
CREATE TABLE registered_users (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### 2. **reports** Table
**Purpose**: Store animal rescue reports submitted by users

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `id` | bigint | PRIMARY KEY | Report ID (timestamp-based) |
| `title` | text | NOT NULL | Report title |
| `description` | text | NOT NULL | Report description |
| `status` | text | NOT NULL, DEFAULT 'pending' | Status: 'pending', 'verified', 'success' |
| `date` | timestamp | NOT NULL | Report submission date |
| `animal_type` | text | NOT NULL | Type: 'dog', 'cat', 'bird', 'cow', 'other' |
| `condition` | text | NOT NULL | Condition: 'injured', 'sick', 'stranded', 'abandoned', 'malnourished' |
| `location` | text | NOT NULL | Location address or coordinates |
| `description_note` | text | | Additional description notes |
| `user_phone` | text | NOT NULL | Phone of user who submitted |
| `user_name` | text | NOT NULL | Name of user who submitted |
| `has_photo` | boolean | DEFAULT false | Whether report includes photo |
| `photo_url` | text | | URL to the photo (from storage) |

**SQL to create:**
```sql
CREATE TABLE reports (
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

-- Index for faster queries
CREATE INDEX idx_reports_user_phone ON reports(user_phone);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_date ON reports(date DESC);
```

---

### 3. **activities** Table
**Purpose**: Track user activities (reports, verifications, rescues, feedback)

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `id` | bigint | PRIMARY KEY, auto-increment | Activity ID |
| `title` | text | NOT NULL | Activity title |
| `description` | text | NOT NULL | Activity description |
| `date` | timestamp | NOT NULL | Activity date |
| `type` | text | NOT NULL | Type: 'report', 'verification', 'rescue', 'feedback' |
| `user_phone` | text | NOT NULL | Phone of user associated with activity |

**SQL to create:**
```sql
CREATE TABLE activities (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('report', 'verification', 'rescue', 'feedback')),
    user_phone TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_activities_user_phone ON activities(user_phone);
CREATE INDEX idx_activities_date ON activities(date DESC);
```

---

### 4. **memories** Table
**Purpose**: Store successful rescue memories for users

| Column Name | Type | Constraints | Description |
|------------|------|-------------|-------------|
| `id` | bigint | PRIMARY KEY, auto-increment | Memory ID |
| `title` | text | NOT NULL | Memory title |
| `animal_type` | text | NOT NULL | Type of animal rescued |
| `location` | text | NOT NULL | Location of rescue |
| `date` | timestamp | NOT NULL | Rescue date |
| `image` | text | NOT NULL | URL to memory image |
| `user_photo` | boolean | DEFAULT false | Whether photo is from user's report |
| `user_phone` | text | NOT NULL | Phone of user who owns this memory |

**SQL to create:**
```sql
CREATE TABLE memories (
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

-- Index for faster queries
CREATE INDEX idx_memories_user_phone ON memories(user_phone);
CREATE INDEX idx_memories_date ON memories(date DESC);
```

---

## 📦 Storage Bucket Required

### **report-photos** Bucket
**Purpose**: Store uploaded photos for animal rescue reports

**Setup Steps in Supabase Dashboard:**
1. Go to **Storage** → **Buckets**
2. Click **New bucket**
3. Name: `report-photos`
4. **Public bucket**: ✅ Enable (needed to get public URLs)
5. **File size limit**: Set appropriate limit (e.g., 5MB)
6. **Allowed MIME types**: `image/jpeg`, `image/png`, `image/jpg`, `image/webp`

---

## 🔒 Row Level Security (RLS) Policies

### For **registered_users** table:
```sql
-- Enable RLS
ALTER TABLE registered_users ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (for login checks) - adjust based on your needs
CREATE POLICY "Allow public read on registered_users"
ON registered_users FOR SELECT
USING (true);

-- Allow anyone to insert (for registration) - consider restricting in production
CREATE POLICY "Allow public insert on registered_users"
ON registered_users FOR INSERT
WITH CHECK (true);
```

### For **reports** table:
```sql
-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users can see their own reports
CREATE POLICY "Users can view their own reports"
ON reports FOR SELECT
USING (user_phone = auth.jwt() ->> 'user_phone');

-- Allow public insert (anyone can submit reports)
CREATE POLICY "Allow public insert on reports"
ON reports FOR INSERT
WITH CHECK (true);

-- Allow updates for status changes (adjust permissions as needed)
CREATE POLICY "Allow status updates on reports"
ON reports FOR UPDATE
USING (true)
WITH CHECK (true);
```

### For **activities** table:
```sql
-- Enable RLS
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Users can see their own activities
CREATE POLICY "Users can view their own activities"
ON activities FOR SELECT
USING (user_phone = auth.jwt() ->> 'user_phone');

-- Allow public insert
CREATE POLICY "Allow public insert on activities"
ON activities FOR INSERT
WITH CHECK (true);
```

### For **memories** table:
```sql
-- Enable RLS
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- Users can see their own memories
CREATE POLICY "Users can view their own memories"
ON memories FOR SELECT
USING (user_phone = auth.jwt() ->> 'user_phone');

-- Allow public insert
CREATE POLICY "Allow public insert on memories"
ON memories FOR INSERT
WITH CHECK (true);
```

### For **report-photos** storage bucket:
```sql
-- Allow public read (since bucket is public)
CREATE POLICY "Allow public read on report-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'report-photos');

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated upload on report-photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'report-photos');

-- Allow updates for same user
CREATE POLICY "Allow update on report-photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'report-photos');
```

---

## ✅ Setup Checklist

- [ ] Create all 4 tables in Supabase SQL Editor
- [ ] Create indexes for better performance
- [ ] Create `report-photos` storage bucket
- [ ] Configure RLS policies (or disable RLS for testing)
- [ ] Test user registration
- [ ] Test report submission with photo upload
- [ ] Test NGO verification workflow
- [ ] Test rescue completion and memory creation

---

## 🔍 Verification Steps

1. **Test Table Creation**: Run a simple SELECT query on each table
2. **Test Insert**: Try registering a test user
3. **Test Storage**: Upload a test image to `report-photos` bucket
4. **Test Reports**: Submit a test report through the app
5. **Check Logs**: Monitor Supabase logs for any errors

---

## ⚠️ Important Notes

1. **Password Security**: Currently storing plain text passwords. Consider using Supabase Auth or hashing passwords before storing.

2. **RLS Policies**: The RLS policies above are basic. You may need to adjust them based on your security requirements. For initial testing, you can disable RLS temporarily.

3. **Photo Storage**: The `photo_url` field stores URLs from Supabase Storage. Make sure the bucket is public or URLs are accessible.

4. **Report ID**: Currently using `Date.now()` for report IDs. Consider using UUID or database-generated IDs.

---

## 📝 Next Steps

Once the database is set up:
1. Test the connection by opening the app
2. Try registering a new user
3. Submit a test report
4. Verify data appears in Supabase dashboard
5. Then we can proceed with modifications and improvements!


