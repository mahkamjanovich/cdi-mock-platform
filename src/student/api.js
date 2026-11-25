import { supabase } from '../supabase'

function mapMessage(m = '') {
  if (m.includes('too_many_attempts')) return 'Too many wrong attempts. Try again in 5 minutes.'
  if (m.includes('invalid_code')) return 'The code is wrong or the session is not active.'
  if (m.includes('section_closed')) return 'This section is closed for now.'
  if (m.includes('test_not_found')) return 'No test has been selected for this section.'
  if (m.includes('no_attempt')) return 'Attempt not found.'
  return m
}

// Faqat kompyuterdagi sinov uchun (npm run dev): ?demo bilan ochilsa, Supabase o'rniga namunaviy ma'lumot ishlatiladi
const DEMO = import.meta.env.DEV && new URLSearchParams(location.search).has('demo')

async function rpc(name, args) {
  const { data, error } = DEMO
    ? { data: await (await import('./demo.js')).rpc(name, args), error: null }
    : await supabase.rpc(name, args)
  if (error) {
    // Serverdan kelgan xatoning kodi bo'ladi; kod yo'q bo'lsa, bu tarmoq xatosi
    const e = new Error(error.code ? mapMessage(error.message) : 'No internet connection.')
    e.network = !error.code
    throw e
  }
  // Kod noto'g'ri yoki juda ko'p urinish bo'lsa, server xato ko'tarmasdan {error: ...} qaytaradi
  if (data && typeof data === 'object' && data.error) {
    const e = new Error(mapMessage(data.error))
    e.network = false
    throw e
  }
  return data
}

export const login = (code) => rpc('mockp_student_login', { p_code: code })
export const start = (code, section) => rpc('mockp_start_attempt', { p_code: code, p_section: section })
export const saveAnswer = (code, section, qid, answer, flagged) =>
  rpc('mockp_save_answer', { p_code: code, p_section: section, p_question_id: qid, p_answer: answer, p_flagged: flagged })
export const saveWriting = (code, partId, body) => rpc('mockp_save_writing', { p_code: code, p_part_id: partId, p_body: body })
export const submit = (code, section) => rpc('mockp_submit', { p_code: code, p_section: section })
export const results = (code) => rpc('mockp_get_results', { p_code: code })

export function mediaUrl(bucket, path) {
  if (path?.startsWith('/') || path?.startsWith('http')) return path // saytning o'z fayli yoki to'liq havola
  if (DEMO) return path ? '/design-samples/' + path : null
  return path ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl : null
}
