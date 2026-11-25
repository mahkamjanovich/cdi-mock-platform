import { useEffect, useMemo, useRef, useState } from 'react'
import { addRange, removeRange, buildSegments } from './highlightUtils.js'

// Brauzerdagi belgilash (selection) o'rnini matndagi belgi o'riniga aylantiradi
function position(root, node, offset) {
  if (node.nodeType === 3) {
    const seg = node.parentElement?.closest('[data-s]')
    return seg ? Number(seg.dataset.s) + offset : null
  }
  const seg = node.closest?.('[data-s]')
  if (seg) return Number(seg.dataset.s) + (offset > 0 ? seg.textContent.length : 0)
  const child = node.childNodes[offset]
  if (child?.dataset?.s != null) return Number(child.dataset.s)
  const last = node.lastElementChild
  return last ? Number(last.dataset.s) + last.textContent.length : null
}

export default function Highlightable({ text, ranges, onChange }) {
  const ref = useRef(null)
  const [sel, setSel] = useState(null)
  const segments = useMemo(() => buildSegments(text, ranges), [text, ranges])

  useEffect(() => {
    function read() {
      const s = window.getSelection()
      const root = ref.current
      if (!s || s.isCollapsed || !root || !root.contains(s.anchorNode) || !root.contains(s.focusNode)) return setSel(null)
      const a = position(root, s.anchorNode, s.anchorOffset)
      const b = position(root, s.focusNode, s.focusOffset)
      if (a == null || b == null || a === b) return setSel(null)
      setSel({ start: Math.min(a, b), end: Math.max(a, b) })
    }
    document.addEventListener('selectionchange', read)
    return () => document.removeEventListener('selectionchange', read)
  }, [])

  function apply(kind) {
    if (!sel) return
    onChange(kind === 'add' ? addRange(ranges, sel.start, sel.end) : removeRange(ranges, sel.start, sel.end))
    window.getSelection()?.removeAllRanges()
    setSel(null)
  }

  return (
    <div>
      <div className={'hl-bar' + (sel ? ' show' : '')}>
        <button className="small" onMouseDown={(e) => e.preventDefault()} onClick={() => apply('add')}>Highlight</button>
        <button className="small ghost" onMouseDown={(e) => e.preventDefault()} onClick={() => apply('remove')}>Remove highlight</button>
      </div>
      <div ref={ref} className="passage">
        {segments.map((g) => g.h
          ? <mark key={g.s} data-s={g.s}>{g.t}</mark>
          : <span key={g.s} data-s={g.s}>{g.t}</span>)}
      </div>
    </div>
  )
}
