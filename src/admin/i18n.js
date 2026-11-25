// Xodimlar paneli tili: matnlar manbada o'zbekcha qoladi; EN tanlansa sahifadagi matn, placeholder,
// title va aria-label lug'at (en.js) bo'yicha almashtiriladi. UZ ga qaytilganda asl matn tiklanadi.
import { EXACT, PATTERNS } from './en.js'

const KEY = 'mockp_lang'
const ATTRS = ['placeholder', 'title', 'aria-label']
let lang = (() => { try { return localStorage.getItem(KEY) === 'en' ? 'en' : 'uz' } catch { return 'uz' } })()
export const getLang = () => lang

function tr(s) {
  const [, pre, core, post] = /^(\s*)([\s\S]*?)(\s*)$/.exec(s)
  if (!core) return null
  let out = EXACT[core]
  if (out == null) for (const [re, rep] of PATTERNS) if (re.test(core)) { out = core.replace(re, rep); break }
  return out == null ? null : pre + out + post
}

// confirm() kabi DOM ga tushmaydigan matnlar uchun
export const t = (s) => (lang === 'en' ? tr(s) ?? s : s)

const textSeen = new WeakMap() // matn tuguni -> { uz, en }
const attrSeen = new WeakMap() // element -> { [attr]: { uz, en } }

function doText(n) {
  if (n.parentElement?.closest('textarea, [contenteditable], [data-no-tr]')) return
  const v = n.nodeValue, rec = textSeen.get(n)
  if (rec && v === rec[lang]) return
  if (lang === 'en') {
    const en = tr(v)
    if (en == null) textSeen.delete(n)
    else { textSeen.set(n, { uz: v, en }); n.nodeValue = en }
  } else if (rec) {
    if (v === rec.en) n.nodeValue = rec.uz
    else textSeen.delete(n)
  }
}

function doAttr(el, a) {
  const v = el.getAttribute(a)
  if (v == null) return
  const all = attrSeen.get(el) || {}, rec = all[a]
  if (rec && v === rec[lang]) return
  if (lang === 'en') {
    const en = tr(v)
    if (en == null) { delete all[a]; return }
    all[a] = { uz: v, en }
    attrSeen.set(el, all)
    el.setAttribute(a, en)
  } else if (rec) {
    if (v === rec.en) el.setAttribute(a, rec.uz)
    else delete all[a]
  }
}

function walk(root) {
  if (root.nodeType === 3) return doText(root)
  if (root.nodeType !== 1) return
  ATTRS.forEach((a) => doAttr(root, a))
  const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
  while (w.nextNode()) {
    const n = w.currentNode
    if (n.nodeType === 3) doText(n)
    else ATTRS.forEach((a) => doAttr(n, a))
  }
}

let started = false
export function startI18n() {
  if (started) return
  started = true
  document.documentElement.lang = lang
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === 'characterData') doText(m.target)
      else if (m.type === 'attributes') doAttr(m.target, m.attributeName)
      else m.addedNodes.forEach(walk)
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS })
  walk(document.body)
}

export function setLang(l) {
  lang = l
  try { localStorage.setItem(KEY, l) } catch { /* eslint-disable-line no-empty */ }
  document.documentElement.lang = l
  walk(document.body)
}

// Self-check (dev only): exact, pattern and whitespace handling
if (import.meta.env.DEV) {
  const prev = lang
  lang = 'en'
  console.assert(tr(' Sessiyalar ') === ' Sessions ', 'i18n exact')
  console.assert(tr('Task 1 baholandi: 7.0') === 'Task 1 graded: 7.0', 'i18n pattern')
  console.assert(tr('Ali Valiyev') == null, 'i18n leaves names alone')
  lang = prev
}
