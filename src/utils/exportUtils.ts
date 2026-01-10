import { saveAs } from 'file-saver'
import dayjs from 'dayjs'

/**
 * Export mapping data to Excel file
 */
export function exportMappingData(blob: Blob, baseName = 'Target Media Nusantara - Mapping Building List -') {
  const currentDay = dayjs().format('DD-MM-YYYY')
  const filename = `${baseName}${currentDay}.xlsx`
  saveAs(blob, filename)
}

