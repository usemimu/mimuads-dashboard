import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useSession } from '@/stores/session'
import AppShell from '@/layouts/AppShell.vue'

/**
 * Routing + the context model. The shell is unreachable until (a) authenticated
 * and (b) an org exists. Deep links carry workspace context as `/w/:slug/...`;
 * resolving slug→workspaceId needs the (committed) list-workspaces endpoint, so
 * slice 1 records intent and lands in the shell — full resolution ships with that
 * endpoint (see docs/IMPLEMENTATION-NOTES.md).
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/onboarding',
    name: 'onboarding',
    component: () => import('@/views/OnboardingView.vue'),
    meta: { requiresAuth: true, requiresOrg: false },
  },
  {
    path: '/',
    component: AppShell,
    meta: { requiresAuth: true, requiresOrg: true },
    children: [
      { path: '', redirect: '/dashboard' },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { titleKey: 'nav.dashboard' },
      },
      {
        path: 'campaigns',
        name: 'campaigns',
        component: () => import('@/views/PlaceholderView.vue'),
        meta: { titleKey: 'nav.campaigns' },
      },
      {
        path: 'screens',
        name: 'screens',
        component: () => import('@/views/PlaceholderView.vue'),
        meta: { titleKey: 'nav.screens' },
      },
      {
        path: 'reports',
        name: 'reports',
        component: () => import('@/views/PlaceholderView.vue'),
        meta: { titleKey: 'nav.reports' },
      },
      {
        path: 'billing',
        name: 'billing',
        component: () => import('@/views/PlaceholderView.vue'),
        meta: { titleKey: 'nav.billing' },
      },
      {
        path: 'organization',
        name: 'organization',
        component: () => import('@/views/PlaceholderView.vue'),
        meta: { titleKey: 'nav.organization' },
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/PlaceholderView.vue'),
        meta: { titleKey: 'nav.settings' },
      },
    ],
  },
  // Workspace-context deep link. Slice 1 strips the prefix into the shell; slug
  // resolution arrives with the list-workspaces endpoint.
  {
    path: '/w/:workspaceSlug/:rest(.*)*',
    redirect: (to) => '/' + (Array.isArray(to.params.rest) ? to.params.rest.join('/') : ''),
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
  const session = useSession()
  if (!session.bootstrapped) await session.bootstrap()

  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth)
  const requiresOrg = to.matched.some((r) => r.meta.requiresOrg)

  // Signed-in users never see the login page.
  if (to.meta.public && session.isAuthenticated) {
    return session.hasOrg ? { name: 'dashboard' } : { name: 'onboarding' }
  }
  if (requiresAuth && !session.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (requiresOrg && !session.hasOrg) {
    return { name: 'onboarding' }
  }
  if (to.name === 'onboarding' && session.hasOrg) {
    return { name: 'dashboard' }
  }
  return true
})

export default router
