// A small XML reader and writer for project files: elements, attributes, text, CDATA, comments and
// the predefined and numeric entities. No namespaces, DTDs or processing beyond skipping them.

export interface XmlElement {
  tag: string
  attrs: Record<string, string>
  children: XmlElement[]
  /** The element's own text (CDATA included), with line endings normalised to \n. */
  text: string
}

export class XmlError extends Error {}

const ENTITIES: Record<string, string> = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }
const NAME = /^[A-Za-z_:][\w.:-]*/

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, ref: string) => {
    if (ref[0] === '#') {
      const code = ref[1] === 'x' || ref[1] === 'X' ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10)
      if (!Number.isFinite(code) || code > 0x10ffff)
        throw new XmlError(`Invalid character reference ${whole}`)
      return String.fromCodePoint(code)
    }
    const value = ENTITIES[ref]
    if (value === undefined) throw new XmlError(`Unknown entity ${whole}`)
    return value
  })
}

/** Text (or an attribute value with `attribute`) escaped for XML. */
export function escapeXml(text: string, attribute = false): string {
  let out = text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  if (attribute) {
    out = out
      .replaceAll('"', '&quot;')
      .replaceAll('\n', '&#10;')
      .replaceAll('\r', '&#13;')
      .replaceAll('\t', '&#9;')
  }
  return out
}

/** Parses a document and returns its root element. Throws XmlError. */
export function parseXml(source: string): XmlElement {
  const s = source.replace(/\r\n?/g, '\n')
  let i = 0
  const fail = (what: string): never => {
    throw new XmlError(`${what} at position ${i}`)
  }
  const skipPast = (marker: string, what: string): void => {
    const at = s.indexOf(marker, i)
    if (at < 0) fail(`Unclosed ${what}`)
    i = at + marker.length
  }
  const skipMisc = (): void => {
    for (;;) {
      while (i < s.length && /\s/.test(s[i]!)) i++
      if (s.startsWith('<?', i)) skipPast('?>', 'declaration')
      else if (s.startsWith('<!--', i)) skipPast('-->', 'comment')
      else if (s.startsWith('<!DOCTYPE', i)) skipPast('>', 'DOCTYPE')
      else return
    }
  }

  const element = (): XmlElement => {
    if (s[i] !== '<') fail('Expected an element')
    i++
    const tag = NAME.exec(s.slice(i))?.[0] ?? fail('Expected an element name')
    i += tag.length
    const el: XmlElement = { tag, attrs: {}, children: [], text: '' }
    for (;;) {
      while (/\s/.test(s[i] ?? '')) i++
      if (s.startsWith('/>', i)) {
        i += 2
        return el
      }
      if (s[i] === '>') {
        i++
        break
      }
      const name = NAME.exec(s.slice(i))?.[0] ?? fail('Expected an attribute')
      i += name.length
      while (/\s/.test(s[i] ?? '')) i++
      if (s[i] !== '=') fail('Expected =')
      i++
      while (/\s/.test(s[i] ?? '')) i++
      const quote = s[i]
      if (quote !== '"' && quote !== "'") fail('Expected a quoted value')
      const end = s.indexOf(quote!, i + 1)
      if (end < 0) fail('Unclosed attribute value')
      // Attribute values normalise whitespace characters to spaces (character references survive).
      el.attrs[name] = decode(s.slice(i + 1, end).replace(/[\n\t]/g, ' '))
      i = end + 1
    }
    for (;;) {
      if (i >= s.length) fail(`Unclosed element <${tag}>`)
      if (s.startsWith('</', i)) {
        i += 2
        const close = NAME.exec(s.slice(i))?.[0]
        if (close !== tag) fail(`Expected </${tag}>`)
        i += tag.length
        while (/\s/.test(s[i] ?? '')) i++
        if (s[i] !== '>') fail('Expected >')
        i++
        return el
      }
      if (s.startsWith('<![CDATA[', i)) {
        const end = s.indexOf(']]>', i)
        if (end < 0) fail('Unclosed CDATA')
        el.text += s.slice(i + 9, end)
        i = end + 3
      } else if (s.startsWith('<!--', i)) {
        skipPast('-->', 'comment')
      } else if (s.startsWith('<?', i)) {
        skipPast('?>', 'processing instruction')
      } else if (s[i] === '<') {
        el.children.push(element())
      } else {
        const next = s.indexOf('<', i)
        const end = next < 0 ? s.length : next
        el.text += decode(s.slice(i, end))
        i = end
      }
    }
  }

  skipMisc()
  if (i >= s.length) fail('The document is empty')
  const root = element()
  skipMisc()
  if (i < s.length) fail('Content after the root element')
  return root
}

/** Children reached by a path of tag names, e.g. 'sort/column'. */
export function findAll(el: XmlElement, path: string): XmlElement[] {
  return path
    .split('/')
    .reduce<XmlElement[]>((found, tag) => found.flatMap((e) => e.children.filter((c) => c.tag === tag)), [el])
}

export function find(el: XmlElement, path: string): XmlElement | undefined {
  return findAll(el, path)[0]
}

/** Writes an element without whitespace between elements (upstream's reader needs that). */
export function writeXml(el: XmlElement): string {
  const attrs = Object.entries(el.attrs)
    .map(([k, v]) => ` ${k}="${escapeXml(v, true)}"`)
    .join('')
  if (!el.children.length && !el.text) return `<${el.tag}${attrs}/>`
  return `<${el.tag}${attrs}>${escapeXml(el.text)}${el.children.map(writeXml).join('')}</${el.tag}>`
}
