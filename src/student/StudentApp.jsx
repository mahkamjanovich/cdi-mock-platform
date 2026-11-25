import { useEffect, useRef, useState } from 'react'
import * as api from './api'
import Exam from './Exam.jsx'
import { VOL_KEY, savedVolume } from './AudioPlayer.jsx'
import { Logo, Loading, SectionIcon, Check, ModeSwitch } from '../ui.jsx'
import { AuthLayout } from '../auth.jsx'
import { SOUNDCHECK_TEXT } from '../lib'

const KEY = 'mockp_code'
const LABEL = { listening: 'Listening', reading: 'Reading', writing: 'Writing' }
const isDone = (s) => s.status === 'submitted' || s.status === 'expired'
const STRIP = [['Listening', 'audio length'], ['Reading', '60 minutes'], ['Writing', '60 minutes'], ['Speaking', 'with a teacher']]

// 4 xonali kod: ko'rinmas input ustida 4 ta katak
function Pin({ value, onChange, bad }) {
  const ref = useRef(null)
  return (
    <div className={'pin' + (bad ? ' bad' : '')} onClick={() => ref.current?.focus()}>
      <input ref={ref} inputMode="numeric" pattern="[0-9]*" maxLength={4} autoFocus autoComplete="one-time-code"
        aria-label="4-digit ID code" value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))} />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={'cell' + (value[i] ? ' full' : '') + (i === value.length ? ' cur' : '')}>
          {value[i] && <b key={value[i] + i}>{value[i]}</b>}
        </div>
      ))}
    </div>
  )
}

// Bo'limlar ketma-ketligi: Listening → Reading → Writing
function Steps({ sections, current }) {
  return (
    <ol className="steps">
      {sections.map((s) => (
        <li key={s.section} className={isDone(s) ? 'done' : s.section === current ? 'cur' : ''}>
          <span className="st-ic">{isDone(s) ? '✓' : <SectionIcon section={s.section} size={18} />}</span>
          <b>{LABEL[s.section]}</b>
          <small>{isDone(s) ? 'submitted' : s.section === current ? 'up next' : s.section === 'listening' ? 'audio length' : '60 minutes'}</small>
        </li>
      ))}
    </ol>
  )
}

// Listening oldidan: ovoz sozlash audiosi, balandlik va «Keyingi» tugmasi
function SoundCheck({ info, ready, onNext }) {
  const ref = useRef(null)
  const [vol, setVol] = useState(savedVolume)
  const [playing, setPlaying] = useState(false)
  const url = api.mediaUrl('mockp-audio', info.soundcheck_path)

  function changeVol(v) {
    setVol(v)
    localStorage.setItem(VOL_KEY, String(v))
    if (ref.current) ref.current.volume = v
  }

  // Audio yuklanmagan bo'lsa, ovozni tekshirish uchun qisqa signal chalinadi
  function beep() {
    const C = window.AudioContext || window.webkitAudioContext
    if (!C) return
    const ctx = new C(), o = ctx.createOscillator(), g = ctx.createGain()
    o.frequency.value = 660
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.3 * vol, ctx.currentTime + 0.05)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2)
    o.connect(g).connect(ctx.destination)
    o.start(); o.stop(ctx.currentTime + 1.25)
    setPlaying(true); setTimeout(() => setPlaying(false), 1250)
  }

  function toggle() {
    if (!url) return beep()
    const a = ref.current
    a.volume = vol
    if (a.paused) a.play().then(() => setPlaying(true)).catch(() => {})
    else { a.pause(); setPlaying(false) }
  }

  function next() {
    ref.current?.pause()
    onNext()
  }

  return (
    <div className="flow-card sc">
      <div className="sc-head">
        <span className={'sc-orb' + (playing ? ' on' : '')}><span className="eq"><i /><i /><i /><i /><i /></span></span>
        <div><h1>Sound check</h1><p>Put on your headphones, play the audio and adjust the volume.</p></div>
      </div>
      <ul className="sc-text">{SOUNDCHECK_TEXT.map((t) => <li key={t}>{t}</li>)}</ul>
      <div className="sc-ctrl">
        {url && <audio ref={ref} src={url} preload="auto" onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} />}
        <button className="ghost sc-play" onClick={toggle}>{playing ? '❚❚ Stop' : url ? '▶ Play audio' : '▶ Play test tone'}</button>
        <label className="vol-big">
          <span>Volume <b>{Math.round(vol * 100)}%</b></span>
          <input type="range" min="0.05" max="1" step="0.05" value={vol} onChange={(e) => changeVol(+e.target.value)} style={{ '--p': `${vol * 100}%` }} />
        </label>
      </div>
      {ready
        ? <button className="accent big sc-next" onClick={next}>I can hear clearly, next →</button>
        : <div className="wait-note"><span className="spinner" /> Listening is not open yet. The Next button will appear as soon as the invigilator opens it.</div>}
      <p className="sc-foot">After you press Next, Listening begins: the audio and timer start together, and the audio cannot be paused.</p>
    </div>
  )
}

