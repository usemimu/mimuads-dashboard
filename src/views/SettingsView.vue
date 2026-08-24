<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  PhUser,
  PhShieldCheck,
  PhLockKey,
  PhBuildings,
  PhSignOut,
  PhTrash,
  PhCamera,
} from '@phosphor-icons/vue'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import Badge from '@/components/ui/Badge.vue'
import OrgWorkspaceSwitcher from '@/components/OrgWorkspaceSwitcher.vue'
import { useI18n } from 'vue-i18n'
import { useSession } from '@/stores/session'
import { useToastStore } from '@/stores/toast'
import { isApiError } from '@/api/errors'
import {
  getBusinessProfile,
  updateBusinessProfile,
  changePassword,
  deleteAccount,
  requestAvatarUploadUrl,
  uploadAvatarToPresigned,
  confirmAvatar,
  deleteAvatar,
} from '@/api/profile'
import { getStates } from '@/api/onboarding'
import {
  BusinessCategorySchema,
  BusinessTypeSchema,
  type BusinessProfileResponse,
  type NigerianState,
  type UpdateBusinessProfileRequest,
} from '@/api/contracts/onboarding'

const session = useSession()
const router = useRouter()
const qc = useQueryClient()
const toast = useToastStore()
const { t } = useI18n()

const pretty = (v?: string | null) => (v ? v.replace(/_/g, ' ') : null)
const prettify = (v: string) => v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
const categories = BusinessCategorySchema.options
const businessTypes = BusinessTypeSchema.options

const roleLabel = computed(() => pretty(session.role) ?? '—')
const tierLabel = computed(() => pretty(session.context.tier) ?? '—')
const initials = computed(() => {
  const parts = String(session.user?.name ?? '').trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'M'
})

// ── Avatar ───────────────────────────────────────────────────────────────────
const fileInput = ref<HTMLInputElement | null>(null)
const avatarBusy = ref(false)
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp']

function pickAvatar() {
  fileInput.value?.click()
}
async function onAvatarChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  avatarBusy.value = true
  try {
    const raw = (file.name.split('.').pop() ?? '').toLowerCase()
    const ext = ALLOWED_EXT.includes(raw) ? raw : 'jpg'
    const intent = await requestAvatarUploadUrl(ext)
    await uploadAvatarToPresigned(intent, file)
    await confirmAvatar(intent.fileUrl)
    await session.loadUser()
    toast.success('Photo updated.')
  } catch (err) {
    toast.error(isApiError(err) ? err.message : 'Could not upload photo.')
  } finally {
    avatarBusy.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}
async function onRemoveAvatar() {
  avatarBusy.value = true
  try {
    await deleteAvatar()
    await session.loadUser()
    toast.success('Photo removed.')
  } catch (err) {
    toast.error(isApiError(err) ? err.message : 'Could not remove photo.')
  } finally {
    avatarBusy.value = false
  }
}

// ── Change password ──────────────────────────────────────────────────────────
const pw = reactive({ current: '', next: '', confirm: '' })
const pwBusy = ref(false)
const pwMatch = computed(() => !pw.confirm || pw.next === pw.confirm)
async function onChangePassword() {
  if (!pwMatch.value || pw.next.length < 8) return
  pwBusy.value = true
  try {
    await changePassword(pw.current, pw.next)
    pw.current = pw.next = pw.confirm = ''
    toast.success(t('settings.passwordChanged'))
  } catch (e) {
    toast.error(isApiError(e) ? e.message : 'Could not change password.')
  } finally {
    pwBusy.value = false
  }
}

// ── Business profile ─────────────────────────────────────────────────────────
const { data: bizData, isLoading: bizLoading, error: bizLoadError } = useQuery({
  queryKey: ['business-profile'],
  queryFn: getBusinessProfile,
})
const { data: states } = useQuery({ queryKey: ['locations'], queryFn: getStates })
const lgasForState = computed(
  () => states.value?.find((s: NigerianState) => s.name === biz.state)?.lgas ?? [],
)

