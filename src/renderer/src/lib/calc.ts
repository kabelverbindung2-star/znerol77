// Small, safe calculator engine (no eval): numbers, + - × ÷, %, parentheses.

type Tok = { t: 'num'; v: number } | { t: 'op'; v: string } | { t: 'paren'; v: '(' | ')' }

const PREC: Record<string, number> = { '+': 1, '-': 1, '×': 2, '÷': 2 }

function tokenize(expr: string): Tok[] {
  const out: Tok[] = []
  let i = 0
  const s = expr.replace(/\*/g, '×').replace(/\//g, '÷').replace(/,/g, '.')
  while (i < s.length) {
    const c = s[i]
    if (c === ' ') {
      i++
      continue
    }
    const prev = out[out.length - 1]
    const unaryMinus = c === '-' && (!prev || prev.t === 'op' || (prev.t === 'paren' && prev.v === '('))
    if (/[0-9.]/.test(c) || unaryMinus) {
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
  const apply = (): void => {
    const op = ops.pop()!
    const b = values.pop()
    const a = values.pop()
    if (a === undefined || b === undefined) throw new Error('Ausdruck')
    if (op === '+') values.push(a + b)
    else if (op === '-') values.push(a - b)
    else if (op === '×') values.push(a * b)
    else {
      if (b === 0) throw new Error('Division durch 0')
      values.push(a / b)
    }
  }
  for (const tok of toks) {
    if (tok.t === 'num') values.push(tok.v)
    else if (tok.t === 'paren' && tok.v === '(') ops.push('(')
    else if (tok.t === 'paren') {
      while (ops.length && ops[ops.length - 1] !== '(') apply()
      ops.pop()
    } else {
      while (ops.length && ops[ops.length - 1] !== '(' && PREC[ops[ops.length - 1]] >= PREC[tok.v]) apply()
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
