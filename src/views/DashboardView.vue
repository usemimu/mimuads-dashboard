<script setup lang="ts">
import { useSession } from '@/stores/session'

const session = useSession()
</script>

<template>
  <div>
    <h1 class="font-display text-3xl font-semibold text-neutral-900">{{ $t('nav.dashboard') }}</h1>
    <p class="mt-1 text-sm text-neutral-500">{{ $t('context.actingAs') }}</p>

    <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-xl border border-neutral-200 bg-white p-5">
        <p class="text-xs uppercase tracking-wide text-neutral-400">{{ $t('context.org') }}</p>
        <p class="mt-1 font-mono text-sm text-neutral-900">{{ session.context.orgId ?? '—' }}</p>
      </div>
      <div class="rounded-xl border border-neutral-200 bg-white p-5">
        <p class="text-xs uppercase tracking-wide text-neutral-400">{{ $t('context.workspace') }}</p>
        <p class="mt-1 font-mono text-sm text-neutral-900">
          {{ session.context.workspaceId ?? '—' }}
        </p>
      </div>
      <div class="rounded-xl border border-neutral-200 bg-white p-5">
        <p class="text-xs uppercase tracking-wide text-neutral-400">Role</p>
        <p class="mt-1 text-sm capitalize text-neutral-900">{{ session.role ?? '—' }}</p>
      </div>
      <div class="rounded-xl border border-neutral-200 bg-white p-5">
        <p class="text-xs uppercase tracking-wide text-neutral-400">Tier</p>
        <p class="mt-1 text-sm capitalize text-neutral-900">{{ session.context.tier ?? '—' }}</p>
      </div>
    </div>
  </div>
</template>
