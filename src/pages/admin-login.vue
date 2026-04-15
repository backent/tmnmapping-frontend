<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useAuthStore } from '@/stores/auth'

import authV1MaskDark from '@images/pages/auth-v1-mask-dark.png'
import authV1MaskLight from '@images/pages/auth-v1-mask-light.png'

const tmnLogo = '/images/defaultimage.jpeg'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  username: '',
  password: '',
  remember: false,
})

const isPasswordVisible = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

const vuetifyTheme = useTheme()

const authThemeMask = computed(() => {
  return vuetifyTheme.global.name.value === 'light'
    ? authV1MaskLight
    : authV1MaskDark
})

const handleLogin = async () => {
  // Clear previous errors
  errorMessage.value = ''

  // Validate form
  if (!form.value.username || !form.value.password) {
    errorMessage.value = 'Please enter both username and password'

    return
  }

  isLoading.value = true

  try {
    await authStore.login({
      username: form.value.username,
      password: form.value.password,
      remember: form.value.remember,
    })

    // Fetch full user profile (includes last_login from previous session)
    await authStore.fetchCurrentUser()

    // Redirect to buildings page on successful login
    router.push('/buildings')
  }
  catch (error: any) {
    console.error('Login error:', error)
    errorMessage.value = error?.details?.message || error?.details || 'Login failed. Please check your credentials.'
  }
  finally {
    isLoading.value = false
  }
}
</script>

<template>
  <!-- eslint-disable vue/no-v-html -->

  <div class="auth-wrapper d-flex align-center justify-center pa-4">
    <VCard
      class="auth-card pa-4 pt-7"
      max-width="448"
    >
      <VCardItem class="justify-center">
        <RouterLink
          to="/"
          class="d-flex align-center gap-3"
        >
          <img
            :src="tmnLogo"
            alt="TMN Logo"
            class="tmn-logo"
            style="height: 4rem;width: auto;"
          >
        </RouterLink>
      </VCardItem>

      <VCardText class="pt-2">
        <h4 class="text-h4 mb-1">
          Admin Login
        </h4>
        <p class="mb-0">
          Please sign-in with your admin credentials
        </p>
      </VCardText>

      <VCardText>
        <VForm @submit.prevent="handleLogin">
          <VRow>
            <!-- Error Alert -->
            <VCol
              v-if="errorMessage"
              cols="12"
            >
              <VAlert
                type="error"
                variant="tonal"
                closable
                @click:close="errorMessage = ''"
              >
                {{ errorMessage }}
              </VAlert>
            </VCol>

            <!-- username -->
            <VCol cols="12">
              <VTextField
                v-model="form.username"
                label="Username"
                placeholder="john.doe"
                :disabled="isLoading"
                required
              />
            </VCol>

            <!-- password -->
            <VCol cols="12">
              <VTextField
                v-model="form.password"
                label="Password"
                placeholder="············"
                :type="isPasswordVisible ? 'text' : 'password'"
                autocomplete="password"
                :append-inner-icon="isPasswordVisible ? 'ri-eye-off-line' : 'ri-eye-line'"
                :disabled="isLoading"
                required
                @click:append-inner="isPasswordVisible = !isPasswordVisible"
              />

              <!-- Remember me checkbox (optional) -->
              <div class="d-flex align-center my-4">
                <VCheckbox
                  v-model="form.remember"
                  label="Remember me"
                  :disabled="isLoading"
                />
              </div>

              <!-- login button -->
              <VBtn
                block
                type="submit"
                :loading="isLoading"
                :disabled="isLoading"
              >
                Login
              </VBtn>
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
    </VCard>

    <!-- bg img -->
    <VImg
      class="auth-footer-mask d-none d-md-block"
      :src="authThemeMask"
    />
  </div>
</template>

<style lang="scss">
@use "@core/scss/template/pages/page-auth";
</style>
