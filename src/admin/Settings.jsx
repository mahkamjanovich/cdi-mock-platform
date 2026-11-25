import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { errMsg, audioDuration, fmtDuration, SOUNDCHECK_TEXT } from '../lib'
import { Icon, PageHead, Skeleton, toast } from './kit.jsx'
import { uploadFile, SignedMedia } from './TestEditor.jsx'
import { t } from './i18n.js'
import { THEMES, CURSORS, PANEL, rememberDesign } from '../design.js'

const THEME_INFO = {
  signal: { name: 'Butter & Green', note: "Swiss setka, qalin chiziqlar, o'z ranglaringiz", colors: ['#FFEFB3', '#013E37', '#062420'] },
  ivory: { name: 'Editorial Ivory', note: 'Tinch, serif sarlavhalar, uzoq o\'qish uchun', colors: ['#F5F1E8', '#8A2B1E', '#1A1714'] },
}
const CURSOR_INFO = { 1: "To'la", 2: 'Kontur', 3: 'Rangli' }
const DEFAULT = { theme: 'signal', cursor: '1' }
const same = (a, b) => a.theme === b.theme && String(a.cursor) === String(b.cursor)

// Bitta panel (admin yoki o'quvchi) uchun tema va kursor tanlovi; «Tasdiqlash» bosilgandagina saqlanadi
function DesignPicker({ panel, title, saved, onSave }) {
  const [f, setF] = useState(saved)
  const [busy, setBusy] = useState(false)
  useEffect(() => setF(saved), [saved.theme, saved.cursor])
  async function confirm() { setBusy(true); await onSave(panel, f); setBusy(false) }
  return (
    <div className="design-col">
      <h3>{title}</h3>
      <div className="pick-label">Tema</div>
      <div className="pick-grid">
        {THEMES.map((k) => (
          <label key={k} className={'pick' + (f.theme === k ? ' on' : '')}>
            <input type="radio" name={panel + '-theme'} checked={f.theme === k} onChange={() => setF({ ...f, theme: k })} />
            <span className="swatch">{THEME_INFO[k].colors.map((c) => <i key={c} style={{ background: c }} />)}</span>
            <b>{THEME_INFO[k].name}</b><small>{THEME_INFO[k].note}</small>
          </label>
        ))}
      </div>
      <div className="pick-label">Kursor</div>
      <div className="pick-grid three">
        {CURSORS.map((k) => (
          <label key={k} className={'pick cur-pick' + (String(f.cursor) === k ? ' on' : '')}>
            <input type="radio" name={panel + '-cursor'} checked={String(f.cursor) === k} onChange={() => setF({ ...f, cursor: k })} />
            <svg viewBox="0 0 28 28" width="26" height="26" aria-hidden="true" className={'cur-demo v' + k}><path d="M6 4.5 L23.5 12.5 L11.5 23 Z" /></svg>
            <b>{CURSOR_INFO[k]}</b>
          </label>
        ))}
      </div>
      <div className="actions" style={{ alignItems: 'center' }}>
        <button onClick={confirm} disabled={busy || same(f, saved)}>{busy ? 'Saqlanmoqda...' : 'Tasdiqlash'}</button>
        {same(f, saved) && <span className="muted">Saqlangan</span>}
      </div>
    </div>
  )
}

function Design() {
  const [design, setDesign] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => { supabase.rpc('mockp_get_design').then(({ data, error }) => error ? setErr(errMsg(error)) : setDesign(data || {})) }, [])

  async function save(panel, value) {
    setErr('')
    const next = { ...design, [panel]: { theme: value.theme, cursor: String(value.cursor) } }
    const { error } = await supabase.from('mockp_settings').upsert({ key: 'design', value: JSON.stringify(next), updated_at: new Date().toISOString() })
    if (error) return setErr(errMsg(error))
    setDesign(next)
    if (panel === PANEL) rememberDesign(next[panel])
    toast(panel === 'admin' ? 'Admin panel dizayni saqlandi' : 'Student panel dizayni saqlandi')
  }

  return (
    <div className="card">
      <div className="card-title"><h2>Dizayn</h2></div>
      <p className="muted" style={{ marginTop: 0 }}>Tema va kursor har bir panel uchun alohida tanlanadi. O'quvchilar yangi dizaynni sahifani keyingi ochishida ko'radi. Light/dark rejimni har kim o'zi yuqoridagi kalit orqali tanlaydi.</p>
      {!design ? <Skeleton rows={3} /> : (
        <div className="grid2">
          <DesignPicker panel="admin" title="Admin panel" saved={{ ...DEFAULT, ...design.admin }} onSave={save} />
          <DesignPicker panel="student" title="Student panel" saved={{ ...DEFAULT, ...design.student }} onSave={save} />
        </div>
      )}
      {err && <div className="err" style={{ marginTop: 12 }}>{err}</div>}
    </div>
  )
}

