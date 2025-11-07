import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import UploadPage from '@/app/upload/page'

describe('Upload Page', () => {
  it('renderiza cabeçalho e componente de upload', () => {
    render(<UploadPage />)
    expect(screen.getByText(/Upload de PDF/i)).toBeInTheDocument()
    // Link de navegação para a home
    expect(screen.getByRole('link', { name: /voltar/i })).toBeInTheDocument()
  })
})