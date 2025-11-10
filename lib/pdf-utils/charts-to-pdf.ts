export type Dims = { w: number; h: number }

export function computeLayout(
  left: Dims | null,
  right: Dims | null,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  gap = 4
) {
  const availableW = pageWidth - margin * 2
  const colW = (availableW - gap) / 2
  const yTop = margin
  const leftX = margin
  const rightX = margin + colW + gap

  const scaleToFit = (d: Dims) => {
    const maxH = pageHeight - margin * 2
    const scale = Math.min(colW / d.w, maxH / d.h)
    return { w: d.w * scale, h: d.h * scale }
  }

  const leftSize = left ? scaleToFit(left) : null
  const rightSize = right ? scaleToFit(right) : null

  return {
    left: leftSize ? { x: leftX, y: yTop, ...leftSize } : null,
    right: rightSize ? { x: rightX, y: yTop, ...rightSize } : null,
  }
}

export async function loadDims(url: string): Promise<Dims> {
  return await new Promise<Dims>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = reject
    img.src = url
  })
}

export async function composeChartsPage(
  pdf: any,
  options: {
    leftUrl?: string | null
    rightUrl?: string | null
    pageWidth: number
    pageHeight: number
    margin: number
    gap?: number
  }
) {
  const { leftUrl, rightUrl, pageWidth, pageHeight, margin, gap = 4 } = options
  if (!leftUrl && !rightUrl) return

  const leftDims = leftUrl ? await loadDims(leftUrl) : null
  const rightDims = rightUrl ? await loadDims(rightUrl) : null
  const layout = computeLayout(leftDims, rightDims, pageWidth, pageHeight, margin, gap)

  pdf.addPage()
  if (leftUrl && layout.left) {
    pdf.addImage(leftUrl, 'PNG', layout.left.x, layout.left.y, layout.left.w, layout.left.h)
  }
  if (rightUrl && layout.right) {
    pdf.addImage(rightUrl, 'PNG', layout.right.x, layout.right.y, layout.right.w, layout.right.h)
  }
}