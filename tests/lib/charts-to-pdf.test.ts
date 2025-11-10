import { computeLayout } from '@/lib/pdf-utils/charts-to-pdf'

describe('charts-to-pdf util', () => {
  it('computeLayout fits both charts side by side within margins', () => {
    const pageW = 595 // A4 width (pt) equivalence irrelevant, just numbers
    const pageH = 842
    const margin = 10
    const left = { w: 1200, h: 800 }
    const right = { w: 800, h: 800 }

    const layout = computeLayout(left, right, pageW, pageH, margin, 6)
    expect(layout.left).toBeTruthy()
    expect(layout.right).toBeTruthy()

    // Should not exceed page bounds considering margins
    const availW = pageW - margin * 2
    const colW = (availW - 6) / 2
    const maxH = pageH - margin * 2

    expect(layout.left!.w).toBeLessThanOrEqual(colW + 0.0001)
    expect(layout.right!.w).toBeLessThanOrEqual(colW + 0.0001)
    expect(layout.left!.h).toBeLessThanOrEqual(maxH + 0.0001)
    expect(layout.right!.h).toBeLessThanOrEqual(maxH + 0.0001)

    // Positions should be correct columns
    expect(layout.left!.x).toBe(margin)
    expect(layout.left!.y).toBe(margin)
    expect(layout.right!.x).toBeGreaterThan(layout.left!.x)
    expect(layout.right!.y).toBe(margin)
  })

  it('computeLayout handles missing charts gracefully', () => {
    const pageW = 595
    const pageH = 842
    const margin = 10
    const left = { w: 1200, h: 800 }

    const layoutLeftOnly = computeLayout(left, null, pageW, pageH, margin)
    expect(layoutLeftOnly.left).toBeTruthy()
    expect(layoutLeftOnly.right).toBeNull()

    const layoutRightOnly = computeLayout(null, left, pageW, pageH, margin)
    expect(layoutRightOnly.left).toBeNull()
    expect(layoutRightOnly.right).toBeTruthy()
  })
})