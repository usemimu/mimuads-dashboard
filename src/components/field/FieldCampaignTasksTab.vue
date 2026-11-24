<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import {
  PhPlus,
  PhPencilSimple,
  PhTrash,
  PhMapPin,
  PhCamera,
  PhDeviceMobile,
  PhCheckCircle,
  PhXCircle,
  PhCaretRight,
  PhArrowLeft,
} from '@phosphor-icons/vue'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import {
  listFieldTasks,
  createFieldTask,
  updateFieldTask,
  deleteFieldTask,
  listTaskCompletions,
  reviewTaskCompletion,
} from '@/api/field'
import type { FieldTask, TaskCompletion, TaskProofType } from '@/api/contracts/field-tasks'
import { formatKobo, nairaToKobo } from '@/lib/money'
import { useToastStore } from '@/stores/toast'
import { isApiError } from '@/api/errors'

const props = defineProps<{ campaignId: string }>()
const qc = useQueryClient()
const toast = useToastStore()

// ── State ────────────────────────────────────────────────────────────────

type Panel = 'list' | 'form' | 'completions'
const panel = ref<Panel>('list')
const editingTask = ref<FieldTask | null>(null)
const viewingTask = ref<FieldTask | null>(null)
const confirmDeleteId = ref<string | null>(null)
const rejectingId = ref<string | null>(null)
const rejectReason = ref('')

// ── Queries ──────────────────────────────────────────────────────────────

const tasksKey = computed(() => ['field-tasks', props.campaignId])

const { data: tasksData, isLoading } = useQuery({
  queryKey: tasksKey,
  queryFn: () => listFieldTasks(props.campaignId),
})
const tasks = computed<FieldTask[]>(() => tasksData.value ?? [])

const completionsKey = computed(() => ['field-task-completions', props.campaignId, viewingTask.value?.id])

const { data: completionsData, isLoading: loadingCompletions } = useQuery({
  queryKey: completionsKey,
  queryFn: () => listTaskCompletions(props.campaignId, viewingTask.value!.id),
  enabled: computed(() => panel.value === 'completions' && !!viewingTask.value),
})
const completions = computed<TaskCompletion[]>(() => completionsData.value ?? [])
const pendingCount = computed(() => completions.value.filter((c) => c.status === 'pending').length)

// ── Form ─────────────────────────────────────────────────────────────────

interface TaskForm {
  title: string
  description: string
  proofType: TaskProofType
  payoutNaira: string
  maxCompletions: string
  targetLat: string
  targetLng: string
  targetRadiusMetres: string
  deadline: string
}

const emptyForm = (): TaskForm => ({
  title: '',
  description: '',
  proofType: 'none',
  payoutNaira: '',
  maxCompletions: '',
  targetLat: '',
  targetLng: '',
  targetRadiusMetres: '100',
  deadline: '',
})

const form = ref<TaskForm>(emptyForm())

function openCreate() {
  editingTask.value = null
  form.value = emptyForm()
  panel.value = 'form'
}

function openEdit(task: FieldTask) {
  editingTask.value = task
  form.value = {
    title: task.title,
    description: task.description,
    proofType: task.proofType,
    payoutNaira: (task.payoutKobo / 100).toString(),
    maxCompletions: task.maxCompletions != null ? String(task.maxCompletions) : '',
    targetLat: task.targetLat != null ? String(task.targetLat) : '',
    targetLng: task.targetLng != null ? String(task.targetLng) : '',
    targetRadiusMetres: String(task.targetRadiusMetres),
    deadline: task.deadline ? task.deadline.slice(0, 10) : '',
  }
  panel.value = 'form'
}

function openCompletions(task: FieldTask) {
  viewingTask.value = task
  panel.value = 'completions'
}

// ── Mutations ─────────────────────────────────────────────────────────────

