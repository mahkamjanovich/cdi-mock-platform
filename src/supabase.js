import { createClient } from '@supabase/supabase-js'
import { demoSupabase } from './admin/demoSupabase.js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Faqat kompyuterdagi sinov uchun: /admin?demo soxta ma'lumot bilan ochiladi (jonli saytda o'chiq)
const DEMO = import.meta.env.DEV && location.pathname.startsWith('/admin') && new URLSearchParams(location.search).has('demo')

// Kalit qo'yilmagan bo'lsa, sahifa oq bo'lib qolmasligi uchun ogohlantirish ko'rsatiladi
export const configured = DEMO || Boolean(url && key)
export const supabase = DEMO ? demoSupabase : createClient(url || 'http://localhost', key || 'missing-key')
