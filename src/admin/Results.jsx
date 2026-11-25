import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { errMsg, formatDate, bandText, downloadCsv } from '../lib'
import { Icon, PageHead, Kpis, Skeleton, Empty, Initials } from './kit.jsx'

const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + Number(b), 0) / xs.length : null)

// Overall band taqsimoti: har bir band bo'yicha o'quvchilar soni
function Histogram({ values }) {
  const bins = []
  for (let b = 4; b <= 9; b += 0.5) bins.push([b, values.filter((v) => Number(v) === b).length])
  const show = bins
  const max = Math.max(1, ...show.map(([, n]) => n))
  const top = show.reduce((m, x) => (x[1] > m[1] ? x : m), [0, 0])
  const w = 400 / show.length
  return (
    <svg className="hist" viewBox="0 0 400 190" role="img" aria-label="Overall band taqsimoti">
      {show.map(([b, n], i) => {
        const h = (n / max) * 130
        return (
          <g key={b}>
            <rect x={i * w + w * 0.18} y={150 - h} width={w * 0.64} height={Math.max(h, 2)} rx="7" fill={b === top[0] && n ? 'var(--hl)' : 'var(--line-strong)'} style={{ animationDelay: `${i * 0.06}s` }} />
            {n > 0 && <text x={i * w + w / 2} y={142 - h} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--ink)">{n}</text>}
            <text x={i * w + w / 2} y="172" textAnchor="middle" fontSize="12" fill="var(--muted)">{b.toFixed(1)}</text>
          </g>
        )
      })}
    </svg>
  )
}

const touched = (r) => [r.listening_status, r.reading_status, r.writing_status].some((s) => s !== 'not_started') || r.speaking_band != null
const overallText = (r) => (r.overall != null ? bandText(r.overall) : touched(r) ? 'kutilmoqda' : '')