const saveMutation = useMutation({
  mutationFn: () => {
    const payoutKobo = nairaToKobo(parseFloat(form.value.payoutNaira) || 0)
    const maxCompletions = form.value.maxCompletions ? parseInt(form.value.maxCompletions) : null
    const targetLat = form.value.targetLat ? parseFloat(form.value.targetLat) : null
    const targetLng = form.value.targetLng ? parseFloat(form.value.targetLng) : null
    const payload = {
      title: form.value.title.trim(),
      description: form.value.description.trim(),
      proofType: form.value.proofType,
      payoutKobo,
      maxCompletions,
      targetLat,
      targetLng,
      targetRadiusMetres: parseInt(form.value.targetRadiusMetres) || 100,
      deadline: form.value.deadline ? new Date(form.value.deadline + 'T23:59:59Z').toISOString() : null,
    }
    if (editingTask.value) {
      return updateFieldTask(props.campaignId, editingTask.value.id, payload)
    }
    return createFieldTask(props.campaignId, payload)
  },
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: tasksKey.value })
    panel.value = 'list'
    toast.success(editingTask.value ? 'Task updated' : 'Task created')
  },
  onError: (e) => toast.error(isApiError(e) ? e.message : 'Failed to save task'),
})

const toggleMutation = useMutation({
  mutationFn: ({ taskId, isActive }: { taskId: string; isActive: boolean }) =>
    updateFieldTask(props.campaignId, taskId, { isActive }),
  onSuccess: () => qc.invalidateQueries({ queryKey: tasksKey.value }),
  onError: (e) => toast.error(isApiError(e) ? e.message : 'Failed to update task'),
})

const deleteMutation = useMutation({
  mutationFn: (taskId: string) => deleteFieldTask(props.campaignId, taskId),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: tasksKey.value })
    confirmDeleteId.value = null
    toast.success('Task deleted')
  },
  onError: (e) => toast.error(isApiError(e) ? e.message : 'Failed to delete task'),
})

const approveMutation = useMutation({
  mutationFn: (completionId: string) =>
    reviewTaskCompletion(props.campaignId, viewingTask.value!.id, completionId, 'approved'),
  onSuccess: () => qc.invalidateQueries({ queryKey: completionsKey.value }),
  onError: (e) => toast.error(isApiError(e) ? e.message : 'Failed to approve'),
})

const rejectMutation = useMutation({
  mutationFn: ({ id, reason }: { id: string; reason: string }) =>
    reviewTaskCompletion(props.campaignId, viewingTask.value!.id, id, 'rejected', reason),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: completionsKey.value })
    rejectingId.value = null
    rejectReason.value = ''
  },
  onError: (e) => toast.error(isApiError(e) ? e.message : 'Failed to reject'),
})

// ── Helpers ───────────────────────────────────────────────────────────────

const proofTypeLabel: Record<TaskProofType, string> = {
  none: 'No proof',
  photo: 'Photo',
  gps: 'GPS location',
  screenshot: 'Screenshot',
}

const proofTypeTone: Record<TaskProofType, 'neutral' | 'accent' | 'info' | 'pending'> = {
  none: 'neutral',
  photo: 'accent',
  gps: 'info',
  screenshot: 'pending',
}

function completionTone(status: TaskCompletion['status']): 'neutral' | 'success' | 'danger' | 'pending' {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  return 'pending'
}

