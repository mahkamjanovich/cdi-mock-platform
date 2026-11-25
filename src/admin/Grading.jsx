import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { errMsg, formatDate, BAND_OPTIONS, bandText } from '../lib'
import { Icon, PageHead, Kpis, Seg, Drawer, Skeleton, Empty, Initials, toast } from './kit.jsx'

const countWords = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0)
// Writing bali: (Task 1 + Task 2) / 2, pastga 0.5 ga yaxlitlanadi; baholanmagan Task 0 hisoblanadi (7 + 7.5 → 7, 7 + 0 → 3.5)
const writingBand = (bands) => Math.floor(bands.reduce((t, x) => t + Number(x), 0)) / 2

function TaskGrader({ attemptId, part, response, score, userId, onSaved }) {
  const [f, setF] = useState(() => ({ band: score?.band ?? '', feedback: score?.feedback ?? '' }))
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const complete = f.band !== ''
  const preview = complete ? Number(f.band) : null
  const text = response?.body || ''
  const words = countWords(text)
  const imgUrl = !part.image_path ? null
    : part.image_path.startsWith('/') || part.image_path.startsWith('http') ? part.image_path // saytdagi fayl yoki to'liq havola
    : supabase.storage.from('mockp-images').getPublicUrl(part.image_path).data.publicUrl

  async function save() {
    setErr(''); setMsg('')
    if (!complete) return setErr('Task bandini tanlang.')
    const b = Number(f.band) // bitta ball: jadvaldagi 4 mezon ustuniga bir xil yoziladi, band shundan hisoblanadi
    const row = {
      attempt_id: attemptId, part_id: part.id,
      task_achievement: b, coherence: b, lexical: b, grammar: b,
      feedback: f.feedback.trim() || null, graded_by: userId, graded_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('mockp_writing_scores').upsert(row, { onConflict: 'attempt_id,part_id' })
    if (error) setErr(errMsg(error)); else { setMsg(''); toast(`${part.title} baholandi: ${preview.toFixed(1)}`); onSaved() }
  }

  return (
    <div className="task-grade">
      <div className="tg-head">
        <h3>{part.title}</h3>
        {score ? <span className="pill ok">baholangan · {bandText(score.band)}</span> : <span className="pill mute">baholanmagan</span>}
      </div>
      <details className="task-q">
        <summary>Topshiriq matni</summary>
        <div className="passage" style={{ margin: '8px 0' }}>{part.body}</div>
        {imgUrl && <img className="task-img" src={imgUrl} alt="" />}
      </details>
      <div className="muted" style={{ marginTop: 12 }}>
        O'quvchi javobi: <b style={{ color: 'var(--ink)' }}>{words}</b> so'z{part.min_words ? <> · minimal {part.min_words}{words < part.min_words ? <b style={{ color: 'var(--bad)' }}> · yetmagan</b> : ''}</> : ''}
      </div>
      <div className="answer-box">{text || <span className="muted">(javob yozilmagan)</span>}</div>
      <label style={{ marginTop: 14 }}>{part.title} bandi
        <select value={f.band} onChange={(e) => setF({ ...f, band: e.target.value })}>
          <option value="">—</option>
          {BAND_OPTIONS.map((n) => <option key={n} value={n}>{n.toFixed(1)}</option>)}
        </select>
      </label>
      <label style={{ marginTop: 14 }}>Izoh
        <textarea value={f.feedback} onChange={(e) => setF({ ...f, feedback: e.target.value })} placeholder="Kuchli tomonlari va nimani yaxshilash kerakligi..." />
      </label>
      <div className="tg-foot">
        <span className="task-band">Task bandi <b key={preview}>{preview != null ? preview.toFixed(1) : '—'}</b></span>
        <button onClick={save} disabled={!complete}>Saqlash</button>
      </div>
      {msg && <div className="msg">{msg}</div>}
      {err && <div className="err" style={{ marginTop: 10 }}>{err}</div>}
    </div>
  )
}

function WritingGrader({ item, userId, onClose, onChanged }) {
  const [state, setState] = useState(null)
  const [err, setErr] = useState('')

  async function load() {
    const [{ data: parts, error }, { data: resp }, { data: scores }] = await Promise.all([
      supabase.from('mockp_parts').select('*').eq('test_id', item.attempt.test_id).order('position'),
      supabase.from('mockp_writing_responses').select('*').eq('attempt_id', item.attempt.id),
      supabase.from('mockp_writing_scores').select('*').eq('attempt_id', item.attempt.id),
    ])
    if (error) return setErr(errMsg(error))
    setState({ parts, resp: resp || [], scores: scores || [] })
  }
  useEffect(() => { load() }, [item.attempt.id])

  const band = state && state.scores.length ? writingBand(state.scores.map((x) => x.band)) : null

  return (
    <Drawer title={item.student.full_name} sub={`Writing · ID ${item.student.code}`} onClose={onClose}>
      {err && <div className="err">{err}</div>}
      {!state ? <Skeleton rows={6} /> : (
        <>
          <div className="w-band">
            <div><span>Writing bandi</span><b key={band}>{band != null ? band.toFixed(1) : '—'}</b></div>
            <p>(Task 1 + Task 2) / 2, avtomatik. Bitta Task baholansa, ikkinchisi 0 hisoblanadi: 7 va 0 → 3.5.</p>
          </div>
          {state.parts.map((p) => (
            <TaskGrader key={p.id + ':' + (state.scores.find((s) => s.part_id === p.id)?.graded_at || '')}
              attemptId={item.attempt.id} part={p} userId={userId}
              response={state.resp.find((r) => r.part_id === p.id)}
              score={state.scores.find((s) => s.part_id === p.id)}
              onSaved={() => { load(); onChanged() }} />
          ))}
        </>
      )}
    </Drawer>
  )
}

export default function Grading({ userId, role }) {
  const canWriting = ['admin', 'teacher', 'writing_teacher'].includes(role)
  const canSpeaking = ['admin', 'teacher', 'speaking_teacher'].includes(role)
  const [sessions, setSessions] = useState(null)
  const [sessionId, setSessionId] = useState('')
  const [data, setData] = useState(null)
  const [open, setOpen] = useState(null)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    supabase.from('mockp_sessions').select('id, name, exam_date, status').order('exam_date', { ascending: false })
      .then(({ data, error }) => {
        if (error) return setErr(errMsg(error))
        setSessions(data)
        if (data.length) setSessionId(data.find((s) => s.status === 'active')?.id || data[0].id)
      })
  }, [])

  async function load() {
    if (!sessionId) return
    setErr('')
    if (canWriting) await supabase.rpc('mockp_finalize_expired') // vaqti o'tgan Writing urinishlari ham yakunlanadi
    const none = Promise.resolve({ data: [], error: null })
    const [st, at, sp] = await Promise.all([
      supabase.from('mockp_students').select('id, full_name, code').eq('session_id', sessionId).order('full_name'),
      canWriting
        ? supabase.from('mockp_attempts').select('id, student_id, test_id, submitted_at, mockp_students!inner(session_id)')
            .eq('section', 'writing').eq('mockp_students.session_id', sessionId)
        : none,
      canSpeaking ? supabase.from('mockp_speaking_scores').select('student_id, band') : none,
    ])
    const e = st.error || at.error || sp.error
    if (e) return setErr(errMsg(e))
    const ids = at.data.map((a) => a.id)
    let scores = []
    if (ids.length) {
      const r = await supabase.from('mockp_writing_scores').select('attempt_id, band').in('attempt_id', ids)
      scores = r.data || []
    }
    setData({ students: st.data, attempts: at.data, scores, speaking: Object.fromEntries(sp.data.map((x) => [x.student_id, x.band])) })
  }
  useEffect(() => { setOpen(null); setData(null); load() }, [sessionId])

  async function setSpeaking(studentId, value) {
    setErr('')
    const { error } = await supabase.from('mockp_speaking_scores')
      .upsert({ student_id: studentId, band: Number(value), graded_by: userId, graded_at: new Date().toISOString() }, { onConflict: 'student_id' })
    if (error) setErr(errMsg(error))
    else {
      setData((d) => ({ ...d, speaking: { ...d.speaking, [studentId]: Number(value) } }))
      toast(`Speaking: ${Number(value).toFixed(1)} saqlandi`)
    }
  }

  // Har bir o'quvchining Writing holati: boshlamagan / jarayonda / baholanmagan / baholangan
  function wState(s) {
    const a = data.attempts.find((x) => x.student_id === s.id)
    if (!a) return { kind: 'none' }
    if (!a.submitted_at) return { kind: 'progress', a }
    const sc = data.scores.filter((x) => x.attempt_id === a.id)
    if (!sc.length) return { kind: 'pending', a }
    return { kind: 'done', a, n: sc.length, band: writingBand(sc.map((x) => x.band)) }
  }

  function writingCell(s) {
    const w = wState(s)
    if (w.kind === 'none') return <span className="muted">boshlamagan</span>
    if (w.kind === 'progress') return <span className="pill warn">jarayonda</span>
    return (
      <div className="w-cell">
        {w.kind === 'done' ? <span className="pill ok">{w.n} ta Task · band {bandText(w.band)}</span> : <span className="pill bad">baholanmagan</span>}
        <button className={'small' + (w.kind === 'done' ? ' ghost' : '')} onClick={() => setOpen({ attempt: w.a, student: s })}>{w.kind === 'done' ? "Ko'rish" : 'Baholash'}</button>
      </div>
    )
  }

  if (sessions === null) return err ? <div className="err">{err}</div> : <Skeleton rows={5} />
  if (!sessions.length) return <Empty icon="grading" title="Hali sessiya yo'q">Baholash uchun avval sessiya o'tkazilishi kerak.</Empty>

  const session = sessions.find((s) => s.id === sessionId)
  const states = data ? data.students.map((s) => [s, canWriting ? wState(s) : { kind: 'none' }]) : []
  const pending = states.filter(([, w]) => w.kind === 'pending').length
  const graded = states.filter(([, w]) => w.kind === 'done').length
  const spoken = data ? data.students.filter((s) => data.speaking[s.id] != null).length : 0
  const noSpeak = data ? data.students.length - spoken : 0
  const list = states.filter(([s, w]) => filter === 'all' || (filter === 'pending' && w.kind === 'pending') || (filter === 'speaking' && data.speaking[s.id] == null))

  return (
    <>
      <PageHead
        title="Baholash"
        sub={session ? <><b>{session.name}</b> · {formatDate(session.exam_date)}</> : null}
        actions={<>
          <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} style={{ width: 'auto', minWidth: 240, background: 'var(--field)' }} aria-label="Sessiya">
            {sessions.map((s) => <option key={s.id} value={s.id}>{s.name} · {formatDate(s.exam_date)}</option>)}
          </select>
          <button className="ghost icon-only btn-ico" onClick={load} title="Yangilash" aria-label="Yangilash"><Icon name="refresh" size={16} /></button>
        </>}
      />
      {err && <div className="err" style={{ marginBottom: 16 }}>{err}</div>}

      {data && data.students.length > 0 && (
        <Kpis items={[
          ...(canWriting ? [
            { label: 'Writing kutmoqda', value: pending, note: pending ? 'baholanishi kerak' : 'hammasi baholangan', hot: pending > 0 },
            { label: 'Writing baholangan', value: graded, note: `${states.filter(([, w]) => w.kind !== 'none').length} ta topshirgan` },
          ] : []),
          ...(canSpeaking ? [{ label: 'Speaking kiritilgan', value: spoken, note: `${data.students.length} ta o'quvchidan`, hot: !canWriting }] : []),
        ]} />
      )}

      <div className="card flush">
        <div className="card-head">
          <Seg value={filter} onChange={setFilter} options={[
            ['all', 'Hammasi', data?.students.length],
            ...(canWriting ? [['pending', 'Writing kutmoqda', pending]] : []),
            ...(canSpeaking ? [['speaking', "Speaking yo'q", noSpeak]] : []),
          ]} />
          {canSpeaking && <span className="muted">Speaking bali tanlanishi bilan saqlanadi</span>}
        </div>
        {!data ? <Skeleton /> : data.students.length === 0 ? <Empty icon="users" title="Bu sessiyada o'quvchi yo'q" /> : list.length === 0 ? (
          <Empty icon="grading" title="Hammasi bajarilgan">Bu filtr bo'yicha kutayotgan ish qolmadi.</Empty>
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>№</th><th>O'quvchi</th>{canWriting && <th>Writing</th>}{canSpeaking && <th>Speaking bali</th>}</tr></thead>
              <tbody>
                {list.map(([s]) => (
                  <tr key={s.id}>
                    <td className="muted">{data.students.indexOf(s) + 1}</td>
                    <td><div className="person"><Initials name={s.full_name} /><div className="cell-name"><b>{s.full_name}</b><small>ID {s.code}</small></div></div></td>
                    {canWriting && <td>{writingCell(s)}</td>}
                    {canSpeaking && (
                      <td>
                        <select className={'sp-sel' + (data.speaking[s.id] != null ? ' set' : '')} value={data.speaking[s.id] ?? ''} onChange={(e) => setSpeaking(s.id, e.target.value)} aria-label={`${s.full_name}: Speaking bali`}>
                          <option value="" disabled>— kiriting —</option>
                          {BAND_OPTIONS.map((n) => <option key={n} value={n}>{n.toFixed(1)}</option>)}
                        </select>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && <WritingGrader key={open.attempt.id} item={open} userId={userId} onClose={() => setOpen(null)} onChanged={load} />}
    </>
  )
}
