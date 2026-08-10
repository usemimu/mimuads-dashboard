/**
 * Context-namespaced TanStack Query keys. Every server-state query is scoped to
 * the active (orgId, workspaceId?) so switching context can never surface another
 * context's cached data — this is a SECURITY property, not a nicety (PRD §5/§7.4).
 *
 * The context prefix is always the first key segment, so a single predicate can
 * match/evict an entire context on switch.
 */

export type QueryContext = {
  orgId: string | null
  workspaceId?: string | null
}

/** The stable prefix segment for a context, e.g. "ctx:org_123:ws_456" or "ctx:org_123:_". */
export function ctxPrefix(ctx: QueryContext): string {
  return `ctx:${ctx.orgId ?? '_'}:${ctx.workspaceId ?? '_'}`
}

/** Build a fully context-namespaced query key. */
export function ctxKey(ctx: QueryContext, ...parts: ReadonlyArray<string | number>): unknown[] {
  return [ctxPrefix(ctx), ...parts]
}

/** True when a query key belongs to the given context (used to evict on switch). */
export function keyBelongsToContext(key: readonly unknown[], ctx: QueryContext): boolean {
  return key[0] === ctxPrefix(ctx)
}
