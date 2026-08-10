import { describe, it, expect } from 'vitest'
import { ctxKey, ctxPrefix, keyBelongsToContext } from '../ctx-key'

const orgA = { orgId: 'org_a', workspaceId: null }
const orgAWs1 = { orgId: 'org_a', workspaceId: 'ws_1' }
const orgB = { orgId: 'org_b', workspaceId: null }

describe('context-namespaced query keys', () => {
  it('prefixes every key with the active context', () => {
    expect(ctxKey(orgA, 'campaigns', 'list')).toEqual(['ctx:org_a:_', 'campaigns', 'list'])
    expect(ctxKey(orgAWs1, 'wallet')).toEqual(['ctx:org_a:ws_1', 'wallet'])
  })

  it('produces DIFFERENT prefixes across org and workspace (no cross-context collision)', () => {
    expect(ctxPrefix(orgA)).not.toBe(ctxPrefix(orgB))
    expect(ctxPrefix(orgA)).not.toBe(ctxPrefix(orgAWs1))
  })

  it('matches keys only to their own context (used to evict on switch)', () => {
    const key = ctxKey(orgAWs1, 'campaigns')
    expect(keyBelongsToContext(key, orgAWs1)).toBe(true)
    expect(keyBelongsToContext(key, orgA)).toBe(false)
    expect(keyBelongsToContext(key, orgB)).toBe(false)
  })
})
