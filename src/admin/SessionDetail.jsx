import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import { supabase } from '../supabase'
import { errMsg, formatDate, downloadCsv, SECTIONS, STATUS_LABEL } from '../lib'
import { Icon, PageHead, Seg, Switch, Skeleton, Empty, Status, Initials, Modal, toast, SecChips } from './kit.jsx'
import { SectionIcon } from '../ui.jsx'
import { t } from './i18n.js'

// Sessiya qayta ochilganda (yopilgan -> faol/qoralama) boshqa ochiq sessiya bilan
// takrorlangan kodlar yangilanadi, aks holda o'quvchi kira olmay qoladi.
async function resolveCodeCollisions(sessionId) {
  const { data: mine, error } = await supabase.from('mockp_students').select('id, code').eq('session_id', sessionId)
  if (error) throw error
  if (!mine.length) return 0
  const { data: others, error: e2 } = await supabase
    .from('mockp_students')
    .select('code, mockp_sessions!inner(status)')
    .neq('session_id', sessionId)
    .neq('mockp_sessions.status', 'closed')
    .in('code', mine.map((s) => s.code))
  if (e2) throw e2
  const taken = new Set(others.map((o) => o.code))
  let changed = 0
  for (const s of mine.filter((s) => taken.has(s.code))) {
    const { data: code, error: e3 } = await supabase.rpc('mockp_gen_code', { p_session: sessionId })
    if (e3) throw e3
    const { error: e4 } = await supabase.from('mockp_students').update({ code }).eq('id', s.id)
    if (e4) throw e4
    changed++
  }
  return changed
}

function Settings({ session, reload, onBack }) {
  const [form, setForm] = useState({ name: session.name, exam_date: session.exam_date, start_time: session.start_time.slice(0, 5), status: session.status })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function save(e) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      let note = ''
      if (session.status === 'closed' && form.status !== 'closed') {
        const n = await resolveCodeCollisions(session.id)
        if (n) note = ` ${n} ta o'quvchining kodi boshqa sessiya bilan takrorlangani uchun yangilandi.`
      }
      const { error } = await supabase.from('mockp_sessions').update(form).eq('id', session.id)
      if (error) throw error
      toast('Saqlandi.' + note)
      reload()
    } catch (e) { setErr(errMsg(e)) }
    setBusy(false)
  }

  async function remove() {
    if (!confirm(t(`«${session.name}» sessiyasi o'quvchilar, testlar va natijalari bilan butunlay o'chiriladi. Davom etasizmi?`))) return
    const { error } = await supabase.from('mockp_sessions').delete().eq('id', session.id)
    if (error) setErr(errMsg(error)); else { toast("Sessiya o'chirildi"); onBack() }
  }

  return (
    <>
      <div className="card">
        <h2>Asosiy ma'lumotlar</h2>
        <form onSubmit={save}>
          <div className="grid2" style={{ gap: 14 }}>
            <label>Nomi<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
            <label>Holati
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label>Sana<input type="date" value={form.exam_date} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} required /></label>
            <label>Boshlanish vaqti<input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required /></label>
          </div>
          <div className="hint" style={{ marginTop: 16 }}>O'quvchilar faqat «Faol» sessiyaga kira oladi. Imtihon tugagach holatni «Yopilgan» qiling.</div>
          {err && <div className="err" style={{ marginTop: 12 }}>{err}</div>}
          <div className="actions" style={{ marginTop: 16 }}><button disabled={busy}>{busy ? 'Saqlanmoqda...' : "O'zgarishlarni saqlash"}</button></div>
        </form>
      </div>
      <div className="danger-zone">
        <div><b>Sessiyani o'chirish</b><p>O'quvchilar, urinishlar va natijalar ham butunlay o'chadi.</p></div>
        <button className="danger btn-ico" onClick={remove}><Icon name="trash" size={16} /> O'chirish</button>
      </div>
    </>
  )
}

