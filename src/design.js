import { supabase } from './supabase'

// Dizayn tanlovi: tema va kursor admin paneldan (Sozlamalar) har bir panel uchun alohida saqlanadi,
// light/dark esa har bir qurilmada foydalanuvchining o'zi tanlaydi.
export const THEMES = ['signal', 'ivory']
export const CURSORS = ['1', '2', '3']
export const PANEL = /^\/(admin|teacher)/.test(location.pathname) ? 'admin' : 'student'
const KEY = 'mockp_design_' + PANEL
const MODE_KEY = 'mockp_mode_' + PANEL

const read = (k) => { try { return localStorage.getItem(k) } catch { return null } }
const write = (k, v) => { try { localStorage.setItem(k, v) } catch { /* eslint-disable-line no-empty */ } }

export function applyDesign(d) {
  const el = document.documentElement
  if (THEMES.includes(d?.theme)) el.dataset.theme = d.theme
  if (CURSORS.includes(String(d?.cursor))) el.dataset.cursor = String(d.cursor)
}

// Joriy panelga qo'llaydi va keyingi ochilish uchun qurilmada eslab qoladi
export function rememberDesign(d) {
  applyDesign(d)
  write(KEY, JSON.stringify(d))
}

export const getMode = () => (read(MODE_KEY) === 'dark' ? 'dark' : 'light')
export function setMode(m) {
  write(MODE_KEY, m)
  document.documentElement.dataset.mode = m
}

// Avval qurilmadagi oxirgi tanlov (sahifa rang almashib "yonib-o'chmasligi" uchun), keyin serverdagi joriy tanlov
export function initDesign() {
  try { applyDesign(JSON.parse(read(KEY))) } catch { /* eslint-disable-line no-empty */ }
  document.documentElement.dataset.mode = getMode()
  supabase.rpc('mockp_get_design').then(({ data }) => { if (data?.[PANEL]) rememberDesign(data[PANEL]) }, () => {})
}
