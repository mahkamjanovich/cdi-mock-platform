import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { errMsg, formatDate } from '../lib'
import { Icon, PageHead, Kpis, Seg, Modal, Skeleton, Empty, SecChips, Status, toast } from './kit.jsx'

function NewSession({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', exam_date: '', start_time: '09:00' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function create(e) {
    e.preventDefault()
    setErr(''); setBusy(true)
    const { data, error } = await supabase.from('mockp_sessions').insert(form).select().single()
    setBusy(false)
    if (error) return setErr(errMsg(error))
    toast('Sessiya yaratildi')
    onCreated(data.id)
  }

  return (
    <Modal title="Yangi sessiya" onClose={onClose}>
      <form onSubmit={create}>
        <label>Nomi
          <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Masalan: CDI Mock, 9-noyabr" required />
        </label>
        <div className="grid2" style={{ gap: 12 }}>
          <label>Sana<input type="date" value={form.exam_date} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} required /></label>
          <label>Boshlanish vaqti<input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required /></label>
        </div>
        <div className="hint">Sessiya «Qoralama» holatida yaratiladi. Keyin o'quvchilar va testlarni qo'shib, «Faol» qilasiz.</div>
        {err && <div className="err">{err}</div>}
        <div className="foot">
          <button type="button" className="ghost" onClick={onClose}>Bekor qilish</button>
          <button disabled={busy}>{busy ? 'Yaratilmoqda...' : 'Yaratish'}</button>
        </div>
      </form>
    </Modal>
  )
}

export default function Sessions({ onOpen, create, onCreateClose }) {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [showNew, setShowNew] = useState(!!create)

  async function load() {
    const { data, error } = await supabase
      .from('mockp_sessions')
      .select('*, mockp_students(count)')
      .order('exam_date', { ascending: false })
    if (error) setErr(errMsg(error))
    else setRows(data)
  }
  useEffect(() => { load() }, [])

  const count = (s) => s.mockp_students?.[0]?.count ?? 0
  const list = (rows || [])
    .filter((s) => filter === 'all' || s.status === filter)
    .filter((s) => !q.trim() || s.name.toLowerCase().includes(q.trim().toLowerCase()))
  const by = (st) => (rows || []).filter((s) => s.status === st)
  const today = new Date().toISOString().slice(0, 10)
  const next = (rows || []).filter((s) => s.status !== 'closed' && s.exam_date >= today).sort((a, b) => a.exam_date.localeCompare(b.exam_date))[0]
  const totalStudents = (rows || []).reduce((t, s) => t + count(s), 0)

  return (
    <>
      <PageHead
        title="Sessiyalar"
        sub={next ? <>Keyingi imtihon: <b>{formatDate(next.exam_date)}, {next.start_time.slice(0, 5)}</b> · {next.name} · {count(next)} o'quvchi</> : 'Rejalashtirilgan imtihon yo\'q'}
        actions={<button className="btn-ico" onClick={() => setShowNew(true)}><Icon name="plus" /> Yangi sessiya</button>}
      />

      {rows && (
        <Kpis items={[
          { label: 'Faol sessiyalar', value: by('active').length, note: by('active')[0]?.name || 'hozir ochiq sessiya yo\'q', hot: by('active').length > 0 },
          { label: "Jami o'quvchilar", value: totalStudents, note: `${rows.length} ta sessiyada` },
          { label: 'Qoralamalar', value: by('draft').length, note: 'tayyorlanmoqda' },
          { label: 'Yopilgan', value: by('closed').length, note: 'yakunlangan sessiyalar' },
        ]} />
      )}

      <div className="card flush">
        <div className="card-head">
          <Seg value={filter} onChange={setFilter} options={[
            ['all', 'Hammasi', rows?.length], ['active', 'Faol', by('active').length], ['draft', 'Qoralama', by('draft').length], ['closed', 'Yopilgan', by('closed').length],
          ]} />
          <div className="search-in"><Icon name="search" size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sessiyani qidirish" /></div>
        </div>
        {err && <div className="err" style={{ margin: 16 }}>{err}</div>}
        {rows === null ? <Skeleton /> : list.length === 0 ? (
          <Empty title={rows.length ? 'Mos sessiya topilmadi' : "Hali sessiya yo'q"}>
            {rows.length ? 'Filtr yoki qidiruvni o\'zgartirib ko\'ring.' : '«Yangi sessiya» tugmasi bilan birinchi imtihonni rejalashtiring.'}
          </Empty>
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Sessiya</th><th>Holati</th><th className="hide-m">Bo'limlar</th><th className="num-c hide-m">O'quvchilar</th><th></th></tr></thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className="click" onClick={() => onOpen(s.id)}>
                    <td className="cell-name"><b>{s.name}</b><small>{formatDate(s.exam_date)} · {s.start_time?.slice(0, 5)}</small></td>
                    <td><Status status={s.status} /></td>
                    <td className="hide-m"><SecChips s={s} /></td>
                    <td className="num-c hide-m">{count(s)}</td>
                    <td style={{ width: 48 }}><span className="row-go"><Icon name="arrow" size={16} /></span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNew && <NewSession onClose={() => { setShowNew(false); onCreateClose?.() }} onCreated={(id) => { setShowNew(false); onOpen(id) }} />}
    </>
  )
}
