// Small, safe calculator engine (no eval): numbers, + - × ÷ ^, %, √, π, parentheses.

type Tok = { t: 'num'; v: number } | { t: 'op'; v: string } | { t: 'paren'; v: '(' | ')' } | { t: 'fn'; v: 'sqrt' | 'neg' }

const PREC: Record<string, number> = { '+': 1, '-': 1, '×': 2, '÷': 2, '^': 3 }

function tokenize(expr: string): Tok[] {
  const out: Tok[] = []
  let i = 0
  const s = expr.replace(/\*/g, '×').replace(/\//g, '÷').replace(/,/g, '.').replace(/−/g, '-')
  const valueEnded = (): boolean => {
    const prev = out[out.length - 1]
    return !!prev && (prev.t === 'num' || (prev.t === 'paren' && prev.v === ')'))
  }
  while (i < s.length) {
    const c = s[i]
    if (c === ' ') {
      i++
      continue
    }
    // "2π", "3(4)", "2√9" mean multiplication
    if ((c === 'π' || c === '(' || c === '√' || /[0-9.]/.test(c)) && valueEnded() && !/[0-9.]/.test(c)) {
      out.push({ t: 'op', v: '×' })
    }
    if (/[0-9.]/.test(c)) {
      let j = i + 1
      while (j < s.length && /[0-9.]/.test(s[j])) j++
      let v = parseFloat(s.slice(i, j))
      if (Number.isNaN(v)) throw new Error('Zahl')
      if (s[j] === '%') {
        v /= 100
        j++
      }
      out.push({ t: 'num', v })
      i = j
    } else if (c === 'π') {
      out.push({ t: 'num', v: Math.PI })
      i++
    } else if (c === '√') {
      out.push({ t: 'fn', v: 'sqrt' })
      i++
    } else if (c === '-' && !valueEnded()) {
      out.push({ t: 'fn', v: 'neg' }) // minus sign in front of a number or bracket
      i++
    } else if (c in PREC) {
      out.push({ t: 'op', v: c })
      i++
    } else if (c === '(' || c === ')') {
      out.push({ t: 'paren', v: c })
      i++
    } else {
      throw new Error('Zeichen')
    }
  }
  return out
}

export function evaluate(expr: string): number {
  const toks = tokenize(expr)
  const values: number[] = []
  const ops: string[] = []
  const applyFn = (fn: string, x: number): number => {
    if (fn === 'sqrt') {
      if (x < 0) throw new Error('Wurzel aus negativer Zahl')
      return Math.sqrt(x)
    }
    return -x
  }
  const apply = (): void => {
    const op = ops.pop()!
    if (op === 'sqrt' || op === 'neg') {
      const x = values.pop()
      if (x === undefined) throw new Error('Ausdruck')
      values.push(applyFn(op, x))
      return
    }
    const b = values.pop()
    const a = values.pop()
    if (a === undefined || b === undefined) throw new Error('Ausdruck')
    if (op === '+') values.push(a + b)
    else if (op === '-') values.push(a - b)
    else if (op === '×') values.push(a * b)
    else if (op === '^') values.push(Math.pow(a, b))
    else {
      if (b === 0) throw new Error('Division durch 0')
      values.push(a / b)
    }
  }
  // a leading minus binds weaker than ^ (-2^2 = -4), √ binds strongest
  const prec = (op: string): number => (op === 'sqrt' ? 4 : op === 'neg' ? 2.5 : PREC[op])
  for (const tok of toks) {
    if (tok.t === 'num') values.push(tok.v)
    else if (tok.t === 'fn') ops.push(tok.v)
    else if (tok.t === 'paren' && tok.v === '(') ops.push('(')
    else if (tok.t === 'paren') {
      while (ops.length && ops[ops.length - 1] !== '(') apply()
      ops.pop()
    } else {
      // ^ binds to the right: 2^3^2 = 2^9
      while (
        ops.length &&
        ops[ops.length - 1] !== '(' &&
        (prec(ops[ops.length - 1]) > PREC[tok.v] || (prec(ops[ops.length - 1]) === PREC[tok.v] && tok.v !== '^'))
      )
        apply()
      ops.push(tok.v)
    }
  }
  while (ops.length) {
    if (ops[ops.length - 1] === '(') ops.pop()
    else apply()
  }
  if (values.length !== 1 || !Number.isFinite(values[0])) throw new Error('Ausdruck')
  return values[0]
}

export function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e10) / 1e10
  return rounded.toLocaleString('de-DE', { maximumFractionDigits: 10 })
}

/** ± on the last number of the expression: 12+5 → 12+(-5) → 12+5 */
export function toggleSign(expr: string): string {
  const wrapped = expr.match(/\(-([0-9.,]+)\)$/)
  if (wrapped) return expr.slice(0, -wrapped[0].length) + wrapped[1]
  const last = expr.match(/([0-9.,]+)$/)
  if (!last) return expr
  const before = expr.slice(0, -last[1].length)
  return before === '' ? `-${last[1]}` : before === '-' ? last[1] : `${before}(-${last[1]})`
}
