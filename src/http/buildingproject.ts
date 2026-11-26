import { deleteApi, getApi, postApi, postFormApi, putApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse } from '@/types/api'
import type { BuildingProject, BuildingProjectChange, SaveBuildingProjectRequest } from '@/types/buildingproject'
import type { ImportResult } from '@/types/advertiser'

async function downloadFile(endpoint: string): Promise<Blob> {
  const response = await fetch(`${apiConfig.baseUrl}${endpoint}`, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok)
    throw new Error(`HTTP error! Status: ${response.status}`)

  return response.blob()
}

export function getBuildingProjects(
  params: Record<string, string | number> = {},
): Promise<ApiResponse<BuildingProject[]>> {
  return getApi<ApiResponse<BuildingProject[]>>(apiConfig.endpoints.building_projects, params)
}

export function getBuildingProject(id: number): Promise<ApiResponse<BuildingProject>> {
  return getApi<ApiResponse<BuildingProject>>(
    apiConfig.endpoints.building_project_get.replace(':id', String(id)))
}

export function createBuildingProject(
  payload: SaveBuildingProjectRequest,
): Promise<ApiResponse<BuildingProject>> {
  return postApi<ApiResponse<BuildingProject>>(apiConfig.endpoints.building_projects, payload)
}

export function updateBuildingProject(
  id: number,
  payload: SaveBuildingProjectRequest,
): Promise<ApiResponse<BuildingProject>> {
  return putApi<ApiResponse<BuildingProject>>(
    apiConfig.endpoints.building_project_update.replace(':id', String(id)), payload)
}

export function deleteBuildingProject(id: number): Promise<ApiResponse<string>> {
  return deleteApi<ApiResponse<string>>(
    apiConfig.endpoints.building_project_delete.replace(':id', String(id)))
}

/** Who changed what, and when. Newest first. */
export function getBuildingProjectChanges(
  id: number,
  params: Record<string, string | number> = {},
): Promise<ApiResponse<BuildingProjectChange[]>> {
  return getApi<ApiResponse<BuildingProjectChange[]>>(
    apiConfig.endpoints.building_project_changes.replace(':id', String(id)), params)
}

/**
 * With dryRun the file is checked and counted but nothing is written.
 *
 * A blank cell CLEARS on this import, so the preview must be read before applying:
 * `cleared` counts the fields an upload will blank and `notices` names each one.
 */
export function importBuildingProjects(file: File, dryRun: boolean): Promise<ApiResponse<ImportResult>> {
  const formData = new FormData()

  formData.append('file', file)

  return postFormApi<ApiResponse<ImportResult>>(
    `${apiConfig.endpoints.building_projects_import}?dry_run=${dryRun}`, formData)
}

/**
 * The closed vocabularies, keyed by field. The form builds its dropdowns from this
 * rather than a local copy, so the options it offers and the values the importer
 * accepts cannot drift apart. `grade_suggestions` is offered but not enforced.
 */
export function getBuildingProjectVocabulary(): Promise<ApiResponse<Record<string, string[]>>> {
  return getApi<ApiResponse<Record<string, string[]>>>(apiConfig.endpoints.building_projects_vocabulary)
}

export function exportBuildingProjects(): Promise<Blob> {
  return downloadFile(apiConfig.endpoints.building_projects_export)
}

export function downloadBuildingProjectTemplate(): Promise<Blob> {
  return downloadFile(apiConfig.endpoints.building_projects_template)
}
