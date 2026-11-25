function Question({ q, a, onAnswer, onFlag, onFocusQ, current }) {
  const val = a?.answer || ''
  const flagged = !!a?.flagged
  const set = (v) => { onFocusQ(q.number); onAnswer(q.id, v) }
  const opts = q.options || []

  let body = null
  if (q.type === 'mcq') {
    body = (
      <div className="opts">
        {opts.map((o) => (
          <label key={o.key} className={'opt' + (val === o.key ? ' on' : '')}>
            <input type="radio" name={q.id} checked={val === o.key} onChange={() => set(o.key)} /> <b>{o.key}.</b> {o.text}
          </label>
        ))}
      </div>
    )
  } else if (q.type === 'tfng' || q.type === 'ynng') {
    const list = q.type === 'tfng' ? ['TRUE', 'FALSE', 'NOT GIVEN'] : ['YES', 'NO', 'NOT GIVEN']
    body = (
      <div className="opts">
        {list.map((o) => (
          <label key={o} className={'opt' + (val === o ? ' on' : '')}>
            <input type="radio" name={q.id} checked={val === o} onChange={() => set(o)} /> {o}
          </label>
        ))}
      </div>
    )
  } else if (q.type === 'matching_headings' || q.type === 'matching_information') {
    body = (
      <select value={val} onChange={(e) => set(e.target.value)} onFocus={() => onFocusQ(q.number)}>
        <option value="">— select —</option>
        {opts.map((o) => <option key={o.key} value={o.key}>{o.key}. {o.text}</option>)}
      </select>
    )
  }

  const input = (
    <input className="gap" value={val} maxLength={200} autoComplete="off" autoCapitalize="off" spellCheck={false}
      onFocus={() => onFocusQ(q.number)} onChange={(e) => set(e.target.value)} />
  )

  // Gap-fill: ______ o'rniga kiritish maydoni qo'yiladi
  let prompt = <div className="qprompt">{q.prompt}</div>
  if (q.type === 'gap_fill' || q.type === 'short_answer') {
    const m = q.prompt.split(/_{3,}/)
    if (q.type === 'gap_fill' && m.length > 1) {
      prompt = <div className="qprompt">{m[0]}{input}{m.slice(1).join('______')}</div>
      body = null
    } else body = input
  }

  return (
    <div id={'q-' + q.number} className={'question' + (current ? ' current' : '')}>
      <div className="qtop">
        <span className="qnum">{q.number}</span>
        <button className={'flag' + (flagged ? ' on' : '')} onClick={() => onFlag(q.id)} title="Flag to review later">⚑</button>
      </div>
      {prompt}
      {body}
      {val && !['gap_fill', 'short_answer'].includes(q.type) && (
        <button className="linklike" onClick={() => set('')}>Clear choice</button>
      )}
    </div>
  )
}

const isNote = (q) => q.type === 'gap_fill' && /_{3,}/.test(q.prompt)

// Note/table completion: ketma-ket gap-fill savollar bitta ramkada, har bo'shliq raqami bilan
function NoteGroup({ qs, answers, onAnswer, onFlag, onFocusQ, cur }) {
  return (
    <div className={'question note-group' + (qs.some((q) => q.number === cur) ? ' current' : '')}>
      {qs.map((q) => {
        const a = answers[q.id]
        const [pre, ...rest] = q.prompt.split(/_{3,}/)
        return (
          <div key={q.id} id={'q-' + q.number} className={'note-line' + (cur === q.number ? ' on' : '')}>
            <div className="qprompt">
              {pre}
              <input className="gap" value={a?.answer || ''} placeholder={String(q.number)} aria-label={`Question ${q.number}`}
                maxLength={200} autoComplete="off" autoCapitalize="off" spellCheck={false}
                onFocus={() => onFocusQ(q.number)} onChange={(e) => { onFocusQ(q.number); onAnswer(q.id, e.target.value) }} />
              {rest.join('______')}
            </div>
            <button className={'flag sm' + (a?.flagged ? ' on' : '')} onClick={() => onFlag(q.id)} title="Flag to review later">⚑</button>
          </div>
        )
      })}
    </div>
  )
}

export default function QuestionList({ questions, answers, onAnswer, onFlag, onFocusQ, cur }) {
  // Yangi guruh: oldingisi note emas yoki savol "Questions X–Y" ko'rsatmasi bilan boshlanadi
  const blocks = []
  for (const q of questions) {
    const last = blocks[blocks.length - 1]
    if (isNote(q) && Array.isArray(last) && !/^Questions\s/.test(q.prompt)) last.push(q)
    else blocks.push(isNote(q) ? [q] : q)
  }
  return blocks.map((b) => Array.isArray(b)
    ? <NoteGroup key={b[0].id} qs={b} answers={answers} onAnswer={onAnswer} onFlag={onFlag} onFocusQ={onFocusQ} cur={cur} />
    : <Question key={b.id} q={b} a={answers[b.id]} onAnswer={onAnswer} onFlag={onFlag} onFocusQ={onFocusQ} current={cur === b.number} />)
}
