import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import {
  SECTIONS, QTYPES, OPTION_TYPES, FIXED_ANSWERS, parseOptions, optionsToText, errMsg, audioDuration, fmtDuration,
} from '../lib'
import { Icon, PageHead, Seg, Skeleton, toast } from './kit.jsx'
import { t } from './i18n.js'

export async function uploadFile(bucket, folder, file) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const path = `${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type })
  if (error) throw error
  return path
}

export function SignedMedia({ bucket, path, kind, onDuration }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    setUrl(null)
    if (!path) return
    if (path.startsWith('/') || path.startsWith('http')) return setUrl(path) // saytdagi fayl yoki to'liq havola
    supabase.storage.from(bucket).createSignedUrl(path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null))
  }, [bucket, path])
  if (!path) return null
  if (!url) return <div className="muted" style={{ marginTop: 8 }}>Yuklanmoqda...</div>
  return kind === 'audio'
    ? <audio controls src={url} style={{ width: '100%', marginTop: 12 }} onLoadedMetadata={(e) => onDuration?.(e.currentTarget.duration)} />
    : <img src={url} alt="" style={{ maxWidth: '100%', maxHeight: 300, marginTop: 12, borderRadius: 12 }} />
}

function QuestionEditor({ q, testId, partId, onSaved, onDiscard }) {
  const isNew = !q.id
  const [number, setNumber] = useState(q.number)
  const [type, setType] = useState(q.type)
  const [prompt, setPrompt] = useState(q.prompt || '')
  const [optionsText, setOptionsText] = useState(optionsToText(q.options) || q.optionsText || '')
  const [answerText, setAnswerText] = useState((q.accepted || []).join('\n'))
  const [fixed, setFixed] = useState((q.accepted || [])[0] || '')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const hasOptions = OPTION_TYPES.includes(type)
  const fixedList = FIXED_ANSWERS[type]

  async function save() {
    setErr('')
    const accepted = fixedList ? (fixed ? [fixed] : []) : answerText.split('\n').map((s) => s.trim()).filter(Boolean)
    if (!accepted.length) return setErr("To'g'ri javobni kiriting.")
    const options = hasOptions ? parseOptions(type, optionsText) : null
    if (hasOptions && options.length < 2) return setErr('Kamida 2 ta variant kiriting (har qatorda bittadan).')
    const n = Number(number)
    if (!Number.isInteger(n) || n < 1 || n > 40) return setErr('Savol raqami 1 dan 40 gacha bo\'lishi kerak.')

    setBusy(true)
    const row = { test_id: testId, part_id: partId, number: n, type, prompt, options }
    let id = q.id
    if (id) {
      const { error } = await supabase.from('mockp_questions').update(row).eq('id', id)
      if (error) { setBusy(false); return setErr(errMsg(error)) }
    } else {
      const { data, error } = await supabase.from('mockp_questions').insert(row).select('id').single()
      if (error) { setBusy(false); return setErr(errMsg(error)) }
      id = data.id
    }
    const { error: ke } = await supabase.from('mockp_answer_keys').upsert({ question_id: id, accepted }, { onConflict: 'question_id' })
    setBusy(false)
    if (ke) { setErr('Savol saqlandi, lekin javob kaliti saqlanmadi: ' + errMsg(ke)); return onSaved(false) }
    toast(`${n}-savol saqlandi`)
    onSaved(true)
  }

  async function remove() {
    if (isNew) return onDiscard()
    if (!confirm(t(`${q.number}-savol o'chirilsinmi?`))) return
    const { error } = await supabase.from('mockp_questions').delete().eq('id', q.id)
    if (error) setErr(errMsg(error)); else onSaved(true)
  }

  return (
    <div className={'qbox' + (isNew ? ' is-new' : '')}>
      <div className="qhead">
        <label className="num">№<input type="number" min="1" max="40" value={number} onChange={(e) => setNumber(e.target.value)} /></label>
        <label>Savol turi
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {QTYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>
      <label style={{ marginTop: 8 }}>Savol matni
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
          placeholder={type === 'gap_fill' ? 'Masalan: The museum opens at ______ every day.' : ''} />
      </label>
      {hasOptions && (
        <label style={{ marginTop: 8 }}>Variantlar (har qatorda bittadan; kalitlar avtomatik: {type === 'matching_headings' ? 'i, ii, iii...' : 'A, B, C...'})
          <textarea value={optionsText} onChange={(e) => setOptionsText(e.target.value)} />
        </label>
      )}
      <label style={{ marginTop: 8 }}>
        To'g'ri javob{fixedList ? '' : hasOptions ? ` (kalit: ${type === 'matching_headings' ? 'iv' : 'B'}; ko'p to'g'ri kalit bo'lsa har qatorga bittadan)` : ' (har qatorda bitta qabul qilinadigan javob, masalan: colour va color alohida qatorda)'}
        {fixedList ? (
          <select value={fixed} onChange={(e) => setFixed(e.target.value)}>
            <option value="">— tanlang —</option>
            {fixedList.map((v) => <option key={v}>{v}</option>)}
          </select>
        ) : (
          <textarea style={{ minHeight: 60 }} value={answerText} onChange={(e) => setAnswerText(e.target.value)} />
        )}
      </label>
      {err && <div className="err">{err}</div>}
      <div className="actions">
        <button className="small" onClick={save} disabled={busy}>{busy ? 'Saqlanmoqda...' : 'Saqlash'}</button>
        <button className="danger small btn-ico" onClick={remove}>{isNew ? 'Bekor qilish' : <><Icon name="trash" size={14} /> O'chirish</>}</button>
      </div>
    </div>
  )
}

function PartEditor({ section, test, part, questions, keys, nextNumber, reload }) {
  const cfg = SECTIONS[section]
  const [title, setTitle] = useState(part.title)
  const [body, setBody] = useState(part.body || '')
  const [minWords, setMinWords] = useState(part.min_words ?? '')
  const [drafts, setDrafts] = useState([])
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  async function savePart() {
    setErr(''); setMsg('')
    const row = { title, body, min_words: section === 'writing' && minWords !== '' ? Number(minWords) : null }
    const { error } = await supabase.from('mockp_parts').update(row).eq('id', part.id)
    if (error) setErr(errMsg(error)); else { toast(`${title} saqlandi`); reload() }
  }

  async function uploadImage(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setErr(''); setMsg('')
    try {
      const path = await uploadFile('mockp-images', test.id, file)
      const { error } = await supabase.from('mockp_parts').update({ image_path: path }).eq('id', part.id)
      if (error) throw error
      if (part.image_path) await supabase.storage.from('mockp-images').remove([part.image_path])
      reload()
    } catch (x) { setErr(errMsg(x)) }
  }

  async function removeImage() {
    const { error } = await supabase.from('mockp_parts').update({ image_path: null }).eq('id', part.id)
    if (error) return setErr(errMsg(error))
    await supabase.storage.from('mockp-images').remove([part.image_path])
    reload()
  }

  function addDraft() {
    const last = questions[questions.length - 1]
    const base = Math.max(nextNumber, ...drafts.map((d) => d.number + 1))
    const type = last?.type || 'gap_fill'
    setDrafts([...drafts, {
      tmp: crypto.randomUUID(), number: base, type, prompt: '',
      options: OPTION_TYPES.includes(type) ? last?.options : null, // oldingi savolning variantlari nusxalanadi
    }])
  }

  return (
    <div className="card">
      <div className="row">
        <label>{cfg.partLabel} nomi<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        {section === 'writing' && (
          <label style={{ flex: '0 0 160px' }}>Minimal so'z soni<input type="number" value={minWords} onChange={(e) => setMinWords(e.target.value)} /></label>
        )}
      </div>
      <label style={{ marginTop: 10 }}>
        {section === 'reading' ? 'Passage matni' : section === 'writing' ? 'Topshiriq matni' : "Ko'rsatma (ixtiyoriy)"}
        <textarea className={section === 'reading' ? 'big' : ''} value={body} onChange={(e) => setBody(e.target.value)}
          placeholder={section === 'reading' ? "Paragraflarni A, B, C... deb belgilab yozing (Matching uchun)" : ''} />
      </label>
      {section === 'writing' && (
        <div style={{ marginTop: 14 }}>
          <label className="drop">
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadImage} />
            <span className="ic"><Icon name="image" /></span>
            <span><b>{part.image_path ? 'Rasmni almashtirish' : 'Rasm / diagramma yuklash'}</b><small>Ixtiyoriy, odatda Task 1 uchun · PNG, JPG, WEBP</small></span>
          </label>
          <SignedMedia bucket="mockp-images" path={part.image_path} kind="image" />
          {part.image_path && <div className="actions"><button className="danger small" onClick={removeImage}>Rasmni olib tashlash</button></div>}
        </div>
      )}
      {err && <div className="err">{err}</div>}
      {msg && <div className="msg">{msg}</div>}
      <div className="actions"><button onClick={savePart}>{`${cfg.partLabel} ni saqlash`}</button></div>

      {cfg.hasQuestions && (
        <>
          <h3 style={{ marginTop: 28 }}>Savollar <span className="pill info" style={{ marginLeft: 6 }}>{questions.length}</span></h3>
          {questions.map((q) => (
            <QuestionEditor key={q.id + ':' + q.number} q={{ ...q, accepted: keys[q.id] }} testId={test.id} partId={part.id} onSaved={reload} />
          ))}
          {drafts.map((d) => (
            <QuestionEditor key={d.tmp} q={d} testId={test.id} partId={part.id}
              onDiscard={() => setDrafts(drafts.filter((x) => x.tmp !== d.tmp))}
              onSaved={async (ok) => { if (ok) setDrafts((cur) => cur.filter((x) => x.tmp !== d.tmp)); await reload() }} />
          ))}
          <button className="add-q btn-ico" onClick={addDraft}><Icon name="plus" size={16} /> Savol qo'shish</button>
        </>
      )}
    </div>
  )
}