const biz = reactive({
  businessName: '',
  displayName: '',
  businessCategory: '' as string,
  businessType: '' as string,
  state: '',
  lga: '',
  approxClients: null as number | null,
  businessAddress: '',
  websiteUrl: '',
  socialHandles: '',
  rcNumber: '',
  taxId: '',
})
function seed(p: BusinessProfileResponse) {
  biz.businessName = p.businessName ?? ''
  biz.displayName = p.displayName ?? ''
  biz.businessCategory = p.businessCategory ?? ''
  biz.businessType = p.businessType ?? ''
  biz.state = p.state ?? ''
  biz.lga = p.lga ?? ''
  biz.approxClients = p.approxClients ?? null
}
watch(bizData, (v) => v && seed(v), { immediate: true })
const isAgency = computed(() => biz.businessType === 'agency' || session.context.tier === 'agency')

const bizBusy = ref(false)
async function onSaveBusiness() {
  bizBusy.value = true
  try {
    const trim = (v: string) => (v.trim() ? v.trim() : undefined)
    const patch: UpdateBusinessProfileRequest = {
      businessName: trim(biz.businessName),
      displayName: trim(biz.displayName),
      businessCategory: (biz.businessCategory || undefined) as UpdateBusinessProfileRequest['businessCategory'],
      businessType: (biz.businessType || undefined) as UpdateBusinessProfileRequest['businessType'],
      state: trim(biz.state),
      lga: trim(biz.lga),
      approxClients: biz.approxClients && biz.approxClients > 0 ? biz.approxClients : undefined,
      businessAddress: trim(biz.businessAddress),
      websiteUrl: trim(biz.websiteUrl),
      socialHandles: trim(biz.socialHandles),
      rcNumber: trim(biz.rcNumber),
      taxId: trim(biz.taxId),
    }
    const updated = await updateBusinessProfile(patch)
    seed(updated)
    qc.invalidateQueries({ queryKey: ['business-profile'] })
    toast.success(t('settings.businessSaved'))
  } catch (e) {
    toast.error(isApiError(e) ? e.message : 'Could not save business profile.')
  } finally {
    bizBusy.value = false
  }
}

// ── Danger zone: delete account ──────────────────────────────────────────────
const showDelete = ref(false)
const deleteReason = ref('')
const deleteBusy = ref(false)
async function onConfirmDelete() {
  deleteBusy.value = true
  try {
    await deleteAccount(deleteReason.value || undefined)
    session.clearSession()
    router.replace({ name: 'login' })
  } catch (e) {
    toast.error(isApiError(e) ? e.message : 'Could not delete account.')
    deleteBusy.value = false
  }
}

async function onSignOut() {
  await session.logout()
  router.replace({ name: 'login' })
}
</script>

