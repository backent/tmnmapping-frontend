<script setup lang="ts">
import { watch, ref } from 'vue'
import type { MappingBuilding } from '@/types/mapping'
import { getBuildingDetailForMapping } from '@/http/mapping'
import { getImageProxyPath } from '@/utils/images'
import type { ApiResponse } from '@/types/api'

interface Props {
  building: MappingBuilding | null
  reporting?: boolean
}

interface Emits {
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  reporting: false,
})

const emit = defineEmits<Emits>()

const buildingDetail = ref<MappingBuilding | null>(null)
const isLoading = ref(false)
const errorMessage = ref('')

// Helper function to transform images array to photos.data format
function transformImagesToPhotos(images: any[] | undefined): { data: Array<{ full_path: string }> } | undefined {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return undefined
  }

  const transformed = images
    .map((img: any) => ({
      full_path: img.full_path || (img.path ? getImageProxyPath(img.path) : ''),
    }))
    .filter((img: any) => img.full_path) // Filter out empty paths

  return transformed.length > 0 ? { data: transformed } : undefined
}

// Watch for building changes and fetch full details
watch(() => props.building, async (building) => {
  if (building) {
    // Transform initial building data to ensure images are properly formatted
    const transformedBuilding: MappingBuilding = {
      ...building,
      // Transform images from mapping response to photos format
      photos: building.photos || transformImagesToPhotos((building as any).images) || { data: [] },
    }
    
    // Show building from props immediately (for instant feedback)
    buildingDetail.value = transformedBuilding
    
    // Then fetch full details in the background (similar to oldmapping)
    isLoading.value = true
    errorMessage.value = ''
    
    try {
      // Fetch full building details (similar to oldmapping's /api/admin/building/${id})
      const response: ApiResponse<any> = await getBuildingDetailForMapping(building.id)
      
      if (response.data) {
        // Transform the response to match MappingBuilding interface
        // The API might return Building type, so we need to map it
        const apiData = response.data
        
        // Merge with building from props, prioritizing API data for fields that exist
        buildingDetail.value = {
          ...building,
          // Map Building type fields to MappingBuilding if needed
          building_name: apiData.building_name || apiData.name || building.building_name,
          address: apiData.address || building.address,
          building_type: apiData.building_type || building.building_type,
          building_grade: apiData.building_grade || apiData.grade_resource || building.building_grade,
          completion_year: apiData.completion_year ?? building.completion_year,
          status: apiData.status || apiData.building_status || building.status,
          impression: apiData.impression?.toString() || building.impression,
          audience_actual: apiData.audience_actual || apiData.audience || building.audience_actual,
          // Transform images to photos format - use getImageProxyPath for proper URL conversion
          photos: apiData.photos || transformImagesToPhotos(apiData.images) || building.photos || { data: [] },
          // Keep job_detail_info from building if API doesn't provide it
          job_detail_info: apiData.job_detail_info || building.job_detail_info || [],
          // Keep other mapping-specific fields from building
          installation: apiData.installation || building.installation,
          last_renovated: apiData.last_renovated ?? building.last_renovated,
          no_of_floors: apiData.no_of_floors ?? building.no_of_floors,
          units: apiData.units || building.units,
          ordered: apiData.ordered ?? building.ordered,
        }
      }
    } catch (error) {
      console.error('Error fetching building details:', error)
      // Don't show error to user, just use building from props
      // The building from props already has the necessary data from the mapping list
    } finally {
      isLoading.value = false
    }
  } else {
    buildingDetail.value = null
  }
}, { immediate: true })

const hasPhotos = computed(() => {
  return (buildingDetail.value?.photos?.data?.length ?? 0) > 0
})

const defaultImage = '/images/defaultimage.jpeg'
</script>