export default function StudentApp() {
  const [code, setCode] = useState('')
  const [info, setInfo] = useState(null)
  const [input, setInput] = useState('')
  const [err, setErr] = useState('')
  const [shake, setShake] = useState(false)
  const [booting, setBooting] = useState(true)
  const [busy, setBusy] = useState(false)
  const [exam, setExam] = useState(null)
  const [count, setCount] = useState(null) // keyingi bo'limga avtomatik o'tish sanog'i
  const [note, setNote] = useState(null)

  async function enter(c) {
    const i = await api.login(c)
    localStorage.setItem(KEY, c)
    setCode(c); setInfo(i)
  }

  useEffect(() => {
    const saved = localStorage.getItem(KEY)
    if (!saved) return setBooting(false)
    enter(saved).catch(() => localStorage.removeItem(KEY)).finally(() => setBooting(false))
  }, [])

  async function submit(e) {
    e?.preventDefault()
    if (busy || input.length !== 4) return
    setErr(''); setBusy(true)
    try { await enter(input) } catch (x) {
      setErr(x.message); setShake(true); setInput('')
      setTimeout(() => setShake(false), 500)
    }
    setBusy(false)
  }

  // 4-raqam kiritilishi bilan avtomatik tekshiriladi
  useEffect(() => { if (input.length === 4) submit() }, [input])

  async function refresh() {
    try { setInfo(await api.login(code)) } catch (x) { setErr(x.message) }
  }

  function logout() { localStorage.removeItem(KEY); setCode(''); setInfo(null); setInput(''); setExam(null) }

  const next = info?.sections.find((s) => !isDone(s))
  const ready = next && next.open && next.has_test
  const waiting = info && !exam && next && !ready

  // Bo'lim ochilishini kutish: har 5 soniyada tekshiriladi
  useEffect(() => {
    if (!waiting) return
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [waiting, code])

  // Reading va Writing: oldingi bo'lim topshirilgach 5 soniyalik sanoqdan so'ng o'zi boshlanadi
  useEffect(() => {
    if (!info || exam || !ready || next.section === 'listening' || next.status === 'in_progress') { setCount(null); return }
    setCount(5)
    const id = setInterval(() => setCount((c) => (c > 1 ? c - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [info, exam, ready, next?.section, next?.status])
  useEffect(() => { if (count === 0 && next) { setCount(null); setExam(next.section) } }, [count])

  if (booting) return <Loading text="Loading..." />

  if (exam) {
    return <Exam code={code} section={exam} studentName={info.full_name}
      onExit={(n, failed) => { setExam(null); setNote(failed ? null : n); refresh() }} />
  }

  if (!info) {
    return (
      <AuthLayout name="CDI Mock Platform" strip={STRIP} title="The IELTS exam, on computer." lead="A mock exam in the real CDI format: timing, questions and section order exactly as in the exam.">
        <form onSubmit={submit} className="reveal">
          <div className="mode-corner"><ModeSwitch /></div>
          <h2>Enter the exam</h2>
          <p className="sub">Enter the 4-digit ID code you were given</p>
          <Pin value={input} bad={shake} onChange={(v) => { setInput(v); setErr('') }} />
          {err && <div className="err">{err}</div>}
          <button type="submit" disabled={busy || input.length !== 4}>{busy ? 'Checking...' : 'Enter'}</button>
          <p className="foot">If you don't know your code, ask the invigilator.</p>
        </form>
      </AuthLayout>
    )
  }

  let body
  if (!next) {
    body = (
      <div className="flow-card center">
        <Check />
        <h1>The exam is complete</h1>
        <p className="lead-d">Listening, Reading and Writing have been submitted. Thank you!</p>
        <div className="id-note">Results will be announced in the channel by <b>ID {info.code}</b>.</div>
        <button className="ghost" onClick={logout}>Log out</button>
      </div>
    )
  } else if (next.section === 'listening' && next.status !== 'in_progress') {
    body = <SoundCheck info={info} ready={ready} onNext={() => setExam('listening')} />
  } else if (next.status === 'in_progress') {
    body = (
      <div className="flow-card center">
        <span className="big-ic"><SectionIcon section={next.section} size={30} /></span>
        <h1>{LABEL[next.section]} in progress</h1>
        <p className="lead-d">The timer has not stopped. {next.section === 'listening' ? 'The audio continues from where the timer is.' : 'Your answers are saved.'}</p>
        <button className="accent big" onClick={() => setExam(next.section)}>Continue →</button>
      </div>
    )
  } else if (ready) {
    body = (
      <div className="flow-card center">
        {note ? <p className="note-d">{note}</p> : <Check />}
        <h1>{LABEL[next.section]} is starting</h1>
        <p className="lead-d">{next.section === 'writing' ? 'Task 1 and Task 2' : '3 passages'} · 60 minutes. The timer starts when the section begins.</p>
        <div className="count" key={count}>{count ?? ''}</div>
        <button className="accent big" onClick={() => { setCount(null); setExam(next.section) }}>Start now →</button>
      </div>
    )
  } else {
    body = (
      <div className="flow-card center">
        <span className="big-ic"><SectionIcon section={next.section} size={30} /></span>
        <h1>Waiting for {LABEL[next.section]}</h1>
        <p className="lead-d">{next.has_test ? 'It will start automatically as soon as the invigilator opens the section.' : 'No test has been selected for this section yet. Please tell the invigilator.'}</p>
        <div className="wait-note"><span className="spinner" /> Checking every 5 seconds</div>
      </div>
    )
  }

  return (
    <>
      <header className="topbar">
        <Logo />
        <div className="who">
          <span className="who-name">{info.full_name} · <b>ID {info.code}</b></span>
          <ModeSwitch />
          <button className="small" onClick={logout}>Log out</button>
        </div>
      </header>
      <div className="home">
        <Steps sections={info.sections} current={next?.section} />
        {err && <div className="err">{err}</div>}
        <div className="reveal" key={(next?.section || 'end') + (next?.status || '')}>{body}</div>
      </div>
    </>
  )
}
