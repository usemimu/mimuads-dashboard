<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import Button from '@/components/ui/Button.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useSession } from '@/stores/session'
import { MembershipRoleSchema } from '@/api/contracts/common'
import {
  listMembers, inviteMember, changeRole, suspendMember,
  listWorkspaces, createWorkspace, updateWorkspace,
  listApiKeys, createApiKey, revokeApiKey,
} from '@/api/org'
import { isApiError } from '@/api/errors'
import { useToastStore } from '@/stores/toast'

const session = useSession()
const qc = useQueryClient()
const toast = useToastStore()
const tab = ref<'members' | 'workspaces' | 'verification' | 'apikeys'>('members')
const roles = MembershipRoleSchema.options
const isAgency = computed(() => session.context.tier === 'agency')
const isOwner = computed(() => session.role === 'owner')

const { data: members } = useQuery({ queryKey: ['members'], queryFn: listMembers })
const { data: workspaces } = useQuery({ queryKey: ['ws-admin'], queryFn: listWorkspaces })
const { data: keys } = useQuery({ queryKey: ['apikeys'], queryFn: listApiKeys })

async function run(fn: () => Promise<unknown>, key: string) {
  try { await fn(); qc.invalidateQueries({ queryKey: [key] }) }
  catch (e) { toast.error(isApiError(e) ? e.message : 'Action failed') }
}

// Invite
const inviteEmail = ref('')
const inviteRole = ref('campaign_manager')
function sendInvite() {
  if (!inviteEmail.value) return
  run(() => inviteMember(inviteEmail.value, inviteRole.value as never), 'members').then(() => { inviteEmail.value = '' })
}
// Workspace create
const wsName = ref('')
function makeWorkspace() {
  if (!wsName.value) return
  run(() => createWorkspace(wsName.value), 'ws-admin').then(() => { wsName.value = '' })
}
// API key create
const keyName = ref('')
const newKey = ref<string | null>(null)
async function makeKey() {
  if (!keyName.value) return
  try {
    const res = (await createApiKey(keyName.value, ['campaigns:write', 'reports:read'])) as { key?: string; plaintext?: string }
    newKey.value = res.key ?? res.plaintext ?? null
    keyName.value = ''
    qc.invalidateQueries({ queryKey: ['apikeys'] })
  } catch (e) { toast.error(isApiError(e) ? e.message : 'Could not create key') }
}
</script>

