// Highlight oraliqlari: [{start, end}] — matndagi belgi o'rinlari

export function mergeRanges(ranges) {
  const rs = ranges.filter((r) => r.end > r.start).map((r) => ({ ...r })).sort((a, b) => a.start - b.start)
  const out = []
  for (const r of rs) {
    const last = out[out.length - 1]
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end)
    else out.push(r)
  }
  return out
}

export function addRange(ranges, start, end) {
  return mergeRanges([...ranges, { start, end }])
}

export function removeRange(ranges, start, end) {
  const out = []
  for (const r of ranges) {
    if (r.end <= start || r.start >= end) { out.push(r); continue }
    if (r.start < start) out.push({ start: r.start, end: start })
    if (r.end > end) out.push({ start: end, end: r.end })
  }
  return mergeRanges(out)
}

export function buildSegments(text, ranges) {
  const rs = mergeRanges(ranges.map((r) => ({ start: Math.max(0, r.start), end: Math.min(text.length, r.end) })))
  const out = []
  let i = 0
  for (const r of rs) {
    if (r.start > i) out.push({ s: i, t: text.slice(i, r.start), h: false })
    out.push({ s: r.start, t: text.slice(r.start, r.end), h: true })
    i = r.end
  }
  if (i < text.length) out.push({ s: i, t: text.slice(i), h: false })
  return out
}