function shortDate(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return iso
  return new Date(t).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formValid = computed(
  () => form.value.title.trim() && form.value.description.trim() && form.value.payoutNaira,
)
</script>

<template>
  <!-- ── Task list ─────────────────────────────────────────────────────── -->
  <div v-if="panel === 'list'" class="space-y-3">
    <div class="flex items-center justify-between">
      <p class="text-sm text-neutral-500">Custom tasks scouts must complete for extra earnings</p>
      <Button size="sm" @click="openCreate">
        <PhPlus :size="14" />
        Add task
      </Button>
    </div>

    <div v-if="isLoading" class="py-6 text-center text-sm text-neutral-400">Loading…</div>

    <div v-else-if="!tasks.length" class="rounded-xl bg-clay-50 p-6 text-center text-sm text-neutral-400">
      No tasks yet. Add a task to give scouts extra ways to earn.
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="rounded-xl border border-line bg-surface p-4 shadow-card"
        :class="{ 'opacity-60': !task.isActive }"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-body font-semibold text-neutral-900">{{ task.title }}</span>
              <Badge :tone="proofTypeTone[task.proofType]" size="sm">{{ proofTypeLabel[task.proofType] }}</Badge>
              <Badge v-if="!task.isActive" tone="neutral" size="sm">Inactive</Badge>
            </div>
            <p class="mt-0.5 text-xs text-neutral-500 line-clamp-2">{{ task.description }}</p>
            <div class="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
              <span class="font-display font-semibold text-neutral-800">{{ formatKobo(task.payoutKobo, { showDecimals: false }) }} / scout</span>
              <span v-if="task.maxCompletions != null">
                {{ task.completionCount }}/{{ task.maxCompletions }} completions
              </span>
              <span v-else>{{ task.completionCount }} completions</span>
              <span v-if="task.deadline">Due {{ shortDate(task.deadline) }}</span>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-1">
            <button
              class="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              title="View submissions"
              @click="openCompletions(task)"
            >
              <PhCaretRight :size="15" />
            </button>
            <button
              class="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              title="Edit task"
              @click="openEdit(task)"
            >
              <PhPencilSimple :size="15" />
            </button>
            <button
              class="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-clay-600"
              title="Delete task"
              @click="confirmDeleteId = task.id"
            >
              <PhTrash :size="15" />
            </button>
          </div>
        </div>

        <!-- Active toggle -->
        <div class="mt-3 flex items-center justify-between border-t border-line pt-3">
          <button
            class="flex items-center gap-1.5 text-xs font-medium"
            :class="task.isActive ? 'text-moss-600' : 'text-neutral-400'"
            :disabled="toggleMutation.isPending.value"
            @click="toggleMutation.mutate({ taskId: task.id, isActive: !task.isActive })"
          >
            <span
              class="inline-block h-3.5 w-6 rounded-full transition-colors"
              :class="task.isActive ? 'bg-moss-400' : 'bg-neutral-200'"
            >
              <span
                class="mt-0.5 ml-0.5 inline-block h-2.5 w-2.5 translate-x-0 rounded-full bg-white shadow transition-transform"
                :class="{ 'translate-x-2.5': task.isActive }"
              />
            </span>
            {{ task.isActive ? 'Active' : 'Inactive' }}
          </button>
          <button
            class="text-xs font-medium text-clay-500 hover:text-clay-700"
            @click="openCompletions(task)"
          >
            View {{ task.completionCount }} submission{{ task.completionCount !== 1 ? 's' : '' }} →
          </button>
        </div>

        <!-- Delete confirm -->
        <div v-if="confirmDeleteId === task.id" class="mt-3 rounded-lg bg-clay-50 p-3">
          <p class="mb-2 text-xs font-medium text-clay-700">Delete this task? All submission data will be lost.</p>
          <div class="flex gap-2">
            <Button size="sm" variant="danger" :disabled="deleteMutation.isPending.value" @click="deleteMutation.mutate(task.id)">
              Delete
            </Button>
            <Button size="sm" variant="ghost" @click="confirmDeleteId = null">Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Create / edit form ─────────────────────────────────────────────── -->
  <div v-else-if="panel === 'form'" class="space-y-4">
    <div class="flex items-center gap-2">
      <button class="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700" @click="panel = 'list'">
        <PhArrowLeft :size="16" />
      </button>
      <h3 class="font-body font-semibold text-neutral-900">{{ editingTask ? 'Edit task' : 'New task' }}</h3>
    </div>

    <div class="space-y-3 rounded-xl bg-clay-50 p-4">
      <!-- Title -->
      <div>
        <label class="eyebrow mb-1 block">Task title</label>
        <input
          v-model="form.title"
          class="w-full rounded-lg border border-clay-200 bg-white px-3 py-2 text-sm focus:border-clay-400 focus:outline-none"
          placeholder="e.g. Take a photo at the screen location"
        />
      </div>

      <!-- Description -->
      <div>
        <label class="eyebrow mb-1 block">Instructions</label>
        <textarea
          v-model="form.description"
          rows="3"
          class="w-full resize-none rounded-lg border border-clay-200 bg-white px-3 py-2 text-sm focus:border-clay-400 focus:outline-none"
          placeholder="Describe exactly what the scout should do…"
        />
      </div>

      <!-- Proof type -->
      <div>
        <label class="eyebrow mb-2 block">Proof required</label>
        <div class="grid grid-cols-2 gap-2">
          <label
            v-for="opt in (['none', 'photo', 'gps', 'screenshot'] as const)"
            :key="opt"
            class="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
            :class="form.proofType === opt ? 'border-clay-400 bg-clay-50 font-medium text-clay-700' : 'border-line bg-white text-neutral-600'"
          >
            <input v-model="form.proofType" type="radio" :value="opt" class="sr-only" />
            <PhMapPin v-if="opt === 'gps'" :size="14" />
            <PhCamera v-else-if="opt === 'photo'" :size="14" />
            <PhDeviceMobile v-else-if="opt === 'screenshot'" :size="14" />
            <span v-else class="inline-block h-3.5 w-3.5 rounded-full border-2 border-current opacity-50" />
            {{ proofTypeLabel[opt] }}
          </label>
        </div>
      </div>

      <!-- GPS target (only for gps proof) -->
      <div v-if="form.proofType === 'gps'" class="space-y-2 rounded-lg bg-white p-3">
        <p class="eyebrow text-neutral-500">Target location (optional)</p>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="eyebrow mb-1 block text-neutral-400">Latitude</label>
            <input v-model="form.targetLat" type="number" step="any" class="w-full rounded-lg border border-clay-200 px-3 py-2 text-sm focus:border-clay-400 focus:outline-none" placeholder="6.5244" />
          </div>
          <div>
            <label class="eyebrow mb-1 block text-neutral-400">Longitude</label>
            <input v-model="form.targetLng" type="number" step="any" class="w-full rounded-lg border border-clay-200 px-3 py-2 text-sm focus:border-clay-400 focus:outline-none" placeholder="3.3792" />
          </div>
        </div>
        <div>
          <label class="eyebrow mb-1 block text-neutral-400">Acceptable radius (metres)</label>
          <input v-model="form.targetRadiusMetres" type="number" min="10" class="w-full rounded-lg border border-clay-200 px-3 py-2 text-sm focus:border-clay-400 focus:outline-none" placeholder="100" />
        </div>
      </div>

      <!-- Payout + max completions -->
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="eyebrow mb-1 block">Payout per scout (₦)</label>
          <input v-model="form.payoutNaira" type="number" min="0" class="w-full rounded-lg border border-clay-200 bg-white px-3 py-2 text-sm focus:border-clay-400 focus:outline-none" placeholder="500" />
        </div>
        <div>
          <label class="eyebrow mb-1 block">Max completions</label>
          <input v-model="form.maxCompletions" type="number" min="1" class="w-full rounded-lg border border-clay-200 bg-white px-3 py-2 text-sm focus:border-clay-400 focus:outline-none" placeholder="Unlimited" />
        </div>
      </div>

      <!-- Deadline -->
      <div>
        <label class="eyebrow mb-1 block">Deadline (optional)</label>
        <input v-model="form.deadline" type="date" class="w-full rounded-lg border border-clay-200 bg-white px-3 py-2 text-sm focus:border-clay-400 focus:outline-none" />
      </div>
    </div>

    <div class="flex gap-2">
      <Button :disabled="!formValid || saveMutation.isPending.value" @click="saveMutation.mutate()">
        {{ saveMutation.isPending.value ? 'Saving…' : editingTask ? 'Save changes' : 'Create task' }}
      </Button>
      <Button variant="ghost" @click="panel = 'list'">Cancel</Button>
    </div>
  </div>

  <!-- ── Completions review ──────────────────────────────────────────────── -->
  <div v-else-if="panel === 'completions' && viewingTask" class="space-y-3">
    <div class="flex items-center gap-2">
      <button class="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700" @click="panel = 'list'">
        <PhArrowLeft :size="16" />
      </button>
      <div class="min-w-0 flex-1">
        <h3 class="font-body font-semibold text-neutral-900">{{ viewingTask.title }}</h3>
        <p class="text-xs text-neutral-400">Submissions</p>
      </div>
      <span v-if="pendingCount > 0" class="inline-flex items-center rounded-full bg-clay-500 px-2 py-0.5 text-[11px] font-semibold text-white">
        {{ pendingCount }} pending
      </span>
    </div>

    <div v-if="loadingCompletions" class="py-6 text-center text-sm text-neutral-400">Loading…</div>

    <div v-else-if="!completions.length" class="rounded-xl bg-clay-50 p-6 text-center text-sm text-neutral-400">
      No submissions yet.
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="c in completions"
        :key="c.id"
        class="rounded-xl border border-line bg-surface p-4 shadow-card"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-medium text-neutral-800 text-sm">{{ c.scout.displayName }}</span>
              <span class="text-xs text-neutral-400">{{ c.scout.email }}</span>
              <Badge :tone="completionTone(c.status)" size="sm" class="capitalize">{{ c.status }}</Badge>
            </div>
            <p class="mt-0.5 text-xs text-neutral-400">{{ shortDate(c.createdAt) }}</p>

            <!-- Photo proof -->
            <a v-if="c.proofUrl" :href="c.proofUrl" target="_blank" rel="noopener" class="mt-2 inline-block">
              <img :src="c.proofUrl" alt="Proof" class="h-24 w-auto rounded-lg object-cover border border-line" />
            </a>

            <!-- GPS proof -->
            <a
              v-if="c.proofLat != null && c.proofLng != null"
              :href="`https://maps.google.com/?q=${c.proofLat},${c.proofLng}`"
              target="_blank"
              rel="noopener"
              class="mt-2 inline-flex items-center gap-1 text-xs text-clay-500 hover:underline"
            >
              <PhMapPin :size="12" />
              {{ c.proofLat.toFixed(5) }}, {{ c.proofLng.toFixed(5) }}
            </a>

            <!-- Rejection reason -->
            <p v-if="c.status === 'rejected' && c.rejectionReason" class="mt-1 text-xs text-clay-600">
              Reason: {{ c.rejectionReason }}
            </p>
          </div>

          <!-- Approve / reject buttons for pending -->
          <div v-if="c.status === 'pending'" class="flex shrink-0 flex-col items-end gap-1.5">
            <button
              class="flex items-center gap-1 rounded-lg bg-moss-50 px-2.5 py-1.5 text-xs font-semibold text-moss-700 hover:bg-moss-100 disabled:opacity-50"
              :disabled="approveMutation.isPending.value"
              @click="approveMutation.mutate(c.id)"
            >
              <PhCheckCircle :size="13" />
              Approve {{ formatKobo(viewingTask.payoutKobo, { showDecimals: false }) }}
            </button>
            <button
              class="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-clay-600 hover:bg-clay-50"
              @click="rejectingId = c.id"
            >
              <PhXCircle :size="13" />
              Reject
            </button>
          </div>

          <div v-else-if="c.status === 'approved'" class="shrink-0 text-xs font-semibold text-moss-600">
            {{ formatKobo(c.earnedKobo, { showDecimals: false }) }} paid
          </div>
        </div>

        <!-- Rejection form -->
        <div v-if="rejectingId === c.id" class="mt-3 space-y-2 rounded-lg bg-clay-50 p-3">
          <textarea
            v-model="rejectReason"
            rows="2"
            class="w-full resize-none rounded-lg border border-clay-200 bg-white px-3 py-2 text-sm focus:border-clay-400 focus:outline-none"
            placeholder="Reason for rejection (optional)"
          />
          <div class="flex gap-2">
            <Button
              size="sm"
              variant="danger"
              :disabled="rejectMutation.isPending.value"
              @click="rejectMutation.mutate({ id: c.id, reason: rejectReason })"
            >
              Confirm reject
            </Button>
            <Button size="sm" variant="ghost" @click="rejectingId = null; rejectReason = ''">Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
