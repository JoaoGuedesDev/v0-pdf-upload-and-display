import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import GeneratorPage from '@/app/generator/page'

describe('Generator Page', () => {
  it('renderiza cabeçalho e link de demonstração', () => {
    render(<GeneratorPage />)
    expect(screen.getByText(/Gerador de PDF/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Abrir demonstração de PDF/i })).toBeInTheDocument()
  })
})