export default function TestEditor({ testId, onBack }) {
  const [state, setState] = useState({ loading: true })
  const [form, setForm] = useState({ title: '', duration_minutes: 40 })
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [pi, setPi] = useState(0)

  async function load() {
    const { data: test, error } = await supabase.from('mockp_tests').select('*').eq('id', testId).maybeSingle()
    if (error) return setState({ error: errMsg(error) })
    if (!test) return setState({ error: 'Test topilmadi.' })
    const col = `${test.section}_test_id`
    const [{ data: parts }, { data: questions }, { count: sessionCount }, { count: attemptCount }] = await Promise.all([
      supabase.from('mockp_parts').select('*').eq('test_id', test.id).order('position'),
      supabase.from('mockp_questions').select('*').eq('test_id', test.id).order('number'),
      supabase.from('mockp_sessions').select('id', { count: 'exact', head: true }).eq(col, test.id),
      supabase.from('mockp_attempts').select('id', { count: 'exact', head: true }).eq('test_id', test.id),
    ])
    let keys = {}
    if (questions?.length) {
      const { data } = await supabase.from('mockp_answer_keys').select('question_id, accepted').in('question_id', questions.map((q) => q.id))
      for (const k of data || []) keys[k.question_id] = k.accepted
    }
    setForm({ title: test.title, duration_minutes: test.duration_minutes })
    setState({ test, parts: parts || [], questions: questions || [], keys, sessionCount: sessionCount || 0, attemptCount: attemptCount || 0 })
  }
  useEffect(() => { load() }, [testId])

  // Listening vaqti audio uzunligidan olinadi, Reading va Writing esa doim 60 daqiqa
  async function saveTest() {
    setErr(''); setMsg('')
    const patch = { title: form.title }
    if (state.test.section !== 'listening') patch.duration_minutes = 60
    const { error } = await supabase.from('mockp_tests').update(patch).eq('id', state.test.id)
    if (error) setErr(errMsg(error)); else { toast('Test sozlamalari saqlandi'); load() }
  }

  // Avval yuklangan audio uchun uzunlik hali saqlanmagan bo'lsa, pleyer o'lchagan qiymat yoziladi
  async function syncDuration(secs) {
    const s = Math.round(secs)
    if (!Number.isFinite(s) || s <= 0 || s === state.test.duration_seconds) return
    const { error } = await supabase.from('mockp_tests').update({ duration_seconds: s, duration_minutes: Math.max(1, Math.ceil(s / 60)) }).eq('id', state.test.id)
    if (!error) load()
  }

  async function uploadAudio(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setErr(''); setMsg('Audio yuklanmoqda...')
    try {
      const secs = Math.round(await audioDuration(file))
      const path = await uploadFile('mockp-audio', state.test.id, file)
      const { error } = await supabase.from('mockp_tests')
        .update({ audio_path: path, duration_seconds: secs, duration_minutes: Math.max(1, Math.ceil(secs / 60)) }).eq('id', state.test.id)
      if (error) throw error
      if (state.test.audio_path && !state.test.audio_path.startsWith('/')) await supabase.storage.from('mockp-audio').remove([state.test.audio_path])
      setMsg('')
      toast(`Audio yuklandi · taymer ${fmtDuration(secs)}`)
      load()
    } catch (x) { setMsg(''); setErr(errMsg(x)) }
  }

  async function removeTest() {
    if (!confirm(t(`«${state.test.title}» testi barcha savollari va javoblar kaliti bilan o'chirilsinmi?`))) return
    const { error } = await supabase.from('mockp_tests').delete().eq('id', state.test.id)
    if (error) return setErr(errMsg(error))
    if (state.test.audio_path && !state.test.audio_path.startsWith('/')) await supabase.storage.from('mockp-audio').remove([state.test.audio_path])
    const files = state.parts.filter((p) => p.image_path).map((p) => p.image_path)
    if (files.length) await supabase.storage.from('mockp-images').remove(files)
    onBack()
  }

  if (state.loading) return <Skeleton rows={6} />
  if (state.error) return <div className="err">{state.error}</div>

  const { test, parts, questions, keys, sessionCount, attemptCount } = state
  const section = test.section
  const cfg = SECTIONS[section]
  const total = questions.length
  const nextNumber = (questions.reduce((m, q) => Math.max(m, q.number), 0)) + 1
  const part = parts[Math.min(pi, parts.length - 1)]
  const timerText = section !== 'listening' ? '60 daqiqa'
    : test.duration_seconds ? `taymer ${fmtDuration(test.duration_seconds)} (audio uzunligi)`
    : test.audio_path ? 'audio uzunligi aniqlanmoqda...' : 'taymer audio yuklangach belgilanadi'

  return (
    <>
      <PageHead
        back={{ label: `${cfg.label} testlari`, onClick: onBack }}
        title={test.title || cfg.label}
        sub={<span style={{ display: 'inline-flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {cfg.label} · {timerText}
          {cfg.hasQuestions && <span className={'pill ' + (total === 40 ? 'ok' : 'warn')}>{total} / 40 savol</span>}
          {section === 'listening' && <span className={'pill ' + (test.audio_path ? 'ok' : 'bad')}>{test.audio_path ? 'Audio bor' : "Audio yo'q"}</span>}
        </span>}
        actions={<button className="danger btn-ico" onClick={removeTest}><Icon name="trash" size={16} /> Testni o'chirish</button>}
      />
      {(sessionCount > 0 || attemptCount > 0) && (
        <div className="hint" style={{ marginBottom: 20 }}>
          {`Bu test ${sessionCount} ta sessiyada tanlangan${attemptCount > 0 ? `, ${attemptCount} ta topshirilgan urinish bor` : ''}. Savol yoki javoblar kalitini o'zgartirsangiz, avval topshirilgan natijalar qayta hisoblanmaydi; hozir ishlayotgan o'quvchilarga esa o'zgarish darhol ta'sir qiladi.`}
        </div>
      )}
      <div className="card">
        <h2>Test sozlamalari</h2>
        <div className="row">
          <label>Test nomi<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <div className="dur-box"><span>Taymer</span><b>{section === 'listening' ? (test.duration_seconds ? fmtDuration(test.duration_seconds) : '—') : '60:00'}</b><small>{section === 'listening' ? 'audio uzunligiga teng, avtomatik' : 'avtomatik'}</small></div>
          <button onClick={saveTest}>Saqlash</button>
        </div>
        {section === 'listening' && (
          <div style={{ marginTop: 18 }}>
            <label className="drop">
              <input type="file" accept="audio/*" onChange={uploadAudio} />
              <span className="ic"><Icon name="audio" /></span>
              <span><b>{test.audio_path ? 'Audioni almashtirish' : 'Audio fayl yuklash'}</b><small>mp3, m4a yoki wav · bepul Supabase tarifida odatda 50 MB gacha</small></span>
            </label>
            <SignedMedia bucket="mockp-audio" path={test.audio_path} kind="audio" onDuration={syncDuration} />
          </div>
        )}
        {msg && <div className="msg" style={{ marginTop: 12 }}>{msg}</div>}
        {err && <div className="err" style={{ marginTop: 12 }}>{err}</div>}
      </div>

      <div className="part-nav">
        <Seg value={part.id} onChange={(id) => setPi(parts.findIndex((p) => p.id === id))}
          options={parts.map((p) => [p.id, p.title, cfg.hasQuestions ? questions.filter((q) => q.part_id === p.id).length : undefined])} />
      </div>
      <PartEditor key={part.id} section={section} test={test} part={part} reload={load} nextNumber={nextNumber}
        questions={questions.filter((q) => q.part_id === part.id)} keys={keys} />
    </>
  )
}
