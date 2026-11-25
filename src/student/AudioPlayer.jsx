import { useEffect, useRef, useState } from 'react'

export const VOL_KEY = 'mockp_vol'
export const savedVolume = () => {
  const v = Number(localStorage.getItem(VOL_KEY))
  return Number.isFinite(v) && v > 0 ? Math.min(1, v) : 1
}

// Listening audiosi taymer bilan sinxron: audio har doim "urinish boshlanganidan beri o'tgan vaqt" nuqtasidan chaladi.
// Pauza va orqaga qaytarish yo'q. Sahifa yangilansa, audio aynan taymerdagi joyidan davom etadi.
export default function AudioPlayer({ url, startedAt, offset }) {
  const ref = useRef(null)
  const [state, setState] = useState('idle') // idle | playing | blocked | ended
  const [vol, setVol] = useState(savedVolume)
  const [err, setErr] = useState('')

  const elapsed = () => (Date.now() + offset - startedAt) / 1000

  async function play() {
    setErr('')
    const a = ref.current
    if (!a) return
    try {
      if (a.readyState < 1) await new Promise((res, rej) => { a.addEventListener('loadedmetadata', res, { once: true }); a.addEventListener('error', rej, { once: true }) })
      const pos = elapsed()
      if (Number.isFinite(a.duration) && pos >= a.duration - 0.5) return setState('ended')
      a.currentTime = Math.max(0, pos)
      a.volume = vol
      await a.play()
      setState('playing')
    } catch {
      setState('blocked')
      setErr('The audio did not start. Press "Play audio".')
    }
  }

  // Bo'lim ochilishi bilan audio o'zi boshlanadi (o'quvchi «Keyingi»ni bosgani uchun brauzer ruxsat beradi)
  useEffect(() => { if (url) play() }, [url])

  // Internet sekinlashsa yoki brauzer to'xtatib qo'ysa, audio taymerga qayta moslanadi
  useEffect(() => {
    const id = setInterval(() => {
      const a = ref.current
      if (!a || state !== 'playing') return
      if (a.paused && !a.ended) { play(); return }
      const drift = elapsed() - a.currentTime
      if (Math.abs(drift) > 2.5) a.currentTime = Math.max(0, elapsed())
    }, 3000)
    return () => clearInterval(id)
  }, [state])

  function changeVol(v) {
    setVol(v)
    localStorage.setItem(VOL_KEY, String(v))
    if (ref.current) ref.current.volume = v
  }

  if (!url) return <div className="audio-bar err">No audio has been uploaded for this test. Please tell the invigilator.</div>

  return (
    <div className="audio-bar">
      <audio ref={ref} src={url} preload="auto" onEnded={() => setState('ended')} onContextMenu={(e) => e.preventDefault()} />
      {state === 'playing' && <span className="playing"><span className="eq"><i /><i /><i /><i /><i /></span><b>Audio playing</b></span>}
      {state === 'ended' && <span className="playing"><span className="eq still"><i /><i /><i /><i /><i /></span><b>Audio finished</b></span>}
      {(state === 'idle' || state === 'blocked') && <button onClick={play}>▶ Play audio</button>}
      <label className="vol">Volume
        <input type="range" min="0.05" max="1" step="0.05" value={vol} onChange={(e) => changeVol(+e.target.value)} />
      </label>
      {err && <span className="err">{err}</span>}
    </div>
  )
}
