<script setup lang="ts">
import MimuIcon from '@/components/ui/MimuIcon.vue'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { useI18n } from 'vue-i18n'
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'
import { PhDotsThreeVertical, PhUsersThree, PhKey, PhStack, PhProhibit, PhUserSwitch, PhSealCheck, PhArrowRight } from '@phosphor-icons/vue'
import Button from '@/components/ui/Button.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Avatar from '@/components/ui/Avatar.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Tabs from '@/components/ui/Tabs.vue'
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
const { t } = useI18n()
const tab = ref<'members' | 'workspaces' | 'verification' | 'apikeys'>('members')
const roles = MembershipRoleSchema.options
const isAgency = computed(() => session.context.tier === 'agency')
const isOwner = computed(() => session.role === 'owner')

const { data: members } = useQuery({ queryKey: ['members'], queryFn: listMembers })
const { data: workspaces } = useQuery({ queryKey: ['ws-admin'], queryFn: listWorkspaces })
const { data: keys } = useQuery({ queryKey: ['apikeys'], queryFn: listApiKeys })

const memberList = computed(() => members.value?.members ?? [])
const orgTabs = computed(
  () =>
    (['members', 'workspaces', 'verification', 'apikeys'] as const)
      .filter((tab) => tab !== 'workspaces' || isAgency.value)
      .map((tab) => ({
        value: tab,
        label: i18nTab(tab),
        count: tab === 'members' ? memberList.value.length || undefined : undefined,
      })),
)
function i18nTab(tab: string): string {
  return t('orgAdmin.tab' + tab.charAt(0).toUpperCase() + tab.slice(1))
}
function roleTone(role: string): 'accent' | 'neutral' {
  return role === 'owner' ? 'accent' : 'neutral'
}
function statusTone(status: string): 'success' | 'danger' | 'neutral' {
  if (status === 'active') return 'success'
  if (status === 'suspended') return 'danger'
  return 'neutral'
}

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
    <PageHeader :title="$t('orgAdmin.title')" :subtitle="$t('orgAdmin.subtitle')" />
    <div class="max-w-5xl">
    <div class="mb-5">
      <Tabs v-model="tab" :tabs="orgTabs" />
    </div>

    <!-- Members -->
    <div v-if="tab === 'members'">
      <Card padding="none" class="overflow-hidden">
        <!-- Invite form header -->
        <div v-if="session.canMutate" class="flex flex-wrap items-end gap-2 border-b border-line bg-surface-sunken/40 px-4 py-3.5">
          <label class="min-w-0 flex-1">
            <span class="label">{{ $t('orgAdmin.email') }}</span>
            <input v-model="inviteEmail" type="email" :placeholder="$t('orgAdmin.email')" :aria-label="$t('orgAdmin.email')" class="input text-sm" />
          </label>
          <label class="shrink-0">
            <span class="label">{{ $t('orgAdmin.role') }}</span>
            <select v-model="inviteRole" :aria-label="$t('orgAdmin.role')" class="select w-auto text-sm">
              <option v-for="r in roles" :key="r" :value="r">{{ r.replace(/_/g, ' ') }}</option>
            </select>
          </label>
          <Button size="sm" class="mb-px self-end" @click="sendInvite">{{ $t('orgAdmin.invite') }}</Button>
        </div>

        <ul v-if="memberList.length" role="list" class="divide-y divide-line">
          <li
            v-for="m in memberList"
            :key="m.userId"
            class="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-sunken/60"
            data-testid="member-row"
          >
            <Avatar :name="m.name" :email="m.email" size="md" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-neutral-900">{{ m.name ?? m.email }}</p>
              <p class="truncate text-xs text-neutral-500">{{ m.email }}</p>
            </div>
            <Badge :tone="roleTone(m.role)" size="sm" class="hidden sm:inline-flex">{{ m.role.replace(/_/g, ' ') }}</Badge>
            <Badge :tone="statusTone(m.status)" size="sm" dot class="hidden sm:inline-flex">{{ m.status }}</Badge>

            <!-- Row actions -->
            <Menu v-if="session.canMutate && m.role !== 'owner'" as="div" class="relative shrink-0">
              <MenuButton
                class="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-900/[0.05] hover:text-neutral-700"
                :aria-label="$t('orgAdmin.role')"
              >
                <PhDotsThreeVertical :size="18" weight="bold" />
              </MenuButton>
              <transition
                enter-active-class="transition ease-out duration-100"
                enter-from-class="transform opacity-0 scale-95"
                enter-to-class="transform opacity-100 scale-100"
                leave-active-class="transition ease-in duration-75"
                leave-from-class="transform opacity-100 scale-100"
                leave-to-class="transform opacity-0 scale-95"
              >
                <MenuItems
                  class="absolute right-0 z-20 mt-1.5 w-52 origin-top-right overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-pop focus:outline-none"
                >
                  <p class="px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-400">
                    {{ $t('orgAdmin.role') }}
                  </p>
                  <MenuItem v-for="r in roles.filter((x) => x !== m.role && x !== 'owner')" :key="r" v-slot="{ active }">
                    <button
                      :class="[active ? 'bg-neutral-900/[0.05]' : '', 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm capitalize text-neutral-700']"
                      @click="run(() => changeRole(m.userId, r as never), 'members')"
                    >
                      <PhUserSwitch :size="16" class="text-neutral-400" /> {{ r.replace(/_/g, ' ') }}
                    </button>
                  </MenuItem>
                  <template v-if="isOwner && m.status !== 'suspended'">
                    <div class="my-1 border-t border-line" />
                    <MenuItem v-slot="{ active }">
                      <button
                        :class="[active ? 'bg-clay-500/10' : '', 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-clay-700']"
                        @click="run(() => suspendMember(m.userId), 'members')"
                      >
                        <PhProhibit :size="16" /> {{ $t('orgAdmin.suspend') }}
                      </button>
                    </MenuItem>
                  </template>
                </MenuItems>
              </transition>
            </Menu>
          </li>
        </ul>
        <EmptyState sticker="leads" v-else :title="$t('orgAdmin.member')" :message="$t('orgAdmin.subtitle')">
          <template #icon><PhUsersThree :size="24" /></template>
        </EmptyState>
      </Card>
    </div>

    <!-- Workspaces -->
    <div v-else-if="tab === 'workspaces'">
      <p v-if="!isAgency" class="text-sm text-neutral-400">{{ $t('orgAdmin.agencyOnly') }}</p>
      <Card v-else padding="none" class="overflow-hidden">
        <!-- Create form header -->
        <div v-if="session.canMutate" class="flex flex-wrap items-end gap-2 border-b border-line bg-surface-sunken/40 px-4 py-3.5">
          <label class="min-w-0 flex-1">
            <span class="label">{{ $t('orgAdmin.workspaceName') }}</span>
            <input v-model="wsName" :placeholder="$t('orgAdmin.workspaceName')" :aria-label="$t('orgAdmin.workspaceName')" class="input text-sm" />
          </label>
          <Button size="sm" class="mb-px self-end" @click="makeWorkspace">{{ $t('orgAdmin.create') }}</Button>
        </div>

        <ul v-if="workspaces?.workspaces.length" role="list" class="divide-y divide-line">
          <li
            v-for="w in workspaces.workspaces"
            :key="w.id"
            class="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-sunken/60"
            data-testid="workspace-row"
          >
            <MimuIcon name="store" variant="sticker" :size="68" class="shrink-0" />
            <p class="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-900">{{ w.name }}</p>
            <Badge :tone="w.status === 'archived' ? 'neutral' : 'success'" size="sm" dot>{{ w.status }}</Badge>
            <button
              v-if="session.canMutate && w.status !== 'archived'"
              class="shrink-0 text-xs font-medium text-clay-600 hover:underline"
              @click="run(() => updateWorkspace(w.id, { status: 'archived' }), 'ws-admin')"
            >
              {{ $t('orgAdmin.archive') }}
            </button>
          </li>
        </ul>
        <EmptyState sticker="store" v-else :title="$t('orgAdmin.noWorkspaces')">
          <template #icon><PhStack :size="24" /></template>
        </EmptyState>
      </Card>
    </div>

    <!-- Verification -->
    <div v-else-if="tab === 'verification'">
      <Card>
        <div class="flex items-start gap-4">
          <MimuIcon name="approved" variant="sticker" :size="104" class="shrink-0" />
          <div class="min-w-0 flex-1">
            <p class="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{{ $t('orgAdmin.verificationLevel') }}</p>
            <div class="mt-1 flex flex-wrap items-center gap-2">
              <p class="text-[15px] font-semibold capitalize text-neutral-900">{{ session.context.tier }}</p>
              <Badge :tone="session.context.tier === 'agency' ? 'accent' : 'success'" size="sm">{{ session.context.tier }}</Badge>
            </div>
            <p class="mt-2 max-w-md text-sm text-neutral-500">{{ $t('orgAdmin.verificationBody') }}</p>
            <RouterLink to="/verify">
              <Button variant="outline" size="sm" class="mt-4">
                <PhSealCheck :size="16" /> {{ $t('orgAdmin.openVerification') }} <PhArrowRight :size="14" />
              </Button>
            </RouterLink>
          </div>
        </div>
      </Card>
    </div>

    <!-- API keys -->
    <div v-else class="space-y-4">
      <!-- One-time key reveal -->
      <div v-if="newKey" class="overflow-hidden rounded-xl border border-gold-200/60 bg-gold-500/10 px-4 py-3.5">
        <p class="break-all font-mono text-sm text-gold-800">{{ newKey }}</p>
        <p class="mt-1 text-xs text-gold-700">{{ $t('orgAdmin.keyOnce') }}</p>
      </div>

      <Card padding="none" class="overflow-hidden">
        <!-- Create form header -->
        <div v-if="session.canMutate" class="flex flex-wrap items-end gap-2 border-b border-line bg-surface-sunken/40 px-4 py-3.5">
          <label class="min-w-0 flex-1">
            <span class="label">{{ $t('orgAdmin.apiKeyName') }}</span>
            <input v-model="keyName" :placeholder="$t('orgAdmin.apiKeyName')" :aria-label="$t('orgAdmin.apiKeyName')" class="input text-sm" />
          </label>
          <Button size="sm" class="mb-px self-end" @click="makeKey">{{ $t('orgAdmin.createKey') }}</Button>
        </div>

        <ul v-if="((keys as { keys?: Array<{ id: string; name: string }> })?.keys?.length)" role="list" class="divide-y divide-line">
          <li
            v-for="k in ((keys as { keys?: Array<{ id: string; name: string }> })?.keys ?? [])"
            :key="k.id"
            class="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-sunken/60"
          >
            <MimuIcon name="api" variant="sticker" :size="68" class="shrink-0" />
            <p class="min-w-0 flex-1 truncate text-sm text-neutral-900">{{ k.name }}</p>
            <button class="shrink-0 text-xs font-medium text-clay-600 hover:underline" @click="run(() => revokeApiKey(k.id), 'apikeys')">{{ $t('orgAdmin.revoke') }}</button>
          </li>
        </ul>
        <EmptyState sticker="api" v-else :title="$t('orgAdmin.noKeys')">
          <template #icon><PhKey :size="24" /></template>
        </EmptyState>
      </Card>
    </div>
    </div>
  </div>
</template>
