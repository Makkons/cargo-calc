import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import type { Placement, Container } from '@/engine/types'
import { isTauri } from '@/utils/platform'

export interface PdfExportData {
  title: string
  comment?: string
  shippingDate?: string
  container: Container
  placements: Placement[]
  /** Значение заполнения (0-1) */
  fill: number
  /** Подпись для заполнения: "Объём" или "Площадь" */
  fillLabel: string
  usedWeight: number
}

/**
 * Форматирует дату для имени файла
 */
function formatDateForFilename(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}`
}

/**
 * Создаёт HTML-элемент с информацией и таблицей грузов
 */
function createDataPage(data: PdfExportData): HTMLElement {
  const container = document.createElement('div')
  container.style.cssText = `
    width: 700px;
    padding: 24px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: white;
    color: #111827;
  `

  const now = new Date()
  const createdAt = now.toLocaleString('ru-RU')

  // Строки таблицы грузов с цветовыми индикаторами
  const rows = data.placements.map(p => {
    const color = p.color || '#9e9e9e'
    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px 12px; font-size: 13px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 16px; height: 16px; border-radius: 4px; background: ${color}; border: 1px solid rgba(0,0,0,0.2); flex-shrink: 0;"></div>
            <span>${escapeHtml(p.name || 'Груз')}</span>
          </div>
        </td>
        <td style="padding: 8px 12px; font-size: 13px;">${p.width} × ${p.length} × ${p.height}</td>
        <td style="padding: 8px 12px; font-size: 13px;">${p.weight ? p.weight + ' кг' : '—'}</td>
        <td style="padding: 8px 12px; font-size: 13px; color: #6b7280;">${p.x}, ${p.y}, ${p.z}</td>
      </tr>
    `
  }).join('')

  container.innerHTML = `
    <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 600;">${escapeHtml(data.title)}</h1>

    <div style="margin-bottom: 16px; font-size: 13px; color: #6b7280;">
      ${data.comment ? `<div style="margin-bottom: 4px;">${escapeHtml(data.comment)}</div>` : ''}
      ${data.shippingDate ? `<div style="margin-bottom: 4px;">Дата отгрузки: ${escapeHtml(data.shippingDate)}</div>` : ''}
      <div>Дата создания: ${createdAt}</div>
    </div>

    <div style="margin-bottom: 20px; padding: 12px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">Контейнер</div>
      <div style="font-size: 13px; color: #374151;">
        <div>Размеры: ${data.container.width} × ${data.container.length} × ${data.container.height} см</div>
        <div>${data.fillLabel}: ${Math.round(data.fill * 100)}%</div>
        ${data.usedWeight > 0 ? `<div>Общий вес: ${data.usedWeight} кг</div>` : ''}
      </div>
    </div>

    ${data.placements.length > 0 ? `
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px;">Грузы (${data.placements.length})</div>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 8px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #374151;">Название</th>
            <th style="padding: 8px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #374151;">Размеры (Ш×Д×В)</th>
            <th style="padding: 8px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #374151;">Вес</th>
            <th style="padding: 8px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #374151;">Позиция</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    ` : '<div style="font-size: 13px; color: #9ca3af;">Грузы не добавлены</div>'}
  `

  return container
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Рендерит HTML-элемент в canvas
 */
async function renderToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  element.style.position = 'absolute'
  element.style.left = '-9999px'
  element.style.top = '0'
  document.body.appendChild(element)

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    })
    return canvas
  } finally {
    document.body.removeChild(element)
  }
}

/**
 * Добавляет изображение на страницу PDF с учётом размеров
 */
function addImageToPage(
  pdf: jsPDF,
  imgData: string,
  imgWidth: number,
  imgHeight: number,
  y: number,
  pageWidth: number,
  pageHeight: number,
  margin: number
): number {
  const contentWidth = pageWidth - margin * 2
  const maxHeight = pageHeight - margin - y

  let scale = contentWidth / imgWidth
  let scaledWidth = contentWidth
  let scaledHeight = imgHeight * scale

  if (scaledHeight > maxHeight) {
    scale = maxHeight / imgHeight
    scaledWidth = imgWidth * scale
    scaledHeight = maxHeight
  }

  const x = margin + (contentWidth - scaledWidth) / 2

  pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight)

  return y + scaledHeight
}

/**
 * Экспортирует текущую компоновку в PDF
 */
export async function exportToPdf(
  sceneEl: HTMLElement,
  data: PdfExportData
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 10

  let y = margin

  // === СТРАНИЦА 1: ДАННЫЕ + ТАБЛИЦА ГРУЗОВ ===
  const dataEl = createDataPage(data)
  const dataCanvas = await renderToCanvas(dataEl)
  const dataImg = dataCanvas.toDataURL('image/png')

  const dataWidthMm = dataCanvas.width / 2 / 96 * 25.4
  const dataHeightMm = dataCanvas.height / 2 / 96 * 25.4

  y = addImageToPage(pdf, dataImg, dataWidthMm, dataHeightMm, y, pageWidth, pageHeight, margin)

  // === СТРАНИЦА 2: 2D СЦЕНА ===
  pdf.addPage()
  y = margin

  try {
    const sceneCanvas = await html2canvas(sceneEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    })

    const sceneImg = sceneCanvas.toDataURL('image/png')
    const sceneWidthMm = sceneCanvas.width / 2 / 96 * 25.4
    const sceneHeightMm = sceneCanvas.height / 2 / 96 * 25.4

    addImageToPage(pdf, sceneImg, sceneWidthMm, sceneHeightMm, y, pageWidth, pageHeight, margin)
  } catch (err) {
    console.error('Failed to capture scene:', err)
  }

  // === СОХРАНЕНИЕ ===
  const dateStr = formatDateForFilename(new Date())
  const safeTitle = data.title.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_').substring(0, 30)
  const fileName = `${safeTitle}_${dateStr}.pdf`

  if (isTauri()) {
    await savePdfWithDialog(pdf, fileName)
  } else {
    pdf.save(fileName)
  }
}

/**
 * Сохранение PDF через нативный диалог Tauri
 */
async function savePdfWithDialog(pdf: jsPDF, defaultFileName: string): Promise<void> {
  const { save } = await import('@tauri-apps/plugin-dialog')
  const { writeFile } = await import('@tauri-apps/plugin-fs')

  let filePath = await save({
    defaultPath: defaultFileName,
    filters: [
      { name: 'PDF', extensions: ['pdf'] }
    ],
    title: 'Сохранить PDF',
  })

  if (!filePath) {
    return
  }

  // Добавляем расширение .pdf если его нет
  if (!filePath.toLowerCase().endsWith('.pdf')) {
    filePath += '.pdf'
  }

  const pdfData = pdf.output('arraybuffer')

  try {
    await writeFile(filePath, new Uint8Array(pdfData))
  } catch (err) {
    console.error('Tauri writeFile error:', err)
    throw err
  }
}
