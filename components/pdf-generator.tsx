"use client"

import { useState, useRef } from "react"
import { useTheme } from 'next-themes'
import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"

interface PdfGeneratorProps {
  contentId: string
  watermarkImage?: string
  fileName?: string
  isTextWatermark?: boolean
}

export function PdfGenerator({
  contentId,
  watermarkImage,
  fileName = "documento",
  isTextWatermark = false
}: PdfGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  
  const generatePDF = async () => {
    setIsGenerating(true)
    
    try {
      let element: HTMLElement | null = document.getElementById(contentId)
      if (!element) {
        throw new Error(`Elemento com ID '${contentId}' não encontrado`)
      }

      // Estilo temporário apenas para melhorar legibilidade sem remover cores
      const interceptAndCleanStyles = (targetElement: HTMLElement) => {
        const tempStyle = document.createElement('style')
        tempStyle.id = 'temp-pdf-style-override'
        tempStyle.textContent = `
          #${contentId} *, #${contentId}-clone * {
            -webkit-font-smoothing: antialiased !important;
            -moz-osx-font-smoothing: grayscale !important;
            text-rendering: optimizeLegibility !important;
          }
        `
        document.head.appendChild(tempStyle)
        return tempStyle
      }

      // Removido o "cleaning" agressivo para preservar cores e estilos
      const aggressiveStyleCleaning = (_doc: Document, _targetId: string) => {}

      // Sem limpeza preventiva de estilos para manter fidelidade das cores
      const preventiveStyleCleaning = (_targetElement: HTMLElement) => {
        return { disconnect: () => {} } as MutationObserver
      }

      // Inicia monitoramento preventivo
      const styleObserver = preventiveStyleCleaning(element)

      // Intercepta estilos antes do processamento
      const tempStyleSheet = interceptAndCleanStyles(element)
      
      // Força um reflow para aplicar os novos estilos
      element.offsetHeight

      // Primeira tentativa com limpeza preventiva
      let canvas: HTMLCanvasElement
      try {
        // Limitar dinamicamente a escala para não exceder o eixo máximo do canvas
        const maxAxis = 32767 // limite seguro multi-navegador
        const dpr = Math.max(1, window.devicePixelRatio || 1)
        // Garantir que largura e altura multiplicadas pela escala não excedam o limite
        const maxDimension = Math.max(element.scrollHeight, element.scrollWidth)
        let dynamicScale = Math.min(dpr, maxAxis / maxDimension)
        // Proteção mínima para não reduzir demais, mas sem ultrapassar limite
        dynamicScale = Math.min(dpr, Math.max(0.2, dynamicScale))

        canvas = await html2canvas(element, {
          scale: Math.min(1, dynamicScale),
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          foreignObjectRendering: true,
          width: element.getBoundingClientRect().width,
          height: element.scrollHeight,
          scrollX: 0,
          scrollY: 0,
          imageTimeout: 2000,
          ignoreElements: (element) => {
            return element.tagName === 'SCRIPT' || element.tagName === 'STYLE'
          },
          onclone: (clonedDoc) => {
            // Otimiza estilos para melhor renderização
            const style = clonedDoc.createElement('style')
            style.textContent = `
              * {
                -webkit-font-smoothing: antialiased !important;
                -moz-osx-font-smoothing: grayscale !important;
                text-rendering: optimizeLegibility !important;
                filter: none !important;
                opacity: 1 !important;
              }
              
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
              }
            `
            clonedDoc.head.appendChild(style)
          }
        })
      } catch (firstError) {
        // Silenciar logs de debug; manter fluxo de fallback
        
        // Segunda tentativa: clona manualmente e limpa completamente
        const clonedElement = element.cloneNode(true) as HTMLElement
        clonedElement.id = contentId + '-clone'
        // Normaliza dimensões e remove restrições que causam conteúdo estreito
        clonedElement.style.position = 'absolute'
        clonedElement.style.left = '-9999px'
        clonedElement.style.top = '0'
        clonedElement.style.background = '#ffffff'
        clonedElement.style.margin = '0'
        clonedElement.style.padding = '0'
        clonedElement.style.maxWidth = 'none'
        const logicalWidth = element.getBoundingClientRect().width
        clonedElement.style.width = `${Math.max(logicalWidth, element.clientWidth)}px`
        clonedElement.style.maxWidth = 'none'
        clonedElement.style.overflow = 'visible'
        clonedElement.style.transform = 'none'
        clonedElement.style.boxShadow = 'none'
        clonedElement.style.border = 'none'
        
        // Adiciona o clone temporariamente ao DOM
        document.body.appendChild(clonedElement)
        
        try {
          // Aplica limpeza agressiva no clone
          aggressiveStyleCleaning(document, contentId + '-clone')
          
          // Força reflow no clone
          clonedElement.offsetHeight
          
          // Reusa a mesma lógica de escala dinâmica
          const maxAxis = 32767
          const dpr = Math.max(1, window.devicePixelRatio || 1)
          const maxDimension = Math.max(clonedElement.scrollHeight, clonedElement.scrollWidth)
          let dynamicScale = Math.min(dpr, maxAxis / maxDimension)
          dynamicScale = Math.min(dpr, Math.max(0.2, dynamicScale))

          canvas = await html2canvas(clonedElement, {
            scale: dynamicScale,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            foreignObjectRendering: false,
            width: clonedElement.scrollWidth,
            height: clonedElement.scrollHeight,
            scrollX: 0,
            scrollY: 0,
            ignoreElements: (element) => {
              return element.tagName === 'SCRIPT' || element.tagName === 'STYLE'
            }
          })
        } finally {
          // Remove o clone do DOM
          document.body.removeChild(clonedElement)
        }
      } finally {
          // Remove a folha de estilo temporária
          if (tempStyleSheet && tempStyleSheet.parentNode) {
            tempStyleSheet.parentNode.removeChild(tempStyleSheet)
          }
          
          // Para o monitoramento de estilos
          styleObserver.disconnect()
        }
      
      // Cria um novo documento PDF no formato A4 com metadados otimizados
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true, // Compressão para otimizar tamanho
        precision: 8 // Maior precisão para posicionamento em 300dpi
      })
      
      // Adiciona metadados ao PDF
      pdf.setProperties({
        title: 'Documento de Arrecadação do Simples Nacional',
        subject: 'Documento de Arrecadação do Simples Nacional',
        author: 'Sistema de Gestão',
        creator: 'PDF Generator v2.0'
      })
      
      // Dimensões do PDF A4 em mm
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      
      // Função para otimizar qualidade mantendo fidelidade de cores
      const optimizeImageQuality = (canvas: HTMLCanvasElement): string => {
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = canvas.width
        tempCanvas.height = canvas.height
        const ctx = tempCanvas.getContext('2d')
        
        if (!ctx) return canvas.toDataURL("image/png")
        
        // Desenha a imagem original
        ctx.drawImage(canvas, 0, 0)
        
        // Ajuste suave para nitidez sem desbotar
        const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
        const data = imageData.data
        
        // Parâmetros mínimos para manter cor fiel
        const contrast = 1.0
        const brightness = 0
        const gamma = 1.0
        
        for (let i = 0; i < data.length; i += 4) {
          // Aplica correção de contraste e brilho
          let r = data[i]
          let g = data[i + 1]
          let b = data[i + 2]
          
          // Ajuste de contraste
          r = ((r - 128) * contrast) + 128 + brightness
          g = ((g - 128) * contrast) + 128 + brightness
          b = ((b - 128) * contrast) + 128 + brightness
          
          // Correção de gamma
          r = 255 * Math.pow(r / 255, gamma)
          g = 255 * Math.pow(g / 255, gamma)
          b = 255 * Math.pow(b / 255, gamma)
          
          // Clamp valores entre 0-255
          data[i] = Math.max(0, Math.min(255, r))
          data[i + 1] = Math.max(0, Math.min(255, g))
          data[i + 2] = Math.max(0, Math.min(255, b))
        }
        
        ctx.putImageData(imageData, 0, 0)
        return tempCanvas.toDataURL("image/png", 1.0) // Qualidade máxima
      }

      // Converte o canvas para imagem otimizada (protege caso canvas não tenha sido gerado)
      if (!canvas) {
        setIsGenerating(false)
        return
      }
      const imgData = optimizeImageQuality(canvas)
      
      // Dimensões do canvas capturado
      const imgWidth = canvas.width
      const imgHeight = canvas.height

      // Espaço útil de página
      const maxWidth = pdfWidth - 20 // Margens de 10mm de cada lado
      const maxHeight = pdfHeight - 30 // Margens superior e inferior

      // Regra: para conteúdo paginado, usar razão baseada na largura
      const widthRatio = maxWidth / imgWidth
      const heightRatio = maxHeight / imgHeight
      // Razão geral (apenas se for necessário renderizar uma imagem única)
      const ratio = Math.min(widthRatio, heightRatio)

      const finalWidth = imgWidth * ratio
      const finalHeight = imgHeight * ratio
      const imgX = (pdfWidth - finalWidth) / 2
      const imgY = 15 // Margem superior otimizada
      
      // Helper: adiciona conteúdo paginado fatiando o canvas em blocos verticais
      const addPaginatedContent = (watermark?: { type: 'text' | 'image'; imageData?: string }) => {
        const pageContentHeight = pdfHeight - 30 // espaço útil por página em mm
        // Para paginação, usar somente a razão baseada na largura para ocupar bem a página
        const ratioForSlices = widthRatio
        const finalWidthForSlices = imgWidth * ratioForSlices
        const imgXForSlices = (pdfWidth - finalWidthForSlices) / 2
        const slicePx = Math.floor(pageContentHeight / ratioForSlices) // altura da fatia em px original
        let sourceY = 0

        const drawTextWatermark = () => {
          pdf.setFontSize(30)
          pdf.setTextColor(180, 180, 180)
          for (let y = 30; y < pdfHeight; y += 50) {
            for (let x = 20; x < pdfWidth; x += 100) {
              pdf.text(watermark?.imageData || '', x, y, { angle: 45 })
            }
          }
        }

        const drawImageWatermark = (img: string) => {
          pdf.addImage(img, 'PNG', 10, 10, pdfWidth - 20, pdfHeight - 20, undefined, 'FAST')
        }

        while (sourceY < canvas.height) {
          // Desenha marca d'água na página atual, se existir
          if (watermark?.type === 'text') {
            drawTextWatermark()
          } else if (watermark?.type === 'image' && watermark.imageData) {
            drawImageWatermark(watermark.imageData)
          }

          const thisSlicePx = Math.min(slicePx, canvas.height - sourceY)
          const tempCanvas = document.createElement('canvas')
          tempCanvas.width = canvas.width
          tempCanvas.height = thisSlicePx
          const tctx = tempCanvas.getContext('2d')
          if (tctx) {
            tctx.drawImage(
              canvas,
              0,
              sourceY,
              canvas.width,
              thisSlicePx,
              0,
              0,
              tempCanvas.width,
              tempCanvas.height
            )
            const sliceData = tempCanvas.toDataURL('image/png', 1.0)
            const sliceHeightMm = thisSlicePx * ratioForSlices
            pdf.addImage(
              sliceData,
              'PNG',
              imgXForSlices,
              imgY,
              finalWidthForSlices,
              sliceHeightMm,
              undefined,
              'FAST'
            )
          }

          sourceY += thisSlicePx
          if (sourceY < canvas.height) {
            pdf.addPage()
          }
        }
      }

      // Adiciona a marca d'água somente no tema claro e quando configurada
      if (!isDark && isTextWatermark && watermarkImage) {
        // Marca d'água com texto sem transparência (cinza claro)
        pdf.setFontSize(30)
        pdf.setTextColor(180, 180, 180)

        for (let y = 30; y < pdfHeight; y += 50) {
          for (let x = 20; x < pdfWidth; x += 100) {
            pdf.text(watermarkImage || '', x, y, { angle: 45 })
          }
        }

        // Conteúdo principal por cima da marca d'água (com paginação)
        addPaginatedContent({ type: 'text', imageData: watermarkImage })

        pdf.save(`${fileName}.pdf`)
        setIsGenerating(false)
      } else if (!isDark && watermarkImage) {
        // Marca d'água com imagem suavizada (faded)
        const watermarkImg = new Image()
        watermarkImg.crossOrigin = 'anonymous'
        watermarkImg.src = watermarkImage

        watermarkImg.onload = () => {
          try {
            // Criar um canvas temporário para aplicar transparência
            const tempCanvas = document.createElement('canvas')
            // Proporção aproximada A4 (altura/largura)
            tempCanvas.width = 1200
            tempCanvas.height = Math.round((pdfHeight / pdfWidth) * tempCanvas.width)
            const ctx = tempCanvas.getContext('2d')

            let fadedData: string | undefined
            if (ctx) {
              ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height)
              ctx.globalAlpha = 0.03 // Opacidade ainda mais suave para máxima visibilidade
              ctx.drawImage(watermarkImg, 0, 0, tempCanvas.width, tempCanvas.height)
              fadedData = tempCanvas.toDataURL('image/png')

              // Primeiro a imagem de marca d'água como fundo
              if (fadedData) {
                pdf.addImage(
                  fadedData,
                  'PNG',
                  10,
                  10,
                  pdfWidth - 20,
                  pdfHeight - 20,
                  undefined,
                  'FAST'
                )
              }
            }

            // Conteúdo principal por cima (com paginação)
            if (fadedData) {
              addPaginatedContent({ type: 'image', imageData: fadedData })
            } else {
              addPaginatedContent()
            }

            pdf.save(`${fileName}.pdf`)
            setIsGenerating(false)
          } catch (e) {
            // Fallback: gerar conteúdo sem marca d'água
            addPaginatedContent()
            pdf.save(`${fileName}.pdf`)
            setIsGenerating(false)
          }
        }

        watermarkImg.onerror = () => {
          // Caso a marca d'água não carregue, gera apenas o conteúdo
          addPaginatedContent()
      
          pdf.save(`${fileName}.pdf`)
          setIsGenerating(false)
        }
      } else {
        // Sem marca d'água: conteúdo paginado
        addPaginatedContent()

        pdf.save(`${fileName}.pdf`)
        setIsGenerating(false)
      }
    } catch (error) {
      // Tratar falha de captura com fallbacks adicionais
      try {
        const element = document.getElementById(contentId)
        if (!element) throw new Error('Elemento alvo não encontrado no fallback')
        // Fallback 2: tentar com foreignObjectRendering
        const canvas = await html2canvas(element, {
          scale: 0.8,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
          foreignObjectRendering: true,
          width: element.scrollWidth,
          height: element.scrollHeight,
          scrollX: 0,
          scrollY: 0,
          ignoreElements: (el) => el.tagName === 'SCRIPT' || el.tagName === 'STYLE'
        })

        // Se conseguir capturar, prosseguir com paginação mínima
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = pdf.internal.pageSize.getHeight()

        const imgWidth = canvas.width
        const imgHeight = canvas.height
        const maxWidth = pdfWidth - 20
        const maxHeight = pdfHeight - 30
        const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight)
        const finalWidth = imgWidth * ratio
        const imgX = (pdfWidth - finalWidth) / 2
        const imgY = 15

        // Paginação simples
        const pageContentHeight = pdfHeight - 30
        const slicePx = Math.floor(pageContentHeight / ratio)
        let y = 0
        while (y < canvas.height) {
          const thisSlicePx = Math.min(slicePx, canvas.height - y)
          const t = document.createElement('canvas')
          t.width = canvas.width
          t.height = thisSlicePx
          const tc = t.getContext('2d')
          if (tc) {
            tc.drawImage(canvas, 0, y, canvas.width, thisSlicePx, 0, 0, t.width, t.height)
            const data = t.toDataURL('image/png', 1.0)
            const sliceHeightMm = thisSlicePx * ratio
            pdf.addImage(data, 'PNG', imgX, imgY, finalWidth, sliceHeightMm, undefined, 'FAST')
          }
          y += thisSlicePx
          if (y < canvas.height) pdf.addPage()
        }
        pdf.save(`${fileName}.pdf`)
      } catch (fallbackError) {
        // Evitar alerta invasivo; logar erro para diagnóstico
        console.error('Falha ao gerar PDF', fallbackError)
      } finally {
        setIsGenerating(false)
      }
    }
  }

  return (
    <Button 
      onClick={generatePDF} 
      disabled={isGenerating}
      variant="outline"
      className="flex items-center gap-2"
    >
      <FileDown className="h-4 w-4" />
      {isGenerating ? "Gerando PDF..." : "Baixar PDF"}
    </Button>
  )
}
