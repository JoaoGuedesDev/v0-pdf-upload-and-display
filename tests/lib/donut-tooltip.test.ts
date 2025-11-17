import { computeTooltipPosition } from "../../components/charts/DonutTributos"

describe("computeTooltipPosition", () => {
  const cx = 200
  const cy = 150
  const outerR = 100
  const dims = { w: 400, h: 300 }

  test("returns numeric coordinates within container", () => {
    const pos = computeTooltipPosition(cx, cy, 45, outerR, dims)
    expect(Number.isFinite(pos.x)).toBe(true)
    expect(Number.isFinite(pos.y)).toBe(true)
    expect(pos.x).toBeGreaterThanOrEqual(0)
    expect(pos.y).toBeGreaterThanOrEqual(0)
    expect(pos.x).toBeLessThanOrEqual(dims.w)
    expect(pos.y).toBeLessThanOrEqual(dims.h)
  })

  test("positions to the right for angle 0", () => {
    const pos = computeTooltipPosition(cx, cy, 0, outerR, dims)
    expect(pos.x).toBeGreaterThan(cx)
  })

  test("positions to the left for angle 180", () => {
    const pos = computeTooltipPosition(cx, cy, 180, outerR, dims)
    expect(pos.x).toBeLessThan(cx)
  })

  test("positions below for angle 90", () => {
    const pos = computeTooltipPosition(cx, cy, 90, outerR, dims)
    expect(pos.y).toBeGreaterThan(cy)
  })

  test("positions above for angle 270", () => {
    const pos = computeTooltipPosition(cx, cy, 270, outerR, dims)
    expect(pos.y).toBeLessThan(cy)
  })
})