import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useSession } from '@/stores/session'
import { useInvite } from '@/stores/invite'
import AppShell from '@/layouts/AppShell.vue'

/**
 * Routing + the context model. The shell is unreachable until (a) authenticated
 * and (b) an org exists. Signup is a single flow with a fork at org creation
 * (/signup → /signup/verify → /signup/organization). The invite path bypasses
 * org creation. Deep links carry workspace context as `/w/:slug/...`.
 */
const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { public: true } },
  { path: '/signup', name: 'signup', component: () => import('@/views/SignupView.vue'), meta: { public: true } },
  {
    path: '/signup/verify',
    name: 'signup-verify',
    component: () => import('@/views/VerifyOtpView.vue'),
    meta: { public: true },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/views/ForgotPasswordView.vue'),
    meta: { public: true },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('@/views/ResetPasswordView.vue'),
    meta: { public: true },
  },
  // Org creation / onboarding-pending target (authed, no org required).
  {
    path: '/signup/organization',
    name: 'onboarding',
    component: () => import('@/views/OrgSetupView.vue'),
    meta: { requiresAuth: true, requiresOrg: false },
  },
  // Invite path bypasses org creation.
  {
    path: '/invite/:token',
    name: 'invite',
    component: () => import('@/views/InviteView.vue'),
    meta: { requiresAuth: true, requiresOrg: false },
  },
  {
    path: '/',
    component: AppShell,
    meta: { requiresAuth: true, requiresOrg: true },
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { titleKey: 'nav.dashboard' } },
      { path: 'campaigns', name: 'campaigns', component: () => import('@/views/CampaignsListView.vue'), meta: { titleKey: 'nav.campaigns' } },
      { path: 'campaigns/new', name: 'campaign-new', component: () => import('@/views/CampaignWizardView.vue'), meta: { titleKey: 'campaigns.newCampaign' } },
      { path: 'campaigns/ads', name: 'campaign-ads', component: () => import('@/views/CreativesListView.vue'), meta: { titleKey: 'creatives.title' } },
      { path: 'campaigns/:id', name: 'campaign-detail', component: () => import('@/views/CampaignDetailView.vue'), meta: { titleKey: 'nav.campaigns' } },
      { path: 'screens', name: 'screens', component: () => import('@/views/ScreensView.vue'), meta: { titleKey: 'nav.screens' } },
      { path: 'reports', name: 'reports', component: () => import('@/views/ReportsView.vue'), meta: { titleKey: 'nav.reports' } },
      { path: 'billing', name: 'billing', component: () => import('@/views/BillingView.vue'), meta: { titleKey: 'nav.billing' } },
      { path: 'organization', name: 'organization', component: () => import('@/views/OrgAdminView.vue'), meta: { titleKey: 'nav.organization' } },
      { path: 'verify', name: 'verification', component: () => import('@/views/VerificationView.vue'), meta: { titleKey: 'verification.hubTitle' } },
      { path: 'settings', name: 'settings', component: () => import('@/views/SettingsView.vue'), meta: { titleKey: 'nav.settings' } },
    ],
  },
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
  const invite = useInvite()
  if (!session.bootstrapped) await session.bootstrap()

  const requiresAuth = to.matched.some((r) => r.meta.requiresAuth)
  const requiresOrg = to.matched.some((r) => r.meta.requiresOrg)

  // Signed-in users never see the public auth pages.
  if (to.meta.public && session.isAuthenticated) {
    return session.hasOrg ? { name: 'dashboard' } : { name: 'onboarding' }
  }
  if (requiresAuth && !session.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  // No org yet: a pending invite takes priority over org creation.
  if (requiresOrg && !session.hasOrg) {
    return invite.token ? `/invite/${invite.token}` : { name: 'onboarding' }
  }
  if (to.name === 'onboarding' && session.hasOrg) {
    return { name: 'dashboard' }
  }
  return true
})

export default router
