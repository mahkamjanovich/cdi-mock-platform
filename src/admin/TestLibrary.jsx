import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { SECTIONS, errMsg, fmtDuration } from '../lib'
import { Icon, PageHead, Kpis, Modal, Skeleton, Empty, toast } from './kit.jsx'

function NewTest({ section, onClose, onCreated }) {
  const cfg = SECTIONS[section]
  const [form, setForm] = useState({ title: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function create(e) {
    e.preventDefault()
    setErr(''); setBusy(true)
    const { data: test, error } = await supabase.from('mockp_tests')
      .insert({ section, title: form.title.trim(), duration_minutes: section === 'listening' ? 40 : 60 })
      .select().single()
    if (error) { setBusy(false); return setErr(errMsg(error)) }
    const parts = Array.from({ length: cfg.parts }, (_, i) => ({
      test_id: test.id, position: i + 1, title: `${cfg.partLabel} ${i + 1}`,
      min_words: section === 'writing' ? (i === 0 ? 150 : 250) : null,
    }))
    const { error: pe } = await supabase.from('mockp_parts').insert(parts)
    setBusy(false)
    if (pe) return setErr(errMsg(pe))
    toast('Test yaratildi')
    onCreated(test.id)
  }

  return (
    <Modal title={`Yangi ${cfg.label} testi`} onClose={onClose}>
      <form onSubmit={create}>
        <label>Test nomi<input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={`Masalan: ${cfg.label} Test 1`} required /></label>
        <div className="hint">{section === 'listening' ? "Taymer yuklangan audio uzunligiga teng bo'ladi: audioni test sahifasida yuklaysiz." : 'Taymer avtomatik 60 daqiqa.'}</div>
        <div className="hint">{`${cfg.parts} ta ${cfg.partLabel.toLowerCase()} avtomatik yaratiladi.`}</div>
        {err && <div className="err">{err}</div>}
        <div className="foot"><button type="button" className="ghost" onClick={onClose}>Bekor qilish</button><button disabled={busy}>{busy ? 'Yaratilmoqda...' : 'Yaratish'}</button></div>
      </form>
    </Modal>
  )
}

// Bo'limning (Listening / Reading / Writing) tayyor testlar kutubxonasi
export default function TestLibrary({ section, onOpen }) {
  const cfg = SECTIONS[section]
  const [rows, setRows] = useState(null)
  const [usage, setUsage] = useState({})
  const [err, setErr] = useState('')
  const [adding, setAdding] = useState(false)

  async function load() {
    const col = `${section}_test_id`
    const [{ data: tests, error }, { data: sess, error: e2 }] = await Promise.all([
      supabase.from('mockp_tests').select('*, mockp_questions(count)').eq('section', section).order('created_at', { ascending: false }),
      supabase.from('mockp_sessions').select(`name, ${col}`).not(col, 'is', null),
    ])
    if (error || e2) return setErr(errMsg(error || e2))
    const u = {}
    for (const s of sess || []) (u[s[col]] = u[s[col]] || []).push(s.name)
    setUsage(u)
    setRows(tests)
  }
  useEffect(() => { load() }, [section])

  const nq = (t) => t.mockp_questions?.[0]?.count ?? 0
  const ready = (rows || []).filter((t) => (!cfg.hasQuestions || nq(t) === 40) && (section !== 'listening' || t.audio_path))

  return (
    <>
      <PageHead
        title={`${cfg.label} testlari`}
        sub={`Kutubxonadagi testlar sessiyalarda qayta-qayta ishlatiladi · ${section === 'listening' ? 'taymer = audio uzunligi' : '60 daqiqa'}, ${cfg.parts} ${cfg.partLabel.toLowerCase()}`}
        actions={<button className="btn-ico" onClick={() => setAdding(true)}><Icon name="plus" /> Yangi test</button>}
      />
      {rows && rows.length > 0 && (
        <Kpis items={[
          { label: 'Testlar', value: rows.length, note: 'kutubxonada' },
          { label: 'Tayyor', value: ready.length, note: cfg.hasQuestions ? '40 ta savol' + (section === 'listening' ? ' va audio' : '') : 'topshiriqlar bilan', hot: true },
          { label: 'Sessiyalarda', value: Object.keys(usage).length, note: 'tanlangan testlar' },
        ]} />
      )}
      <div className="card flush">
        {err && <div className="err" style={{ margin: 16 }}>{err}</div>}
        {rows === null ? <Skeleton /> : rows.length === 0 ? (
          <Empty icon={section} title={`Hali ${cfg.label} testi yo'q`}>«Yangi test» tugmasi bilan birinchi testni yarating.</Empty>
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Test</th>{cfg.hasQuestions && <th>Savollar</th>}{section === 'listening' && <th>Audio</th>}<th className="hide-m">Qaysi sessiyalarda</th><th></th></tr></thead>
              <tbody>
                {rows.map((t) => {
                  const n = nq(t)
                  return (
                    <tr key={t.id} className="click" onClick={() => onOpen(t.id)}>
                      <td className="cell-name"><b>{t.title || cfg.label}</b><small>{section === 'listening' ? (t.duration_seconds ? `audio ${fmtDuration(t.duration_seconds)}` : 'audio yuklanmagan') : '60 daqiqa'}</small></td>
                      {cfg.hasQuestions && <td><div className="meter"><i><b className={n === 40 ? 'full' : ''} style={{ width: `${Math.min(100, (n / 40) * 100)}%` }} /></i><span>{n} / 40</span></div></td>}
                      {section === 'listening' && <td>{t.audio_path ? <span className="pill ok">Bor</span> : <span className="pill bad">Yo'q</span>}</td>}
                      <td className="hide-m">{usage[t.id]?.length ? usage[t.id].join(', ') : <span className="muted">—</span>}</td>
                      <td style={{ width: 48 }}><span className="row-go"><Icon name="arrow" size={16} /></span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {adding && <NewTest section={section} onClose={() => setAdding(false)} onCreated={(id) => { setAdding(false); onOpen(id) }} />}
    </>
  )
}