<template>
  <div>
    <PageHeader :title="$t('settings.title')" />

    <div class="max-w-3xl space-y-6">
      <!-- Account + avatar -->
      <Card>
        <div class="mb-5 flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-clay-50 text-clay-600">
            <PhUser :size="20" />
          </div>
          <div>
            <h2 class="font-display text-lg font-semibold text-neutral-900">{{ $t('settings.account') }}</h2>
            <p class="text-sm text-neutral-500">{{ $t('settings.accountHint') }}</p>
          </div>
        </div>

        <div class="mb-5 flex items-center gap-4">
          <div class="relative">
            <img
              v-if="session.user?.profileImageUrl"
              :src="session.user.profileImageUrl"
              alt="avatar"
              class="h-16 w-16 rounded-full object-cover ring-1 ring-neutral-200"
            />
            <div
              v-else
              class="flex h-16 w-16 items-center justify-center rounded-full bg-clay-100 text-lg font-semibold text-clay-700"
            >
              {{ initials }}
            </div>
          </div>
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center gap-2">
              <Button size="sm" variant="outline" :disabled="avatarBusy" @click="pickAvatar">
                <PhCamera :size="16" /> {{ $t('settings.changePhoto') }}
              </Button>
              <Button
                v-if="session.user?.profileImageUrl"
                size="sm"
                variant="ghost"
                :disabled="avatarBusy"
                @click="onRemoveAvatar"
              >
                {{ $t('settings.removePhoto') }}
              </Button>
            </div>
            <p class="text-xs text-neutral-400">{{ $t('settings.photoHint') }}</p>
          </div>
          <input ref="fileInput" type="file" accept=".jpg,.jpeg,.png,.webp,image/*" class="hidden" @change="onAvatarChange" />
        </div>

        <dl class="divide-y divide-neutral-100">
          <div class="flex items-center justify-between py-3">
            <dt class="text-sm text-neutral-500">{{ $t('settings.name') }}</dt>
            <dd class="text-sm font-medium text-neutral-900">{{ session.user?.name || $t('settings.notSet') }}</dd>
          </div>
          <div class="flex items-center justify-between py-3">
            <dt class="text-sm text-neutral-500">{{ $t('settings.email') }}</dt>
            <dd class="text-sm font-medium text-neutral-900">{{ session.user?.email || $t('settings.notSet') }}</dd>
          </div>
          <div class="flex items-center justify-between py-3">
            <dt class="text-sm text-neutral-500">{{ $t('settings.phone') }}</dt>
            <dd class="font-mono text-sm font-medium text-neutral-900">{{ session.user?.phoneNumber || $t('settings.notSet') }}</dd>
          </div>
        </dl>
      </Card>

      <!-- Business profile -->
      <Card>
        <div class="mb-5 flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-moss-50 text-moss-600">
            <PhBuildings :size="20" />
          </div>
          <div>
            <h2 class="font-display text-lg font-semibold text-neutral-900">{{ $t('settings.business') }}</h2>
            <p class="text-sm text-neutral-500">{{ $t('settings.businessHint') }}</p>
          </div>
        </div>

        <p v-if="bizLoading" class="py-4 text-sm text-neutral-400">{{ $t('common.loading') }}</p>
        <p v-else-if="bizLoadError" class="py-4 text-sm text-clay-700">{{ (bizLoadError as Error).message }}</p>
        <form v-else class="space-y-4" @submit.prevent="onSaveBusiness">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block">
              <span class="label">{{ $t('settings.businessName') }}</span>
              <input v-model="biz.businessName" class="input" />
            </label>
            <label class="block">
              <span class="label">{{ $t('settings.displayName') }}</span>
              <input v-model="biz.displayName" class="input" />
            </label>
            <label class="block">
              <span class="label">{{ $t('settings.category') }}</span>
              <select v-model="biz.businessCategory" class="select">
                <option value="" disabled>—</option>
                <option v-for="c in categories" :key="c" :value="c">{{ prettify(c) }}</option>
              </select>
            </label>
            <label class="block">
              <span class="label">{{ $t('settings.businessType') }}</span>
              <select v-model="biz.businessType" class="select">
                <option value="" disabled>—</option>
                <option v-for="t in businessTypes" :key="t" :value="t">{{ prettify(t) }}</option>
              </select>
            </label>
            <label class="block">
              <span class="label">{{ $t('settings.state') }}</span>
              <select v-model="biz.state" class="select">
                <option value="">—</option>
                <option v-for="s in states ?? []" :key="s.code" :value="s.name">{{ s.name }}</option>
              </select>
            </label>
            <label class="block">
              <span class="label">{{ $t('settings.lga') }}</span>
              <select v-model="biz.lga" :disabled="!biz.state" class="select disabled:bg-neutral-100">
                <option value="">—</option>
                <option v-for="l in lgasForState" :key="l" :value="l">{{ l }}</option>
              </select>
            </label>
            <label class="block sm:col-span-2">
              <span class="label">{{ $t('settings.address') }}</span>
              <input v-model="biz.businessAddress" class="input" />
            </label>
            <label class="block">
              <span class="label">{{ $t('settings.website') }}</span>
              <input v-model="biz.websiteUrl" placeholder="https://…" class="input" />
            </label>
            <label class="block">
              <span class="label">{{ $t('settings.socials') }}</span>
              <input v-model="biz.socialHandles" class="input" />
            </label>
            <label class="block">
              <span class="label">{{ $t('settings.rcNumber') }}</span>
              <input v-model="biz.rcNumber" class="input" />
            </label>
            <label class="block">
              <span class="label">{{ $t('settings.taxId') }}</span>
              <input v-model="biz.taxId" class="input" />
            </label>
            <label v-if="isAgency" class="block">
              <span class="label">{{ $t('org.approxClients') }}</span>
              <input v-model.number="biz.approxClients" type="number" min="1" class="input" />
            </label>
          </div>
          <div class="flex items-center gap-3">
            <Button type="submit" :disabled="bizBusy">{{ bizBusy ? $t('settings.saving') : $t('settings.saveChanges') }}</Button>
          </div>
        </form>
      </Card>

      <!-- Change password -->
      <Card>
        <div class="mb-5 flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-50 text-gold-600">
            <PhLockKey :size="20" />
          </div>
          <div>
            <h2 class="font-display text-lg font-semibold text-neutral-900">{{ $t('settings.password') }}</h2>
            <p class="text-sm text-neutral-500">{{ $t('settings.passwordHint') }}</p>
          </div>
        </div>
        <form class="max-w-md space-y-4" @submit.prevent="onChangePassword">
          <label class="block">
            <span class="label">{{ $t('settings.currentPassword') }}</span>
            <input v-model="pw.current" type="password" autocomplete="current-password" required class="input" />
          </label>
          <label class="block">
            <span class="label">{{ $t('settings.newPassword') }}</span>
            <input v-model="pw.next" type="password" minlength="8" autocomplete="new-password" required class="input" />
          </label>
          <label class="block">
            <span class="label">{{ $t('settings.confirmPassword') }}</span>
            <input v-model="pw.confirm" type="password" autocomplete="new-password" required class="input" />
          </label>
          <p v-if="!pwMatch" class="text-sm text-clay-700">{{ $t('settings.passwordsMustMatch') }}</p>
          <div class="flex items-center gap-3">
            <Button type="submit" :disabled="pwBusy || !pwMatch || pw.next.length < 8">
              {{ pwBusy ? $t('settings.saving') : $t('settings.updatePassword') }}
            </Button>
          </div>
        </form>
      </Card>

      <!-- Access -->
      <Card>
        <div class="mb-5 flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
            <PhShieldCheck :size="20" />
          </div>
          <div>
            <h2 class="font-display text-lg font-semibold text-neutral-900">{{ $t('settings.access') }}</h2>
            <p class="text-sm text-neutral-500">{{ $t('settings.accessHint') }}</p>
          </div>
        </div>

        <!-- Active organization / workspace — switch context here. -->
        <div class="mb-5">
          <p class="label mb-1.5">{{ $t('settings.organization') }}</p>
          <OrgWorkspaceSwitcher />
        </div>

        <dl class="divide-y divide-neutral-100">
          <div class="flex items-center justify-between py-3">
            <dt class="text-sm text-neutral-500">{{ $t('settings.role') }}</dt>
            <dd><Badge tone="accent" class="capitalize">{{ roleLabel }}</Badge></dd>
          </div>
          <div class="flex items-center justify-between py-3">
            <dt class="text-sm text-neutral-500">{{ $t('settings.tier') }}</dt>
            <dd><Badge tone="info" class="capitalize">{{ tierLabel }}</Badge></dd>
          </div>
        </dl>
        <div class="mt-5 flex justify-end border-t border-neutral-100 pt-4">
          <Button variant="ghost" @click="onSignOut"><PhSignOut :size="16" /> {{ $t('settings.signOut') }}</Button>
        </div>
      </Card>

      <!-- Danger zone -->
      <Card class="ring-1 ring-clay-100">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-clay-50 text-clay-600">
              <PhTrash :size="20" />
            </div>
            <div>
              <h2 class="font-display text-lg font-semibold text-neutral-900">{{ $t('settings.dangerZone') }}</h2>
              <p class="max-w-md text-sm text-neutral-500">{{ $t('settings.deleteHint') }}</p>
            </div>
          </div>
          <Button variant="danger" @click="showDelete = true">{{ $t('settings.deleteAccount') }}</Button>
        </div>
      </Card>
    </div>

    <!-- Delete confirmation modal -->
    <div v-if="showDelete" class="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" @click="showDelete = false" />
      <div class="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-pop">
        <h3 class="font-display text-xl font-semibold text-neutral-900">{{ $t('settings.deleteConfirmTitle') }}</h3>
        <p class="mt-1 text-sm text-neutral-500">{{ $t('settings.deleteConfirmBody') }}</p>
        <label class="mt-4 block">
          <span class="label">{{ $t('settings.deleteReason') }}</span>
          <textarea v-model="deleteReason" rows="2" class="input" />
        </label>
        <div class="mt-5 flex justify-end gap-3">
          <Button variant="ghost" :disabled="deleteBusy" @click="showDelete = false">{{ $t('common.cancel') }}</Button>
          <Button variant="danger" :disabled="deleteBusy" @click="onConfirmDelete">
            {{ deleteBusy ? $t('settings.saving') : $t('settings.confirmDelete') }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
