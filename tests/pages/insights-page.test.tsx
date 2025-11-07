import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import InsightsPage from '@/app/insights/page'

describe('Insights Page', () => {
  it('renderiza cabeçalho e botão de chamar API', () => {
    render(<InsightsPage />)
    expect(screen.getByText(/Insights Tributários/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Gerar insights de exemplo/i })).toBeInTheDocument()
  })
})