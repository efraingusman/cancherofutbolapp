import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  'https://dofbxgqzcvfjpnvcvdjb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvZmJ4Z3F6Y3ZmanBudmN2ZGpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM5MTk1MCwiZXhwIjoyMDk0OTY3OTUwfQ.iUxtMCva1O7JTfSY_kZQx0XBsmk91gvUhLogpzoc-WI'
);

// 1. Verificar columnas de post_likes
const { data: likes, error: likeErr } = await sb.from('post_likes').select('id,post_id,user_email,user_name').limit(3);
if (likeErr) { console.log('post_likes ERROR:', likeErr.message); }
else { console.log('post_likes OK - columnas funcionan. Filas:', likes.length, JSON.stringify(likes)); }

// 2. Verificar posts
const { data: posts, error: postErr } = await sb.from('posts').select('id,likes_count,comments_count').limit(3);
if (postErr) { console.log('posts ERROR:', postErr.message); }
else { console.log('posts OK. Filas:', posts.length); }

// 3. Verificar post_comments
const { data: comments, error: commErr } = await sb.from('post_comments').select('id,post_id,user_name,content').limit(3);
if (commErr) { console.log('post_comments ERROR:', commErr.message); }
else { console.log('post_comments OK. Filas:', comments.length, JSON.stringify(comments)); }

// 4. Verificar follows
const { data: follows, error: followErr } = await sb.from('follows').select('follower_email,following_email').limit(3);
if (followErr) { console.log('follows ERROR:', followErr.message); }
else { console.log('follows OK. Filas:', follows.length); }
