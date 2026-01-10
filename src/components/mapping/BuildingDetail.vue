<script setup lang="ts">
import type { MappingBuilding } from '@/types/mapping'

interface Props {
  building: MappingBuilding
  reporting?: boolean
}

interface Emits {
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  reporting: false,
})

const emit = defineEmits<Emits>()

const hasPhotos = computed(() => {
  return props.building.photos?.data?.length > 0
})

const defaultImage = '/assets/tmn-logo-medium.png'
</script>

<template>
  <VCard
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
        v-for="(photo, i) in building.photos.data"
        :key="i"
        :src="photo.full_path"
      />
    </VCarousel>

    <!-- Building Header -->
    <VListItem style="background-color: #a9a9a9">
      <VListItemContent>
        <VListItemTitle>
          <h3 class="pb-2 white--text">
            {{ building.building_name }}
          </h3>
          <VChip
            label
            color="white"
          >
            {{ building.building_grade }}
          </VChip>
          <p
            style="white-space: normal;"
            class="pt-2 mb-0 white--text"
          >
            {{ building.address }}
          </p>
        </VListItemTitle>
      </VListItemContent>
    </VListItem>

    <!-- Building Type -->
    <VListItem two-line>
      <VListItemContent>
        <VListItemTitle>Building Type :</VListItemTitle>
        <VListItemSubtitle>
          {{ building.building_type || '-' }}
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
          {{ building.last_renovated || '-' }} / {{ building.completion_year || '-' }}
        </VListItemSubtitle>
      </VListItemContent>
    </VListItem>

    <!-- Floor Count -->
    <VListItem two-line>
      <VListItemContent>
        <VListItemTitle>Floor count :</VListItemTitle>
        <VListItemSubtitle>
          {{ building.no_of_floors || '-' }}
        </VListItemSubtitle>
      </VListItemContent>
    </VListItem>

    <!-- Size / No of Units -->
    <VListItem two-line>
      <VListItemContent>
        <VListItemTitle>Size / No of Units :</VListItemTitle>
        <VListItemSubtitle>
          {{ building.units || '-' }}
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
          v-if="building.job_detail_info.length < 1"
        >
          -
        </VListItemSubtitle>
        <VListItemSubtitle
          v-for="(job, i) in building.job_detail_info"
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
          {{ building.ordered || '-' }}
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
          {{ building.status || '-' }}
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
          {{ building.audience_actual || '-' }}
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
          {{ building.installation || '-' }}
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
          {{ building.impression || '-' }}
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

