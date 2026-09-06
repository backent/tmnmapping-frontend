<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'
import { ROLES, ROLE_DESCRIPTIONS, ROLE_OPTIONS, SALES_GROUP_OPTIONS } from '@/config/roles'
import type { Role, SalesGroup } from '@/config/roles'
import type { CreateUserRequest } from '@/types/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const authStore = useAuthStore()

const isEdit = computed(() => !!route.params.id)
const itemId = computed(() => (isEdit.value ? Number(route.params.id) : null))

// The backend refuses a self role change, because an admin who demotes themselves
// loses this screen and needs SQL to recover. Disable the field to match.
const isSelf = computed(() => isEdit.value && itemId.value === authStore.currentUser?.id)

const form = ref<CreateUserRequest>({
  username: '',
  name: '',
  email: '',
  password: '',
  role: ROLES.SALES as Role,
  can_create_quotations: false,
  sales_group: '' as SalesGroup | '',
})

const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const showPassword = ref(false)

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

const roleHint = computed(() => ROLE_DESCRIPTIONS[form.value.role] ?? '')

const fetchItem = async () => {
  if (!itemId.value)
    return
  isLoading.value = true
  try {
    await userStore.fetchById(itemId.value)

    const item = userStore.currentItem
    if (item) {
      form.value = {
        username: item.username,
        name: item.name,
        email: item.email || '',
        password: '',
        role: item.role,
        can_create_quotations: item.can_create_quotations,
        sales_group: item.sales_group || '',
      }
    }
  }
  catch (error: any) {
    console.error('Fetch error:', error)
    errorMessage.value = error?.details?.message || error?.details || 'Failed to load user'
  }
  finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  if (isEdit.value)
    await fetchItem()
})

const validate = (): string => {
  if (!form.value.username.trim())
    return 'Username is required'
  if (form.value.username.trim().length < 3)
    return 'Username must be at least 3 characters'
  if (!form.value.name.trim())
    return 'Name is required'

  // On create the password is mandatory; on edit an empty value means "leave it alone".
  if (!isEdit.value && !form.value.password)
    return 'Password is required'
  if (form.value.password && form.value.password.length < 8)
    return 'Password must be at least 8 characters'

  return ''
}

const submit = async () => {
  errorMessage.value = validate()
  if (errorMessage.value)
    return

  isSaving.value = true
  try {
    if (isEdit.value && itemId.value) {
      const payload = { ...form.value }

      if (!payload.password)
        delete (payload as Partial<CreateUserRequest>).password

      await userStore.update(itemId.value, payload)
      snackbarMessage.value = 'User updated successfully'
    }
    else {
      await userStore.create(form.value)
      snackbarMessage.value = 'User created successfully'
    }
    snackbarColor.value = 'success'
    snackbar.value = true
    setTimeout(() => {
      router.push({ name: 'users' })
    }, 1000)
  }
  catch (error: any) {
    console.error('Save error:', error)

    const msg = error?.details?.message || error?.details || 'Failed to save user'

    errorMessage.value = msg
    snackbarMessage.value = msg
    snackbarColor.value = 'error'
    snackbar.value = true
  }
  finally {
    isSaving.value = false
  }
}

const cancel = () => {
  router.push({ name: 'users' })
}

onUnmounted(() => {
  userStore.clearCurrentItem()
})
</script>

<template>
  <div>
    <VRow class="mb-4">
      <VCol cols="12">
        <VBtn
          icon
          variant="text"
          @click="cancel"
        >
          <VIcon icon="ri-arrow-left-s-line" />
        </VBtn>
        <span class="text-h4 ms-4">{{ isEdit ? 'Edit' : 'Create' }} User</span>
      </VCol>
    </VRow>

    <VProgressLinear
      v-if="isLoading"
      indeterminate
    />

    <VCard v-else>
      <VCardText>
        <VAlert
          v-if="errorMessage"
          type="error"
          class="mb-4"
        >
          {{ errorMessage }}
        </VAlert>

        <VAlert
          v-if="isSelf"
          type="info"
          variant="tonal"
          class="mb-4"
        >
          This is your own account. You cannot change your own role or delete yourself —
          ask another admin if you need that.
        </VAlert>

        <VForm @submit.prevent="submit">
          <VRow>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="form.username"
                label="Username"
                required
                :disabled="isSaving"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="form.name"
                label="Name"
                required
                :disabled="isSaving"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="form.email"
                label="Email"
                type="email"
                :disabled="isSaving"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="form.password"
                :label="isEdit ? 'New password (leave blank to keep current)' : 'Password'"
                :type="showPassword ? 'text' : 'password'"
                :append-inner-icon="showPassword ? 'ri-eye-off-line' : 'ri-eye-line'"
                :required="!isEdit"
                :disabled="isSaving"
                autocomplete="new-password"
                @click:append-inner="showPassword = !showPassword"
              />
            </VCol>

            <VCol cols="12">
              <VDivider class="mb-4" />
              <div class="text-subtitle-1 mb-2">
                Role & capabilities
              </div>
            </VCol>

            <VCol
              cols="12"
              md="6"
            >
              <VSelect
                v-model="form.role"
                :items="ROLE_OPTIONS"
                label="Role"
                :hint="roleHint"
                persistent-hint
                :disabled="isSaving || isSelf"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VSelect
                v-model="form.sales_group"
                :items="SALES_GROUP_OPTIONS"
                label="Sales group"
                hint="Reporting attribute: which sales population this owner belongs to. No rule reads it yet."
                persistent-hint
                clearable
                :disabled="isSaving"
              />
            </VCol>
            <VCol cols="12">
              <VSwitch
                v-model="form.can_create_quotations"
                label="Can create quotations"
                hint="Independent of role — a Head of Sales both approves and sells."
                persistent-hint
                :disabled="isSaving"
              />
            </VCol>

            <VCol
              cols="12"
              class="d-flex gap-2"
            >
              <VBtn
                type="submit"
                color="primary"
                :loading="isSaving"
              >
                {{ isEdit ? 'Update' : 'Create' }}
              </VBtn>
              <VBtn
                variant="outlined"
                :disabled="isSaving"
                @click="cancel"
              >
                Cancel
              </VBtn>
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
    </VCard>

    <VSnackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="3000"
    >
      {{ snackbarMessage }}
    </VSnackbar>
  </div>
</template>
