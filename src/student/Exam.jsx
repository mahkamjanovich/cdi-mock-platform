import { useEffect, useRef, useState } from 'react'
import * as api from './api'
import Highlightable from './Highlightable.jsx'
import QuestionList from './QuestionList.jsx'
import AudioPlayer from './AudioPlayer.jsx'
import { Loading } from '../ui.jsx'

const LABEL = { listening: 'Listening', reading: 'Reading', writing: 'Writing' }
const DIRTY = (id) => `mockp_dirty_${id}`
const HL = (id) => `mockp_hl_${id}`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const countWords = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0)
const fmt = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
const SAVE_TEXT = {
  saved: 'Saved ✓',
  saving: 'Saving...',
  offline: 'No internet: answers are being saved on this device',
  closed: 'Time is up',
}

export default function Exam({ code, section, studentName, onExit }) {
  const [phase, setPhase] = useState('loading') // loading | running | submitting | done | error
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [answers, setAnswers] = useState({})
  const [writing, setWriting] = useState({})
  const [hl, setHl] = useState({})
  const [pi, setPi] = useState(0)
  const [pane, setPane] = useState('text')
  const [cur, setCur] = useState(null)
  const [left, setLeft] = useState(0)
  const [saveState, setSaveState] = useState('saved')
  const [result, setResult] = useState(null)
  const [confirm, setConfirm] = useState(false)

  const attemptId = useRef(null)
  const offset = useRef(0)
  const startedAt = useRef(0)
  const deadline = useRef(0)
  const dirty = useRef(new Map())
  const timer = useRef(null)
  const flushing = useRef(false)
  const submitting = useRef(false)
  const answersRef = useRef({})
  answersRef.current = answers

  // ---------- boshlash / davom ettirish ----------
  useEffect(() => {
    let dead = false
    ;(async () => {
      try {
        const r = await api.start(code, section)
        if (dead) return
        if (r.status === 'already_submitted' || r.status === 'time_over') {
          const res = await api.results(code)
          if (dead) return
          setResult({ res, note: r.status === 'time_over' ? 'Time was up, your answers were submitted automatically.' : null })
          return setPhase('done')
        }
        attemptId.current = r.attempt.id
        offset.current = Date.parse(r.server_now) - Date.now()
        startedAt.current = Date.parse(r.attempt.started_at)
        deadline.current = Date.parse(r.attempt.deadline_at)
        const ans = {}
        for (const a of r.answers) ans[a.question_id] = { answer: a.answer, flagged: a.flagged }
        const wr = {}
        for (const w of r.writing) wr[w.part_id] = w.body
        // Qurilmada saqlanib, serverga yetib bormagan o'zgarishlar qayta qo'llanadi
        try {
          for (const it of JSON.parse(localStorage.getItem(DIRTY(r.attempt.id)) || '[]')) {
            dirty.current.set(it.key, it)
            if (it.kind === 'a') ans[it.qid] = { answer: it.answer, flagged: it.flagged }
            else wr[it.partId] = it.body
          }
        } catch { /* eslint-disable-line no-empty */ }
        try { setHl(JSON.parse(localStorage.getItem(HL(r.attempt.id)) || '{}')) } catch { /* eslint-disable-line no-empty */ }
        setData(r.test); setAnswers(ans); setWriting(wr)
        setLeft(deadline.current - (Date.now() + offset.current))
        setPhase('running')
        if (dirty.current.size) schedule(0)
      } catch (e) {
        if (!dead) { setError(e.message); setPhase('error') }
      }
    })()
    return () => { dead = true }
  }, [])

  // ---------- saqlash navbati ----------
  function persist() {
    if (attemptId.current) localStorage.setItem(DIRTY(attemptId.current), JSON.stringify([...dirty.current.values()]))
  }
  function schedule(delay) {
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, delay)
  }
  function queue(item, delay) {
    dirty.current.set(item.key, item)
    persist()
    setSaveState('saving')
    schedule(delay)
  }
  async function flush() {
    if (flushing.current) return false
    flushing.current = true
    try {
      for (const [key, item] of [...dirty.current]) {
        try {
          const r = item.kind === 'a'
            ? await api.saveAnswer(code, section, item.qid, item.answer, item.flagged)
            : await api.saveWriting(code, item.partId, item.body)
          if (r?.status === 'closed') { dirty.current.delete(key); setSaveState('closed'); continue }
          if (dirty.current.get(key) === item) dirty.current.delete(key)
        } catch {
          setSaveState('offline')
          return false
        }
      }
      persist()
      if (dirty.current.size) { schedule(1500); setSaveState('saving'); return false }
      setSaveState((s) => (s === 'closed' ? s : 'saved'))
      return true
    } finally { flushing.current = false }
  }

  // Qayta urinish: har 5 soniyada va internet qaytganda
  useEffect(() => {
    const id = setInterval(() => { if (dirty.current.size) flush() }, 5000)
    const online = () => { if (dirty.current.size) flush() }
    window.addEventListener('online', online)
    return () => { clearInterval(id); window.removeEventListener('online', online) }
  }, [])

  // ---------- javob o'zgarishlari ----------
  function onAnswer(qid, value) {
    const next = { ...(answersRef.current[qid] || { answer: '', flagged: false }), answer: value }
    answersRef.current = { ...answersRef.current, [qid]: next }
    setAnswers(answersRef.current)
    queue({ key: 'a:' + qid, kind: 'a', qid, answer: next.answer, flagged: next.flagged }, 600)
  }
  function onFlag(qid) {
    const next = { ...(answersRef.current[qid] || { answer: '', flagged: false }) }
    next.flagged = !next.flagged
    answersRef.current = { ...answersRef.current, [qid]: next }
    setAnswers(answersRef.current)
    queue({ key: 'a:' + qid, kind: 'a', qid, answer: next.answer, flagged: next.flagged }, 100)
  }
  function onWrite(partId, body) {
    setWriting((w) => ({ ...w, [partId]: body }))
    queue({ key: 'w:' + partId, kind: 'w', partId, body }, 1000)
  }
  function onHighlight(partId, ranges) {
    const next = { ...hl, [partId]: ranges }
    setHl(next)
    localStorage.setItem(HL(attemptId.current), JSON.stringify(next))
  }

  // ---------- taymer va topshirish ----------
  useEffect(() => {
    if (phase !== 'running') return
    const tick = () => {
      const l = deadline.current - (Date.now() + offset.current)
      setLeft(l)
      if (l <= 0) finish(true)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (phase !== 'running') return
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [phase])

  async function finish(auto) {
    if (submitting.current) return
    submitting.current = true
    setConfirm(false)
    setError('')
    setPhase('submitting')
    try {
      let ok = false
      for (let i = 0; i < (auto ? 10 : 3) && !ok; i++) {
        ok = await flush()
        if (!ok) await sleep(1500)
      }
      if (!ok && !auto) throw new Error('Your answers were not saved to the server. Check your internet connection and try again.')
      let res
      for (let i = 0; ; i++) {
        try { res = await api.submit(code, section); break }
        catch (e) {
          if (!auto || !e.network || i >= 60) throw e
          await sleep(3000)
        }
      }
      localStorage.removeItem(DIRTY(attemptId.current))
      setResult({ res, note: auto ? 'Time is up, your answers were submitted automatically.' : null })
      setPhase('done')
    } catch (e) {
      submitting.current = false
      setError(e.message)
      setPhase('running')
    }
  }

  // Bo'lim topshirilgach natija ko'rsatilmaydi: o'quvchi darhol keyingi bo'limga o'tkaziladi
  useEffect(() => { if (phase === 'done') onExit(result?.note || null) }, [phase])

  // ---------- ko'rinish ----------
  if (phase === 'loading') return <Loading text="Loading test..." />
  if (phase === 'error') {
    return (
      <div className="center-page"><div className="done-card">
        <h2>Error</h2>
        <p className="err">{error}</p><button onClick={() => onExit(null, true)}>Back</button>
      </div></div>
    )
  }
  if (phase === 'done') return <Loading text={`${LABEL[section]} submitted`} />

  const isWriting = section === 'writing'
  const parts = data.parts
  const part = parts[Math.min(pi, parts.length - 1)]
  const allQ = parts.flatMap((p) => p.questions)
  const isAnswered = (q) => !!(answers[q.id]?.answer || '').trim()
  const unanswered = isWriting ? 0 : allQ.filter((q) => !isAnswered(q)).length
  const wordsOf = (p) => countWords(writing[p.id] || '')

  function goTo(partIndex, number) {
    setPi(partIndex)
    setPane('questions')
    setCur(number)
    setTimeout(() => document.getElementById('q-' + number)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60)
  }

  return (
    <div className="exam">
      <header className="exam-top">
        <div className="left"><b>{LABEL[section]}</b> <span className="muted-w">{studentName}</span></div>
        <div className={'timer' + (left < 300000 ? ' low' : '')} role="timer" aria-label="Time left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M10 2h4" /></svg>
          {fmt(left)}
        </div>
        <div className="right">
          <span className={'save ' + saveState}>{SAVE_TEXT[saveState]}</span>
          <button onClick={() => setConfirm(true)}>Submit</button>
        </div>
      </header>
      {error && <div className="exam-banner">{error}</div>}
      {left <= 0 && <div className="exam-banner">Time is up. Submitting your answers, please wait for the connection...</div>}

      {section === 'listening' && <AudioPlayer url={api.mediaUrl('mockp-audio', data.audio_path)} startedAt={startedAt.current} offset={offset.current} />}

      {!isWriting && section === 'reading' && (
        <div className="pane-tabs">
          <button className={pane === 'text' ? 'on' : ''} onClick={() => setPane('text')}>Passage</button>
          <button className={pane === 'questions' ? 'on' : ''} onClick={() => setPane('questions')}>Questions</button>
        </div>
      )}
      {isWriting && (
        <div className="pane-tabs">
          <button className={pane === 'text' ? 'on' : ''} onClick={() => setPane('text')}>Task</button>
          <button className={pane === 'questions' ? 'on' : ''} onClick={() => setPane('questions')}>Answer</button>
        </div>
      )}

      <main className={'exam-main ' + (section === 'listening' ? 'single' : 'split show-' + pane)}>
        {section === 'reading' && (
          <section className="pane left">
            <h3>{part.title}</h3>
            <Highlightable key={part.id} text={part.body || ''} ranges={hl[part.id] || []} onChange={(r) => onHighlight(part.id, r)} />
          </section>
        )}
        {isWriting && (
          <section className="pane left">
            <h3>{part.title}</h3>
            <div className="passage">{part.body}</div>
            {part.image_path && <img className="task-img" src={api.mediaUrl('mockp-images', part.image_path)} alt="" />}
            {part.min_words && <p className="muted">Write at least {part.min_words} words.</p>}
          </section>
        )}
        <section className="pane right">
          {isWriting ? (
            <>
              <textarea className="write" value={writing[part.id] || ''} onChange={(e) => onWrite(part.id, e.target.value)}
                placeholder="Type your answer here..." spellCheck={false} />
              <div className={'wc' + (part.min_words && wordsOf(part) < part.min_words ? ' low' : '')}>
                Word count: <b>{wordsOf(part)}</b>{part.min_words ? ` / at least ${part.min_words}` : ''}
              </div>
            </>
          ) : (
            <>
              {section === 'listening' && <h3>{part.title}</h3>}
              {section === 'listening' && part.body && <div className="passage" style={{ marginBottom: 12 }}>{part.body}</div>}
              <QuestionList questions={part.questions} answers={answers} onAnswer={onAnswer} onFlag={onFlag} onFocusQ={setCur} cur={cur} />
              {part.questions.length === 0 && <p className="muted">There are no questions in this part.</p>}
            </>
          )}
        </section>
      </main>

      {/* Pastki panel: joriy part savollari raqamlari, qolgan partlar faqat nomi bilan */}
      <footer className="exam-foot">
        {parts.map((p, i) => {
          const open = () => { setPi(i); setCur(null); if (!isWriting) setPane('questions') }
          if (i !== pi) return <button key={p.id} className="foot-part" onClick={open}>{p.title}</button>
          return (
            <div key={p.id} className="foot-part active">
              <span className="foot-title">{p.title}</span>
              {isWriting
                ? <span className="foot-words">{wordsOf(p)} words</span>
                : p.questions.map((q) => (
                  <button key={q.id} aria-label={`Question ${q.number}${isAnswered(q) ? ', answered' : ''}`}
                    className={'num' + (isAnswered(q) ? ' done' : '') + (answers[q.id]?.flagged ? ' flagged' : '') + (cur === q.number ? ' cur' : '')}
                    onClick={() => goTo(i, q.number)}>{q.number}</button>
                ))}
            </div>
          )
        })}
      </footer>

      {confirm && (
        <div className="modal"><div className="card">
          <h2>Submit {LABEL[section]}?</h2>
          {!isWriting && unanswered > 0 && <p className="err">{unanswered} question{unanswered === 1 ? ' is' : 's are'} unanswered.</p>}
          {isWriting && parts.some((p) => p.min_words && wordsOf(p) < p.min_words) && <p className="err">Some tasks are below the minimum word count.</p>}
          <p className="muted">You cannot change your answers after submitting.</p>
          <div className="actions">
            <button className="ghost" onClick={() => setConfirm(false)}>No, keep working</button>
            <button onClick={() => finish(false)}>Yes, submit</button>
          </div>
        </div></div>
      )}
      {phase === 'submitting' && <div className="modal"><div className="card"><div className="loading"><div className="spinner" /><span>Submitting...</span></div></div></div>}
    </div>
  )
}