export default function Results() {
  const [sessions, setSessions] = useState(null)
  const [sessionId, setSessionId] = useState('')
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')

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
    setErr(''); setRows(null)
    await supabase.rpc('mockp_finalize_expired')
    const { data, error } = await supabase.rpc('mockp_session_results', { p_session: sessionId })
    if (error) setErr(errMsg(error)); else setRows(data)
  }
  useEffect(() => { load() }, [sessionId])

  const session = sessions?.find((s) => s.id === sessionId)
  const fileBase = () => `natijalar-${session?.name || 'sessiya'}`.replace(/[\\/:*?"<>|]/g, '_')

  function exportCsv() {
    downloadCsv(`${fileBase()}.csv`, rows.map((r, i) => ({
      '№': i + 1, 'Ism-familiya': r.full_name, 'ID kod': r.code, 'Telefon': r.phone || '', 'Telegram': r.telegram ? '@' + r.telegram : '',
      'Listening raw': r.listening_raw ?? '', 'Listening band': bandText(r.listening_band),
      'Reading raw': r.reading_raw ?? '', 'Reading band': bandText(r.reading_band),
      'Writing Task 1': bandText(r.writing_task1), 'Writing Task 2': bandText(r.writing_task2), 'Writing band': bandText(r.writing_band),
      'Speaking band': bandText(r.speaking_band), 'Overall band': overallText(r),
    })))
  }

  async function exportXlsx() {
    const head = ['№', 'Ism-familiya', 'ID kod', 'Telefon', 'Telegram', 'Listening raw', 'Listening band', 'Reading raw', 'Reading band',
      'Writing Task 1', 'Writing Task 2', 'Writing band', 'Speaking band', 'Overall band']
    const num = (v, format) => (v == null ? null : { value: Number(v), type: Number, ...(format ? { format } : {}) })
    const txt = (v) => (v ? { value: String(v), type: String } : null)
    const data = [
      head.map((h) => ({ value: h, fontWeight: 'bold' })),
      ...rows.map((r, i) => [
        num(i + 1), txt(r.full_name), txt(r.code), txt(r.phone), txt(r.telegram ? '@' + r.telegram : ''),
        num(r.listening_raw), num(r.listening_band, '0.0'), num(r.reading_raw), num(r.reading_band, '0.0'),
        num(r.writing_task1, '0.0'), num(r.writing_task2, '0.0'), num(r.writing_band, '0.0'),
        num(r.speaking_band, '0.0'),
        r.overall != null ? num(r.overall, '0.0') : txt(overallText(r)),
      ]),
    ]
    const columns = [{ width: 5 }, { width: 28 }, { width: 8 }, { width: 16 }, { width: 16 }, ...Array(9).fill({ width: 14 })]
    const { default: writeExcelFile } = await import('write-excel-file/browser')
    await writeExcelFile(data, { columns, stickyRowsCount: 1 }).toFile(`${fileBase()}.xlsx`)
  }

  if (sessions === null) return err ? <div className="err">{err}</div> : <Skeleton rows={5} />
  if (!sessions.length) return <Empty icon="results" title="Hali sessiya yo'q">Natijalar sessiya o'tkazilgandan keyin shu yerda chiqadi.</Empty>

  const pendingW = rows ? rows.filter((r) => r.writing_status === 'submitted' && r.writing_band == null).length : 0
  const noSpeaking = rows ? rows.filter((r) => r.speaking_band == null && touched(r)).length : 0
  const overalls = (rows || []).filter((r) => r.overall != null).map((r) => r.overall)
  const secAvg = (k) => avg((rows || []).map((r) => r[`${k}_band`]).filter((x) => x != null))
  const Band = ({ v, sub }) => (v == null ? <span className="muted">—</span> : <><span className="band-chip">{bandText(v)}</span>{sub && <span className="band-sub">{sub}</span>}</>)
  const sec = (status, raw, band) => status === 'not_started' ? <span className="muted">—</span>
    : status === 'in_progress' ? <span className="pill warn">jarayonda</span>
    : <Band v={band} sub={raw != null ? `${raw} / 40` : null} />

  return (
    <>
      <PageHead
        title="Natijalar"
        sub={session ? <><b>{session.name}</b> · {formatDate(session.exam_date)}</> : null}
        actions={<>
          <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} style={{ width: 'auto', minWidth: 240, background: 'var(--field)' }} aria-label="Sessiya">
            {sessions.map((s) => <option key={s.id} value={s.id}>{s.name} · {formatDate(s.exam_date)}</option>)}
          </select>
          <button className="ghost icon-only btn-ico" onClick={load} title="Yangilash"><Icon name="refresh" size={16} /></button>
          <button className="ghost btn-ico" onClick={exportCsv} disabled={!rows?.length}><Icon name="download" size={16} /> CSV</button>
          <button className="btn-ico" onClick={exportXlsx} disabled={!rows?.length}><Icon name="download" size={16} /> Excel</button>
        </>}
      />
      {err && <div className="err" style={{ marginBottom: 16 }}>{err}</div>}

      {rows && rows.length > 0 && (
        <>
          <Kpis items={[
            { label: "O'quvchilar", value: rows.length, note: `${overalls.length} tasida Overall tayyor` },
            { label: "O'rtacha Overall", value: avg(overalls) ?? '—', dec: 1, note: overalls.length ? `eng yuqori ${bandText(Math.max(...overalls))}` : 'hali hisoblanmagan', hot: true },
            { label: 'Writing baholanmagan', value: pendingW, note: pendingW ? '«Baholash» bo\'limida' : 'hammasi baholangan' },
            { label: 'Speaking kiritilmagan', value: noSpeaking, note: noSpeaking ? '«Baholash» bo\'limida' : 'hammasi kiritilgan' },
          ]} />
          <div className="grid2">
            <div className="card">
              <div className="card-title"><h2>Overall taqsimoti</h2><span className="muted">{overalls.length} ta o'quvchi</span></div>
              {overalls.length ? <Histogram values={overalls} /> : <Empty icon="results" title="Hali Overall yo'q">To'rt bo'lim ham baholangach chiqadi.</Empty>}
            </div>
            <div className="card">
              <div className="card-title"><h2>Bo'limlar bo'yicha o'rtacha</h2></div>
              <div className="sec-avgs">
                {[['listening', 'Listening'], ['reading', 'Reading'], ['writing', 'Writing'], ['speaking', 'Speaking']].map(([k, l]) => {
                  const v = secAvg(k)
                  return (
                    <div key={k} className="sec-avg">
                      <span>{l}</span>
                      <i><b style={{ width: `${((v ?? 0) / 9) * 100}%` }} /></i>
                      <strong>{v == null ? '—' : v.toFixed(1)}</strong>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="card flush">
        {rows === null ? <Skeleton /> : rows.length === 0 ? <Empty icon="users" title="Bu sessiyada o'quvchi yo'q" /> : (
          <div className="tbl-wrap">
            <table>
              <thead><tr>
                <th>№</th><th>O'quvchi</th><th>Listening</th><th>Reading</th><th>Writing</th><th>Speaking</th><th>Overall</th>
              </tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.student_id}>
                    <td className="muted">{i + 1}</td>
                    <td><div className="person"><Initials name={r.full_name} /><div className="cell-name"><b>{r.full_name}</b><small>ID {r.code}</small></div></div></td>
                    <td>{sec(r.listening_status, r.listening_raw, r.listening_band)}</td>
                    <td>{sec(r.reading_status, r.reading_raw, r.reading_band)}</td>
                    <td>{r.writing_status === 'not_started' ? <span className="muted">—</span> : r.writing_status === 'in_progress' ? <span className="pill warn">jarayonda</span>
                      : r.writing_band == null ? <span className="pill mute">baholanmagan</span>
                      : <Band v={r.writing_band} sub={`T1 ${bandText(r.writing_task1) || '—'} · T2 ${bandText(r.writing_task2) || '—'}`} />}</td>
                    <td><Band v={r.speaking_band} /></td>
                    <td>{r.overall != null ? <span className="band-chip hi">{bandText(r.overall)}</span> : <span className="muted">{overallText(r) || '—'}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