function AddStudent({ session, onClose, onAdded }) {
  const [form, setForm] = useState({ full_name: '', phone: '', telegram: '' })
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  async function add(e) {
    e.preventDefault()
    setErr('')
    const { error } = await supabase.from('mockp_students').insert({
      session_id: session.id, full_name: form.full_name.trim(),
      phone: form.phone.trim() || null, telegram: form.telegram.trim().replace(/^@/, '') || null,
    })
    if (error) return setErr(errMsg(error))
    toast(`${form.full_name.trim()} qo'shildi`)
    setForm({ full_name: '', phone: '', telegram: '' })
    onAdded()
  }

  function pick(row, names) {
    for (const k of Object.keys(row)) if (names.includes(k.trim().toLowerCase())) return String(row[k] ?? '').trim()
    return ''
  }

  function importCsv(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setErr(''); setMsg('')
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (res) => {
        const list = res.data.map((r) => ({
          session_id: session.id,
          full_name: pick(r, ['full_name', 'ism', 'ism-familiya', 'ism familiya', 'name']),
          phone: pick(r, ['phone', 'telefon', 'tel']) || null,
          telegram: pick(r, ['telegram', 'tg']).replace(/^@/, '') || null,
        })).filter((r) => r.full_name)
        const skipped = res.data.length - list.length
        if (!list.length) { setErr('CSV da «full_name» (yoki «ism») ustuni topilmadi yoki qatorlar bo\'sh.'); return }
        for (let i = 0; i < list.length; i += 200) {
          const { error } = await supabase.from('mockp_students').insert(list.slice(i, i + 200))
          if (error) { setErr(errMsg(error)); onAdded(); return }
        }
        setMsg(`${list.length} ta o'quvchi qo'shildi${skipped ? `, ${skipped} ta bo'sh qator o'tkazib yuborildi` : ''}.`)
        toast(`${list.length} ta o'quvchi qo'shildi`)
        onAdded()
      },
    })
  }

  return (
    <Modal title="O'quvchi qo'shish" onClose={onClose}>
      <form onSubmit={add}>
        <label>Ism-familiya<input autoFocus value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></label>
        <div className="grid2" style={{ gap: 12 }}>
          <label>Telefon<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+998..." /></label>
          <label>Telegram<input value={form.telegram} onChange={(e) => setForm({ ...form, telegram: e.target.value })} placeholder="@username" /></label>
        </div>
        {err && <div className="err">{err}</div>}
        {msg && <div className="msg">{msg}</div>}
        <div className="foot"><button type="button" className="ghost" onClick={onClose}>Yopish</button><button>Qo'shish</button></div>
      </form>
      <div style={{ marginTop: 22 }}>
        <label className="drop">
          <input type="file" accept=".csv,text/csv" onChange={importCsv} />
          <span className="ic"><Icon name="upload" /></span>
          <span><b>CSV fayldan ko'plab qo'shish</b><small>Ustunlar: full_name (yoki ism), phone, telegram. ID kodlar avtomatik beriladi.</small></span>
        </label>
      </div>
    </Modal>
  )
}

