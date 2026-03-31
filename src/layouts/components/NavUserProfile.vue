<script lang="ts" setup>
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

function formatLastLogin(raw: string | undefined): string {
  if (!raw) return '-'
  const d = new Date(raw)
  if (isNaN(d.getTime())) return raw
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const lastLoginRaw = computed(() => authStore.currentUser?.last_login)
const lastLoginFormatted = computed(() => formatLastLogin(lastLoginRaw.value))
</script>

<template>
  <div class="nav-user-section mx-3 my-3 pa-4 rounded">
    <!-- Expanded: welcome banner style -->
    <div class="nav-user-info">
      <div class="d-flex align-center justify-space-between mb-2">
        <VIcon
          icon="ri-user-3-line"
          size="20"
          color="primary"
        />
        <VTooltip
          text="Logout"
          location="right"
        >
          <template #activator="{ props }">
            <IconBtn
              v-bind="props"
              size="x-small"
              class="nav-logout-btn"
              :loading="authStore.isLoading"
              @click="handleLogout"
            >
              <VIcon
                icon="ri-logout-box-r-line"
                size="16"
              />
            </IconBtn>
          </template>
        </VTooltip>
      </div>

      <div class="nav-welcome-text font-weight-bold mb-1">
        Welcome Back,<br>{{ authStore.userName || 'User' }}
      </div>

      <div class="text-xs text-medium-emphasis">
        Last login: {{ lastLoginFormatted }}
      </div>
    </div>

    <!-- Collapsed: just the user icon centered -->
    <div class="nav-user-collapsed d-flex justify-center">
      <VTooltip
        :text="`${authStore.userName || 'User'} — Last login: ${lastLoginFormatted}`"
        location="right"
      >
        <template #activator="{ props }">
          <VAvatar
            v-bind="props"
            color="primary"
            size="32"
          >
            <VIcon
              icon="ri-user-3-line"
              size="18"
            />
          </VAvatar>
        </template>
      </VTooltip>
    </div>
  </div>
</template>
