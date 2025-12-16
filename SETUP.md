# PhotoWall Setup Guide

## Database Setup (Required for Full Features)

To enable all features (captions, likes, categories, metadata), you need to create a database table in Supabase.

### Step 1: Go to Supabase Dashboard
1. Open your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor**

### Step 2: Run this SQL Query

```sql
-- Create the image_metadata table
CREATE TABLE IF NOT EXISTS image_metadata (
  id SERIAL PRIMARY KEY,
  image_name TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  uid TEXT NOT NULL,
  caption TEXT DEFAULT '',
  category TEXT DEFAULT 'other',
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_image_name ON image_metadata(image_name);
CREATE INDEX IF NOT EXISTS idx_uid ON image_metadata(uid);
CREATE INDEX IF NOT EXISTS idx_category ON image_metadata(category);
CREATE INDEX IF NOT EXISTS idx_created_at ON image_metadata(created_at DESC);

-- Enable Row Level Security (RLS) - Optional but recommended
ALTER TABLE image_metadata ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all reads (anyone can view)
CREATE POLICY "Allow public read access" ON image_metadata
  FOR SELECT USING (true);

-- Create policy to allow inserts (anyone can upload)
CREATE POLICY "Allow public insert" ON image_metadata
  FOR INSERT WITH CHECK (true);

-- Create policy to allow updates only for own images
CREATE POLICY "Allow update own images" ON image_metadata
  FOR UPDATE USING (uid = current_setting('app.uid', true));

-- Create policy to allow deletes only for own images
CREATE POLICY "Allow delete own images" ON image_metadata
  FOR DELETE USING (uid = current_setting('app.uid', true));
```

### Step 3: Update Storage Bucket Permissions

1. Go to **Storage** in Supabase dashboard
2. Click on your `images` bucket
3. Go to **Policies**
4. Ensure these policies exist:

**For Public Access (Viewing):**
```sql
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'images');
```

**For Upload:**
```sql
CREATE POLICY "Anyone can upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'images');
```

**For Delete (Own Images Only):**
```sql
CREATE POLICY "Users can delete own images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'images' AND
    (storage.foldername(name))[1] = current_setting('app.uid', true)
  );
```

## Features Included

✅ **View Images** - Anyone can view all images  
✅ **Upload Images** - Requires username, stores metadata  
✅ **Edit Caption** - Only uploader can edit their images  
✅ **Delete Images** - Only uploader can delete (FIXED)  
✅ **Download Images** - Anyone can download  
✅ **Likes** - Users can like images  
✅ **Categories** - Tag images (nature, portrait, food, travel, art, other)  
✅ **Sorting** - Newest, Oldest, Most Liked  
✅ **Filtering** - By category  
✅ **Time Display** - Shows "X minutes/hours/days ago"  
✅ **Dark Mode** - Theme toggle  
✅ **Responsive Design** - Works on all devices  

## Fallback Mode

If the database table doesn't exist, the app will automatically use localStorage as a fallback. However, this means:
- Metadata is only stored locally (per device)
- Likes won't sync across devices
- Captions won't sync across devices

For full functionality, please set up the database table as described above.

## Troubleshooting

### Delete Not Working
- Check that storage bucket policies allow deletion
- Verify the image name matches the user's uid in the filename
- Check browser console for error messages

### Metadata Not Saving
- Ensure the database table exists
- Check that RLS policies allow inserts/updates
- Verify Supabase credentials are correct