<template>
  <!-- Loading State -->
  <div
    v-if="isLoading"
    class="text-center pb-1"
  >
    <VProgressCircular
      indeterminate
      color="primary"
    />
    <p class="mt-2">Loading building details...</p>
  </div>

  <!-- Error State -->
  <VCard
    v-else-if="errorMessage && !buildingDetail"
    class="mx-auto mb-5"
    max-width="400"
    tile
  >
    <VCardText>
      <VAlert
        type="error"
        variant="tonal"
      >
        {{ errorMessage }}
      </VAlert>
    </VCardText>
  </VCard>

  <!-- Building Detail Card -->
  <VCard
    v-else-if="buildingDetail"
    class="mx-auto mb-5"
    max-width="400"
    tile
  >
    <!-- Photos Carousel -->
    <VImg
      v-if="!hasPhotos"
      :src="defaultImage"
      aspect-ratio="1.7"
    />
    <VCarousel
      v-else
      height="180"
      cycle
      :show-arrows="false"
    >
      <VCarouselItem
        v-for="(photo, i) in buildingDetail.photos.data"
        :key="i"
        :src="photo.full_path"
      />
    </VCarousel>

    <!-- Building Header -->
    <VListItem style="background-color: #a9a9a9">
      <VListItemContent>
        <VListItemTitle>
          <h3 class="pb-2 white--text">
            {{ buildingDetail.building_name }}
          </h3>
          <VChip
            label
            color="white"
          >
            {{ buildingDetail.building_grade }}
          </VChip>
          <p
            style="white-space: normal;"
            class="pt-2 mb-0 white--text"
          >
            {{ buildingDetail.address }}
          </p>
        </VListItemTitle>
      </VListItemContent>
    </VListItem>

    <!-- Building Type -->
    <VListItem two-line>
      <VListItemContent>
        <VListItemTitle>Building Type :</VListItemTitle>
        <VListItemSubtitle>
          {{ buildingDetail.building_type || '-' }}
        </VListItemSubtitle>
      </VListItemContent>
    </VListItem>

    <!-- Last Renovated / Completion Year -->
    <VListItem
      v-if="!reporting"
      two-line
    >
      <VListItemContent>
        <VListItemTitle>Last Renovated / Completion Year</VListItemTitle>
        <VListItemSubtitle>
          {{ buildingDetail.last_renovated || '-' }} / {{ buildingDetail.completion_year || '-' }}
        </VListItemSubtitle>
      </VListItemContent>
    </VListItem>

    <!-- Floor Count -->
    <VListItem two-line>
      <VListItemContent>
        <VListItemTitle>Floor count :</VListItemTitle>
        <VListItemSubtitle>
          {{ buildingDetail.no_of_floors || '-' }}
        </VListItemSubtitle>
      </VListItemContent>
    </VListItem>

    <!-- Size / No of Units -->
    <VListItem two-line>
      <VListItemContent>
        <VListItemTitle>Size / No of Units :</VListItemTitle>
        <VListItemSubtitle>
          {{ buildingDetail.units || '-' }}
        </VListItemSubtitle>
      </VListItemContent>
    </VListItem>

    <!-- Screen Presence / Total Screen -->
    <VListItem
      v-if="!reporting"
      two-line
    >
      <VListItemContent>
        <VListItemTitle>Screen Presence :</VListItemTitle>
        <VListItemSubtitle
          v-if="!buildingDetail.job_detail_info || buildingDetail.job_detail_info.length < 1"
        >
          -
        </VListItemSubtitle>
        <VListItemSubtitle
          v-for="(job, i) in buildingDetail.job_detail_info"
          :key="i"
        >
          {{ job.screen.screen_size_name }} {{ job.screen.screen_point_name }}
        </VListItemSubtitle>
      </VListItemContent>
    </VListItem>
    <VListItem
      v-else
      two-line
    >
      <VListItemContent>
        <VListItemTitle>Total Screen :</VListItemTitle>
        <VListItemSubtitle>
          {{ buildingDetail.ordered || '-' }}
        </VListItemSubtitle>
      </VListItemContent>
    </VListItem>

    <!-- Progress / Audience -->
    <VListItem
      v-if="!reporting"
      two-line
    >
      <VListItemContent>
        <VListItemTitle>Progress :</VListItemTitle>
        <VListItemSubtitle>
          {{ buildingDetail.status || '-' }}
        </VListItemSubtitle>
      </VListItemContent>
    </VListItem>
    <VListItem
      v-else
      two-line
    >
      <VListItemContent>
        <VListItemTitle>Audience :</VListItemTitle>
        <VListItemSubtitle>
          {{ buildingDetail.audience_actual || '-' }}
        </VListItemSubtitle>
      </VListItemContent>
    </VListItem>

    <!-- Installation / Impression -->
    <VListItem
      v-if="!reporting"
      eight-line
    >
      <VListItemContent>
        <VListItemTitle>Installation :</VListItemTitle>
        <VListItemSubtitle>
          {{ buildingDetail.installation || '-' }}
        </VListItemSubtitle>
      </VListItemContent>
    </VListItem>
    <VListItem
      v-else
      eight-line
    >
      <VListItemContent>
        <VListItemTitle>Impression :</VListItemTitle>
        <VListItemSubtitle>
          {{ buildingDetail.impression || '-' }}
        </VListItemSubtitle>
      </VListItemContent>
    </VListItem>

    <!-- Close Button -->
    <VBtn
      color="error"
      depressed
      block
      small
      @click="emit('close')"
    >
      close
    </VBtn>
  </VCard>
</template>

