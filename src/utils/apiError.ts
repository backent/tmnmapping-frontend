/**
 * Turns whatever the HTTP layer threw into one sentence a person can read.
 *
 * Every error the backend raises on purpose arrives in the same envelope --
 * `{ status, code, data, extras }` -- with the human text in `data`. There is no
 * `message` field and there never was, so the 45 call sites that read
 * `details?.message` always got `undefined`, fell through to `|| error?.details`,
 * and handed Vue the whole envelope. `toDisplayString` JSON-stringifies objects,
 * so operators were shown a pretty-printed blob with the real message buried in
 * it -- most visibly on the login screen, where a wrong password rendered as four
 * lines of JSON.
 *
 * Every read goes through here now so that mismatch cannot drift back in.
 */

/** The error shape `utils/http.ts` throws: the parsed envelope hangs off `details`. */
interface ApiError {
  status?: number
  details?: unknown
}

/** Rejects anything that is not text worth showing, including `{}` and `[object Object]`. */
function usableText(value: unknown): string | null {
  if (typeof value !== 'string')
    return null

  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * The support reference a 500 carries. The backend already writes it into the
 * sentence, so this is only used when we had to fall back to our own wording and
 * would otherwise strand the operator with nothing to quote.
 */
function referenceOf(details: unknown): string | null {
  if (!isRecord(details))
    return null

  const extras = details.extras

  return isRecord(extras) ? usableText(extras.reference) : null
}

/**
 * `fallback` is what to say when the server gave us nothing usable. Write it for
 * the operator and name the action that failed -- "Could not save this customer",
 * not "Error".
 */
export function extractApiError(error: unknown, fallback: string): string {
  // fetch rejects with a TypeError when the request never reached the server at
  // all. There is no envelope in that case, and "failed to fetch" means nothing
  // to a salesperson on hotel wifi.
  if (error instanceof TypeError)
    return 'Could not reach the server. Check your connection and try again.'

  const apiError = (error ?? {}) as ApiError
  const { details } = apiError

  // A session that lapsed mid-edit reads as a random logout unless we say so.
  if (apiError.status === 401)
    return 'Your session has expired. Please sign in again.'

  // Unknown routes come back as httprouter's plain-text body rather than JSON, so
  // `details` is sometimes the string itself.
  const direct = usableText(details)
  if (direct)
    return direct

  if (isRecord(details)) {
    // `data` is where the backend puts it. `message` is read second only because
    // a few nested payloads use that name; the envelope itself never does.
    const text = usableText(details.data) ?? usableText(details.message)
    if (text)
      return text
  }

  const reference = referenceOf(details)

  return reference ? `${fallback} (reference ${reference})` : fallback
}

export default extractApiError
