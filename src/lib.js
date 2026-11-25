import Papa from 'papaparse'

export const SECTIONS = {
  listening: { label: 'Listening', partLabel: 'Part', parts: 4, minutes: 40, hasQuestions: true },
  reading: { label: 'Reading', partLabel: 'Passage', parts: 3, minutes: 60, hasQuestions: true },
  writing: { label: 'Writing', partLabel: 'Task', parts: 2, minutes: 60, hasQuestions: false },
}

export const STATUS_LABEL = { draft: 'Qoralama', active: 'Faol', closed: 'Yopilgan' }

export const QTYPES = [
  ['mcq', 'Multiple choice (MCQ)'],
  ['tfng', 'True / False / Not Given'],
  ['ynng', 'Yes / No / Not Given'],
  ['matching_headings', 'Matching headings'],
  ['matching_information', 'Matching information'],
  ['gap_fill', 'Gap fill (sentence / summary / note / table completion)'],
  ['short_answer', 'Short answer'],
]

export const OPTION_TYPES = ['mcq', 'matching_headings', 'matching_information']
export const FIXED_ANSWERS = {
  tfng: ['TRUE', 'FALSE', 'NOT GIVEN'],
  ynng: ['YES', 'NO', 'NOT GIVEN'],
}

const ROMAN = ['i','ii','iii','iv','v','vi','vii','viii','ix','x','xi','xii','xiii','xiv','xv','xvi','xvii','xviii','xix','xx']
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

// Variantlar kalitlari: MCQ va matching information -> A, B, C..., matching headings -> i, ii, iii...
export function keyFor(type, i) {
  return type === 'matching_headings' ? (ROMAN[i] ?? String(i + 1)) : (LETTERS[i] ?? String(i + 1))
}
export function parseOptions(type, text) {
  return text.split('\n').map((s) => s.trim()).filter(Boolean).map((t, i) => ({ key: keyFor(type, i), text: t }))
}
export function optionsToText(opts) {
  return (opts || []).map((o) => o.text).join('\n')
}

export function errMsg(e) {
  if (!e) return ''
  if (e.code === '23505') return 'Bu qiymat allaqachon mavjud (masalan, savol raqami takrorlangan).'
  if (e.code === '23503') return "Bog'liq ma'lumot mavjud (masalan, test sessiyada tanlangan yoki natijalari bor), shuning uchun amalni bajarib bo'lmaydi. Avval sessiyalardan olib tashlang."
  return e.message || String(e)
}

export function downloadCsv(filename, rows) {
  const csv = '\ufeff' + Papa.unparse(rows) // BOM: Excel o'zbekcha harflarni to'g'ri ochishi uchun
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function formatDate(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${y}`
}

// Audio faylning uzunligi (soniya) — yuklashdan oldin brauzerda o'lchanadi
export function audioDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const a = new Audio()
    a.preload = 'metadata'
    a.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(a.duration) }
    a.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Audio faylni o'qib bo'lmadi. Boshqa formatda (mp3) yuklab ko'ring.")) }
    a.src = url
  })
}

// 1830 -> "30:30", 3725 -> "1:02:05"
export function fmtDuration(secs) {
  const s = Math.max(0, Math.round(secs))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60
  return (h ? `${h}:${String(m).padStart(2, '0')}` : String(m)) + ':' + String(r).padStart(2, '0')
}

export const BAND_OPTIONS = Array.from({ length: 19 }, (_, i) => i / 2)
export const bandText = (x) => (x == null ? '' : Number(x).toFixed(1))

// Ovoz sozlash ekranida (va audioda) aytiladigan matn
export const SOUNDCHECK_TEXT = [
  'This audio is for adjusting your volume.',
  'Exam order: Listening first, then Reading, and finally Writing.',
  'Results will be announced in the channel by your ID code.',
]
