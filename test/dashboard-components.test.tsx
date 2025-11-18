import { render, screen } from '@testing-library/react'
import { ResumoTributos } from '../components/dashboard/ResumoTributos'
import { IndicadoresReceita } from '../components/dashboard/IndicadoresReceita'
import { ComparacaoAtividades } from '../components/dashboard/ComparacaoAtividades'
import { DistribuicaoDAS } from '../components/dashboard/DistribuicaoDAS'

describe('Dashboard Components', () => {
  describe('ResumoTributos', () => {
    it('should render with sample data', () => {
      const sampleTributos = {
        IRPJ: 1000,
        CSLL: 800,
        COFINS: 1200,
        PIS_Pasep: 300,
        INSS_CPP: 2500,
        ICMS: 1800,
        IPI: 400,
        ISS: 600,
        Total: 8600
      }

      render(<ResumoTributos tributos={sampleTributos} />)
      
      expect(screen.getByText('R$ 8.600,00')).toBeInTheDocument()
      expect(screen.getByText('IRPJ')).toBeInTheDocument()
      expect(screen.getByText('CSLL')).toBeInTheDocument()
    })

    it('should handle empty data', () => {
      render(<ResumoTributos />)
      expect(screen.queryByText('R$')).not.toBeInTheDocument()
    })
  })

  describe('IndicadoresReceita', () => {
    it('should render revenue indicators', () => {
      const sampleReceitas = {
        receitaPA: 50000,
        rbt12: 600000,
        rba: 550000,
        rbaa: 480000
      }

      const sampleCalculos = {
        aliquotaEfetiva: 17.2,
        margemLiquida: 82.8
      }

      render(
        <IndicadoresReceita 
          receitas={sampleReceitas} 
          calculos={sampleCalculos} 
        />
      )
      
      expect(screen.getByText('Receita Bruta PA')).toBeInTheDocument()
      expect(screen.getByText('R$ 50.000,00')).toBeInTheDocument()
      expect(screen.getByText('17,20000%')).toBeInTheDocument()
      expect(screen.getByText('82,800%')).toBeInTheDocument()
    })
  })

  describe('ComparacaoAtividades', () => {
    it('should render activity comparison', () => {
      const sampleAtividades = {
        atividade1: {
          descricao: 'Comércio de mercadorias',
          Total: 30000
        },
        atividade2: {
          descricao: 'Prestação de serviços',
          Total: 20000
        }
      }

      render(<ComparacaoAtividades atividades={sampleAtividades} />)
      
      expect(screen.getByText('Comparativo por Atividade (DAS)')).toBeInTheDocument()
      expect(screen.getByText('Mercadorias')).toBeInTheDocument()
      expect(screen.getByText('Serviços')).toBeInTheDocument()
      expect(screen.getByText('R$ 30.000,00')).toBeInTheDocument()
      expect(screen.getByText('R$ 20.000,00')).toBeInTheDocument()
    })

    it('should not render when no activity data', () => {
      const { container } = render(<ComparacaoAtividades />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('DistribuicaoDAS', () => {
    it('should render DAS distribution', () => {
      const sampleTributos = {
        IRPJ: 1000,
        CSLL: 800,
        COFINS: 1200,
        PIS_Pasep: 300,
        INSS_CPP: 2500,
        ICMS: 1800,
        IPI: 400,
        ISS: 600,
        Total: 8600
      }

      render(<DistribuicaoDAS tributos={sampleTributos} />)
      
      expect(screen.getByText('Distribuição do DAS')).toBeInTheDocument()
      expect(screen.getByText('Valores por Tributo')).toBeInTheDocument()
      expect(screen.getByText('IRPJ')).toBeInTheDocument()
      expect(screen.getByText('R$ 1.000,00')).toBeInTheDocument()
    })

    it('should not render when no tax data', () => {
      const { container } = render(<DistribuicaoDAS />)
      expect(container.firstChild).toBeNull()
    })
  })
})