export default function Settings() {
  const [path, setPath] = useState(undefined)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [secs, setSecs] = useState(null)

  async function load() {
    const { data, error } = await supabase.from('mockp_settings').select('value').eq('key', 'soundcheck_path').maybeSingle()
    if (error) return setErr(errMsg(error))
    setPath(data?.value || null)
  }
  useEffect(() => { load() }, [])

  // '/' bilan boshlansa — saytga qo'shilgan standart audio (xotiradan o'chirilmaydi)
  const isStatic = !!path?.startsWith('/')

  async function upload(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setErr(''); setBusy(true)
    try {
      const s = await audioDuration(file)
      const p = await uploadFile('mockp-audio', 'soundcheck', file)
      const { error } = await supabase.from('mockp_settings').upsert({ key: 'soundcheck_path', value: p, updated_at: new Date().toISOString() })
      if (error) throw error
      if (path && !isStatic) await supabase.storage.from('mockp-audio').remove([path])
      setSecs(s)
      toast(`Ovoz sozlash audiosi yuklandi (${fmtDuration(s)})`)
      load()
    } catch (x) { setErr(errMsg(x)) }
    setBusy(false)
  }

  async function remove() {
    if (!confirm(t("Ovoz sozlash audiosi o'chirilsinmi? O'quvchilar faqat matn va qisqa signalni ko'radi."))) return
    const { error } = await supabase.from('mockp_settings').upsert({ key: 'soundcheck_path', value: null, updated_at: new Date().toISOString() })
    if (error) return setErr(errMsg(error))
    if (!isStatic) await supabase.storage.from('mockp-audio').remove([path])
    toast("Audio o'chirildi")
    load()
  }

  return (
    <>
      <PageHead title="Sozlamalar" sub="Barcha sessiyalar uchun umumiy" />
      <Design />
      <div className="card">
        <div className="card-title"><h2>Ovoz sozlash audiosi</h2>{path ? <span className="pill ok">Yuklangan</span> : path === null ? <span className="pill warn">Yuklanmagan</span> : null}</div>
        <p className="muted" style={{ marginTop: 0 }}>
          O'quvchi kirgach, Listening'dan oldin shu audio chalinadi. U ovozni sozlab, «Keyingi» tugmasini bosgach Listening boshlanadi.
          Audioda quyidagilar aytilishi tavsiya etiladi (ekranda ham shu matn ko'rsatiladi):
        </p>
        <ul className="sc-list">{SOUNDCHECK_TEXT.map((t) => <li key={t}>{t}</li>)}</ul>
        {path === undefined ? <Skeleton rows={1} /> : (
          <>
            <label className="drop" style={{ marginTop: 16 }}>
              <input type="file" accept="audio/*" onChange={upload} disabled={busy} />
              <span className="ic"><Icon name={busy ? 'refresh' : 'audio'} /></span>
              <span><b>{busy ? 'Yuklanmoqda...' : path ? 'Audioni almashtirish' : 'Audio yuklash'}</b><small>mp3, m4a yoki wav · 1–2 daqiqalik yozuv yetarli</small></span>
            </label>
            {path && (isStatic
              ? <audio controls src={path} style={{ width: '100%', marginTop: 12 }} onLoadedMetadata={(e) => setSecs(e.currentTarget.duration)} />
              : <SignedMedia bucket="mockp-audio" path={path} kind="audio" onDuration={setSecs} />)}
            {isStatic && <p className="muted" style={{ marginTop: 8 }}>Hozir standart inglizcha audio ishlatilmoqda. O'zingiz yozgan audioni yuklasangiz, u almashtiriladi.</p>}
            {path && (
              <div className="actions" style={{ alignItems: 'center' }}>
                {secs && <span className="muted">Uzunligi: {fmtDuration(secs)}</span>}
                <button className="danger small" onClick={remove}>Audioni o'chirish</button>
              </div>
            )}
          </>
        )}
        {err && <div className="err" style={{ marginTop: 12 }}>{err}</div>}
      </div>
    </>
  )
}
