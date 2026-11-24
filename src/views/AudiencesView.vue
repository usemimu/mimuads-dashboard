<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { PhUsers, PhPlus, PhUploadSimple, PhCheckCircle } from '@phosphor-icons/vue'
import Card from '@/components/ui/Card.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import Badge from '@/components/ui/Badge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { useSession } from '@/stores/session'
import { listCustomAudiences, createCustomAudience, uploadAudienceContacts } from '@/api/outreach'
import type { CustomAudience } from '@/api/contracts/outreach'
import { ctxKey } from '@/lib/ctx-key'

const session = useSession()
const qc = useQueryClient()

const { data: audiences } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'audiences')),
  queryFn: listCustomAudiences,
})

const list = computed<CustomAudience[]>(() => audiences.value ?? [])

// ── Create new audience ──────────────────────────────────────────────────────
const showCreate = ref(false)
const newName = ref('')
const { mutate: doCreate, isPending: creating } = useMutation({
  mutationFn: () => createCustomAudience(newName.value.trim()),
  onSuccess: () => {
    newName.value = ''
    showCreate.value = false
    qc.invalidateQueries({ queryKey: ctxKey(session.context, 'audiences') })
  },
})

// ── Upload contacts ──────────────────────────────────────────────────────────
const uploadingId = ref<string | null>(null)
const uploadInput = ref('')
const uploadError = ref('')

function openUpload(id: string) {
  uploadingId.value = id
  uploadInput.value = ''
  uploadError.value = ''
}
function closeUpload() {
  uploadingId.value = null
}

const { mutate: doUpload, isPending: uploading } = useMutation({
  mutationFn: ({ id, emails }: { id: string; emails: string[] }) =>
    uploadAudienceContacts(id, { emails }),
  onSuccess: () => {
    closeUpload()
    qc.invalidateQueries({ queryKey: ctxKey(session.context, 'audiences') })
  },
  onError: (e: unknown) => {
    uploadError.value = e instanceof Error ? e.message : 'Upload failed'
  },
})

function submitUpload() {
  if (!uploadingId.value) return
  const emails = uploadInput.value
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (!emails.length) {
    uploadError.value = 'Paste at least one email address.'
    return
  }
  doUpload({ id: uploadingId.value, emails })
}

function statusTone(status: string) {
  return status === 'ready' ? 'success' : 'neutral'
}
</script>

<template>
  <div class="page-container">
    <PageHeader title="Audiences" subtitle="Custom audience lists for Outreach campaigns">
      <template #actions>
        <button class="btn-primary" @click="showCreate = true">
          <PhPlus :size="16" weight="bold" />
          New Audience
        </button>
      </template>
    </PageHeader>

    <!-- Create modal -->
    <div v-if="showCreate" class="modal-backdrop" @click.self="showCreate = false">
      <Card class="modal-card">
        <h3 class="text-base font-semibold mb-4">New Audience</h3>
        <label class="label mb-1">Audience name</label>
        <input v-model="newName" class="input mb-4" placeholder="e.g. Loyal customers" />
        <div class="flex gap-2 justify-end">
          <button class="btn-ghost" @click="showCreate = false">Cancel</button>
          <button class="btn-primary" :disabled="!newName.trim() || creating" @click="doCreate()">
            Create
          </button>
        </div>
      </Card>
    </div>

    <!-- Upload modal -->
    <div v-if="uploadingId" class="modal-backdrop" @click.self="closeUpload">
      <Card class="modal-card">
        <h3 class="text-base font-semibold mb-2">Upload contacts</h3>
        <p class="text-sm text-neutral-500 mb-3">
          Paste email addresses (one per line or comma-separated). They'll be hashed and matched
          against opted-in subscribers.
        </p>
        <textarea
          v-model="uploadInput"
          class="input resize-y min-h-[120px] font-mono text-xs mb-2"
          placeholder="user@example.com&#10;another@example.com"
        />
        <p v-if="uploadError" class="text-sm text-red-500 mb-2">{{ uploadError }}</p>
        <div class="flex gap-2 justify-end">
          <button class="btn-ghost" @click="closeUpload">Cancel</button>
          <button class="btn-primary" :disabled="uploading" @click="submitUpload">
            <PhUploadSimple :size="16" class="mr-1" />
            Upload
          </button>
        </div>
      </Card>
    </div>

    <!-- Empty state -->
    <EmptyState
      v-if="!list.length"
      icon="users"
      title="No audiences yet"
      body="Create a custom audience to target your existing customers in Outreach campaigns."
    />

    <!-- Audience list -->
    <div v-else class="grid gap-3">
      <Card v-for="a in list" :key="a.id" class="flex items-center gap-4 p-4">
        <PhUsers :size="32" class="text-neutral-400 shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-sm truncate">{{ a.name }}</p>
          <p class="text-xs text-neutral-500 mt-0.5">
            {{ a.totalUploaded }} uploaded · {{ a.matchCount }} matched
          </p>
        </div>
        <Badge :tone="statusTone(a.status)" :label="a.status" />
        <button
          class="btn-ghost text-xs"
          :disabled="a.status === 'processing'"
          @click="openUpload(a.id)"
        >
          <PhUploadSimple :size="14" class="mr-1" />
          Add contacts
        </button>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  @apply fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4;
}
.modal-card {
  @apply w-full max-w-md;
}
</style>