function Students({ session, onChanged }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)

  async function load() {
    const { data, error } = await supabase.from('mockp_students').select('*').eq('session_id', session.id).order('created_at').order('full_name')
    if (error) setErr(errMsg(error)); else { setRows(data); onChanged?.(data.length) }
  }
  useEffect(() => { load() }, [session.id])

  async function remove(s) {
    if (!confirm(t(`${s.full_name} o'chirilsinmi? Uning natijalari ham o'chadi.`))) return
    const { error } = await supabase.from('mockp_students').delete().eq('id', s.id)
    if (error) setErr(errMsg(error)); else { toast(`${s.full_name} o'chirildi`); load() }
  }

  function exportCodes() {
    downloadCsv(`kodlar-${session.name}.csv`, (rows || []).map((s, i) => ({
      '№': i + 1, 'Ism-familiya': s.full_name, 'Telefon': s.phone || '', 'Telegram': s.telegram ? '@' + s.telegram : '', 'ID kod': s.code,
    })))
  }

  const list = (rows || []).filter((s) => !q.trim() || (s.full_name + ' ' + s.code + ' ' + (s.phone || '')).toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <div className="card flush">
      <div className="card-head no-print">
        <div className="search-in"><Icon name="search" size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ism, kod yoki telefon" /></div>
        <div className="actions" style={{ margin: 0 }}>
          <button className="ghost btn-ico" onClick={exportCodes} disabled={!rows?.length}><Icon name="download" size={16} /> CSV</button>
          <button className="ghost btn-ico" onClick={() => window.print()} disabled={!rows?.length}><Icon name="print" size={16} /> Chop etish</button>
          <button className="btn-ico" onClick={() => setAdding(true)}><Icon name="plus" size={16} /> O'quvchi qo'shish</button>
        </div>
      </div>
      <div className="print-only"><h2>{session.name}: {formatDate(session.exam_date)}, {session.start_time.slice(0, 5)}</h2></div>
      {err && <div className="err" style={{ margin: 16 }}>{err}</div>}
      {rows === null ? <Skeleton /> : rows.length === 0 ? (
        <Empty icon="users" title="Hali o'quvchi yo'q">Bittalab yoki CSV fayl orqali qo'shing. Har biriga 4 xonali ID kod avtomatik beriladi.</Empty>
      ) : (
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>№</th><th>O'quvchi</th><th className="hide-m">Telefon</th><th className="hide-m">Telegram</th><th>ID kod</th><th className="no-print"></th></tr></thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td className="muted">{rows.indexOf(s) + 1}</td>
                  <td><div className="person"><Initials name={s.full_name} /><b>{s.full_name}</b></div></td>
                  <td className="hide-m">{s.phone}</td><td className="hide-m">{s.telegram ? '@' + s.telegram : ''}</td>
                  <td><span className="code">{s.code}</span></td>
                  <td className="no-print" style={{ textAlign: 'right' }}><button className="icon-btn" title="O'chirish" aria-label="O'chirish" onClick={() => remove(s)}><Icon name="trash" size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {adding && <AddStudent session={session} onClose={() => setAdding(false)} onAdded={load} />}
    </div>
  )
}

// Sessiya uchun kutubxonadagi tayyor testlarni tanlash va bo'limlarni ochish/yopish
function SessionTests({ session, reload }) {
  const [tests, setTests] = useState(null)
  const [started, setStarted] = useState({})
  const [err, setErr] = useState('')

  async function load() {
    const [{ data: t, error }, { data: att, error: e2 }] = await Promise.all([
      supabase.from('mockp_tests').select('id, section, title, duration_minutes, audio_path, mockp_questions(count)').order('created_at', { ascending: false }),
      supabase.from('mockp_attempts').select('section, mockp_students!inner(session_id)').eq('mockp_students.session_id', session.id),
    ])
    if (error || e2) return setErr(errMsg(error || e2))
    const cnt = {}
    for (const a of att || []) cnt[a.section] = (cnt[a.section] || 0) + 1
    setStarted(cnt)
    setTests(t)
  }
  useEffect(() => { load() }, [session.id])

  async function choose(section, id) {
    setErr('')
    const patch = { [`${section}_test_id`]: id || null }
    if (!id) patch[`${section}_open`] = false // test olib tashlansa, bo'lim ham yopiladi
    const { error } = await supabase.from('mockp_sessions').update(patch).eq('id', session.id)
    if (error) setErr(errMsg(error)); else { toast('Test tanlandi'); await reload(); load() }
  }

  async function toggle(section) {
    setErr('')
    if (!session[`${section}_test_id`]) return setErr('Avval bu bo\'lim uchun test tanlang.')
    const col = `${section}_open`
    const { error } = await supabase.from('mockp_sessions').update({ [col]: !session[col] }).eq('id', session.id)
    if (error) setErr(errMsg(error)); else { toast(`${SECTIONS[section].label} ${session[col] ? 'yopildi' : 'ochildi'}`); reload() }
  }

  if (tests === null) return err ? <div className="err">{err}</div> : <Skeleton rows={3} />

  return (
    <>
      <div className="hint" style={{ marginBottom: 16 }}>
        Har bir bo'lim uchun kutubxonadagi tayyor testni tanlang, so'ng bo'limni oching. O'quvchi faqat ochiq bo'limni ko'radi; kira olishi uchun sessiya holati «Faol» bo'lishi kerak.
      </div>
      {err && <div className="err" style={{ marginBottom: 16 }}>{err}</div>}
      <div className="grid3">
        {Object.entries(SECTIONS).map(([key, cfg]) => {
          const list = tests.filter((t) => t.section === key)
          const selectedId = session[`${key}_test_id`]
          const sel = list.find((t) => t.id === selectedId)
          const nq = sel?.mockp_questions?.[0]?.count ?? 0
          const open = session[`${key}_open`]
          return (
            <div className={'card sec-card' + (open ? ' is-open' : '')} key={key} style={{ marginBottom: 0 }}>
              <div className="sec-card-top">
                <span className="sec-ic"><SectionIcon section={key} /></span>
                <div><h3 style={{ margin: 0 }}>{cfg.label}</h3><small className="muted">{`${key === 'listening' ? "audio bo'yicha" : '60 daqiqa'} · ${cfg.parts} ${cfg.partLabel.toLowerCase()}`}</small></div>
              </div>
              <label style={{ marginTop: 18 }}>Test
                <select value={selectedId || ''} disabled={!!started[key]} onChange={(e) => choose(key, e.target.value)}>
                  <option value="">— tanlanmagan —</option>
                  {list.map((t) => <option key={t.id} value={t.id}>{t.title || cfg.label} ({t.duration_minutes} daq)</option>)}
                </select>
              </label>
              <div className="sec-card-meta">
                {sel && cfg.hasQuestions && <span className={'pill ' + (nq === 40 ? 'ok' : 'bad')}>{nq} / 40 savol</span>}
                {sel && key === 'listening' && <span className={'pill ' + (sel.audio_path ? 'ok' : 'bad')}>{sel.audio_path ? 'Audio bor' : "Audio yo'q"}</span>}
                {started[key] > 0 && <span className="pill info">{started[key]} ta boshlagan</span>}
                {list.length === 0 && <span className="pill mute">Kutubxonada test yo'q</span>}
              </div>
              <div className="sec-card-foot">
                <Switch on={!!open} onChange={() => toggle(key)} disabled={!selectedId} />
              </div>
              {started[key] > 0 && <p className="muted" style={{ margin: '10px 0 0' }}>O'quvchilar boshlagani uchun testni almashtirib bo'lmaydi.</p>}
            </div>
          )
        })}
      </div>
    </>
  )
}

export default function SessionDetail({ id, onBack }) {
  const [session, setSession] = useState(null)
  const [count, setCount] = useState(null)
  const [tab, setTab] = useState('students')
  const [err, setErr] = useState('')

  async function load() {
    const { data, error } = await supabase.from('mockp_sessions').select('*, mockp_students(count)').eq('id', id).single()
    if (error) setErr(errMsg(error)); else { setSession(data); setCount(data.mockp_students?.[0]?.count ?? 0) }
  }
  useEffect(() => { load() }, [id])

  if (err) return <div className="err">{err}</div>
  if (!session) return <Skeleton rows={5} />

  return (
    <>
      <PageHead
        back={{ label: 'Sessiyalar', onClick: onBack }}
        title={session.name}
        sub={<span style={{ display: 'inline-flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}><b>{formatDate(session.exam_date)}, {session.start_time.slice(0, 5)}</b><Status status={session.status} /><SecChips s={session} /></span>}
        actions={<Seg value={tab} onChange={setTab} options={[['students', "O'quvchilar", count], ['tests', 'Testlar'], ['settings', 'Sozlamalar']]} />}
      />
      {tab === 'settings' && <Settings session={session} reload={load} onBack={onBack} />}
      {tab === 'students' && <Students session={session} onChanged={setCount} />}
      {tab === 'tests' && <SessionTests session={session} reload={load} />}
    </>
  )
}
