// src/supabase/client.js
import { createClient } from '@supabase/supabase-js'

// ดึงค่า URL และ Key จากไฟล์ .env ที่เราสร้างไว้
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// สร้างและ export ตัว client ของ Supabase เพื่อให้ไฟล์อื่นนำไปใช้ได้
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