<template>
  <div>
    <PageHeader :title="$t('orgAdmin.title')" />
    <div class="mb-5 flex gap-1 border-b border-neutral-200">
      <button v-for="t in (['members','workspaces','verification','apikeys'] as const)" :key="t"
        class="-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors"
        :class="tab === t ? 'border-clay-500 text-clay-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'"
        @click="tab = t">{{ $t('orgAdmin.tab' + t.charAt(0).toUpperCase() + t.slice(1)) }}</button>
    </div>

    <!-- Members -->
    <div v-if="tab === 'members'" class="space-y-4">
      <div v-if="session.canMutate" class="flex gap-2">
        <input v-model="inviteEmail" type="email" :placeholder="$t('orgAdmin.email')" :aria-label="$t('orgAdmin.email')" class="input text-sm" />
        <select v-model="inviteRole" :aria-label="$t('orgAdmin.role')" class="input text-sm">
          <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
        </select>
        <Button size="sm" @click="sendInvite">{{ $t('orgAdmin.invite') }}</Button>
      </div>
      <div class="card overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-400">
            <tr><th class="px-4 py-2">{{ $t('orgAdmin.member') }}</th><th class="px-4 py-2">{{ $t('orgAdmin.role') }}</th><th class="px-4 py-2">{{ $t('orgAdmin.status') }}</th><th class="px-4 py-2"></th></tr>
          </thead>
          <tbody>
            <tr v-for="m in members?.members ?? []" :key="m.userId" class="border-t border-neutral-100" data-testid="member-row">
              <td class="px-4 py-2"><p class="text-neutral-900">{{ m.name ?? '—' }}</p><p class="text-xs text-neutral-500">{{ m.email }}</p></td>
              <td class="px-4 py-2">
                <select v-if="session.canMutate && m.role !== 'owner'" :value="m.role" class="select w-auto text-xs" @change="run(() => changeRole(m.userId, ($event.target as HTMLSelectElement).value as never), 'members')">
                  <option v-for="r in roles" :key="r" :value="r">{{ r }}</option>
                </select>
                <span v-else class="capitalize">{{ m.role }}</span>
              </td>
              <td class="px-4 py-2 capitalize">{{ m.status }}</td>
              <td class="px-4 py-2 text-right">
                <button v-if="isOwner && m.role !== 'owner' && m.status !== 'suspended'" class="text-xs text-clay-600 hover:underline" @click="run(() => suspendMember(m.userId), 'members')">{{ $t('orgAdmin.suspend') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Workspaces -->
    <div v-else-if="tab === 'workspaces'" class="space-y-4">
      <p v-if="!isAgency" class="text-sm text-neutral-400">{{ $t('orgAdmin.agencyOnly') }}</p>
      <template v-else>
        <div v-if="session.canMutate" class="flex gap-2">
          <input v-model="wsName" :placeholder="$t('orgAdmin.workspaceName')" :aria-label="$t('orgAdmin.workspaceName')" class="input text-sm" />
          <Button size="sm" @click="makeWorkspace">{{ $t('orgAdmin.create') }}</Button>
        </div>
        <div class="card overflow-hidden">
          <table class="w-full text-sm">
            <tbody>
              <tr v-if="!workspaces?.workspaces.length"><td class="px-4 py-6 text-center text-neutral-400">{{ $t('orgAdmin.noWorkspaces') }}</td></tr>
              <tr v-for="w in workspaces?.workspaces ?? []" :key="w.id" class="border-t border-neutral-100" data-testid="workspace-row">
                <td class="px-4 py-2 text-neutral-900">{{ w.name }}</td>
                <td class="px-4 py-2 capitalize text-neutral-500">{{ w.status }}</td>
                <td class="px-4 py-2 text-right">
                  <button v-if="session.canMutate && w.status !== 'archived'" class="text-xs text-clay-600 hover:underline" @click="run(() => updateWorkspace(w.id, { status: 'archived' }), 'ws-admin')">{{ $t('orgAdmin.archive') }}</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>

    <!-- Verification -->
    <div v-else-if="tab === 'verification'" class="card p-6">
      <p class="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{{ $t('orgAdmin.verificationLevel') }}</p>
      <p class="mt-1.5 text-lg font-semibold capitalize text-neutral-900">{{ session.context.tier }}</p>
      <RouterLink to="/verify" class="mt-3 inline-block text-sm text-clay-600 hover:underline">{{ $t('orgAdmin.openVerification') }}</RouterLink>
    </div>

    <!-- API keys -->
    <div v-else class="space-y-4">
      <p v-if="newKey" class="rounded-lg bg-gold-50 px-4 py-3 font-mono text-sm text-gold-800">{{ newKey }} <span class="block font-body text-xs">{{ $t('orgAdmin.keyOnce') }}</span></p>
      <div v-if="session.canMutate" class="flex gap-2">
        <input v-model="keyName" :placeholder="$t('orgAdmin.apiKeyName')" :aria-label="$t('orgAdmin.apiKeyName')" class="input text-sm" />
        <Button size="sm" @click="makeKey">{{ $t('orgAdmin.createKey') }}</Button>
      </div>
      <div class="card overflow-hidden">
        <table class="w-full text-sm">
          <tbody>
            <tr v-if="!(keys as { keys?: unknown[] })?.keys?.length"><td class="px-4 py-6 text-center text-neutral-400">{{ $t('orgAdmin.noKeys') }}</td></tr>
            <tr v-for="k in ((keys as { keys?: Array<{ id: string; name: string }> })?.keys ?? [])" :key="k.id" class="border-t border-neutral-100">
              <td class="px-4 py-2 text-neutral-900">{{ k.name }}</td>
              <td class="px-4 py-2 text-right"><button class="text-xs text-clay-600 hover:underline" @click="run(() => revokeApiKey(k.id), 'apikeys')">{{ $t('orgAdmin.revoke') }}</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
