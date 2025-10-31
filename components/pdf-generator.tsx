"use client"

import { useState, useRef } from "react"
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
  
  const generatePDF = async () => {
    setIsGenerating(true)
    
    try {
      const element = document.getElementById(contentId)
      if (!element) {
        throw new Error(`Elemento com ID '${contentId}' não encontrado`)
      }

      // Função para interceptar e limpar estilos CSS problemáticos
      const interceptAndCleanStyles = (targetElement: HTMLElement) => {
        // Cria uma folha de estilo temporária para sobrescrever estilos problemáticos
        const tempStyle = document.createElement('style')
        tempStyle.id = 'temp-pdf-style-override'
        
        // CSS para neutralizar funções de cor não suportadas
        tempStyle.textContent = `
          #${contentId} *, #${contentId}-clone * {
            color: inherit !important;
            background-color: transparent !important;
            border-color: currentColor !important;
          }
          
          #${contentId} .bg-gradient-to-br, #${contentId}-clone .bg-gradient-to-br,
          #${contentId} .bg-gradient-to-r, #${contentId}-clone .bg-gradient-to-r,
          #${contentId} [class*="gradient"], #${contentId}-clone [class*="gradient"] {
            background: #f3f4f6 !important;
            background-image: none !important;
          }
        `
        
        document.head.appendChild(tempStyle)
        return tempStyle
      }

      // Função para limpar estilos problemáticos de forma mais agressiva
      const aggressiveStyleCleaning = (doc: Document, targetId: string) => {
        const allElements = doc.querySelectorAll(`#${targetId} *`)
        allElements.forEach(el => {
          const htmlEl = el as HTMLElement
          
          // Remove todos os estilos inline que podem conter funções de cor problemáticas
          if (htmlEl.style) {
            const originalStyle = htmlEl.style.cssText
            
            // Lista de propriedades que podem conter funções de cor problemáticas
            const colorProperties = [
              'color', 'background-color', 'background', 'background-image',
              'border-color', 'border-top-color', 'border-right-color', 
              'border-bottom-color', 'border-left-color', 'outline-color',
              'text-decoration-color', 'caret-color', 'column-rule-color'
            ]
            
            colorProperties.forEach(prop => {
              const kebabProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase()
              htmlEl.style.removeProperty(kebabProp)
            })
            
            // Define cores seguras como fallback
            htmlEl.style.color = 'inherit'
            htmlEl.style.backgroundColor = 'transparent'
            htmlEl.style.borderColor = 'currentColor'
          }
          
          // Remove classes que podem conter gradientes
          if (htmlEl.className && typeof htmlEl.className === 'string') {
            htmlEl.className = htmlEl.className
              .replace(/bg-gradient-[^\s]*/g, 'bg-gray-100')
              .replace(/from-[^\s]*/g, '')
              .replace(/to-[^\s]*/g, '')
              .replace(/via-[^\s]*/g, '')
          }
        })
      }

      // Função para limpeza preventiva de estilos computados em tempo real
      const preventiveStyleCleaning = (targetElement: HTMLElement) => {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
              const target = mutation.target as HTMLElement
              if (target.style.cssText) {
                // Lista de funções de cor problemáticas
                const problematicFunctions = ['oklab(', 'lab(', 'oklch(', 'lch(', 'color-mix(', 'color(', 'hwb(']
                
                let needsCleaning = false
                problematicFunctions.forEach(func => {
                  if (target.style.cssText.includes(func)) {
                    needsCleaning = true
                  }
                })
                
                if (needsCleaning) {
                  // Remove propriedades problemáticas e define fallbacks seguros
                  target.style.color = 'inherit'
                  target.style.backgroundColor = 'transparent'
                  target.style.borderColor = 'currentColor'
                }
              }
            }
          })
        })
        
        // Observa mudanças nos estilos do elemento alvo e seus filhos
        observer.observe(targetElement, {
          attributes: true,
          attributeFilter: ['style'],
          subtree: true
        })
        
        return observer
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
        canvas = await html2canvas(element, {
          scale: 3, // Aumentado para aproximar 300dpi (3x = ~288dpi)
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: element.scrollWidth,
          height: element.scrollHeight,
          scrollX: 0,
          scrollY: 0,
          ignoreElements: (element) => {
            return element.tagName === 'SCRIPT' || element.tagName === 'STYLE'
          },
          onclone: (clonedDoc) => {
            // Aplica limpeza agressiva no documento clonado
            aggressiveStyleCleaning(clonedDoc, contentId)
            
            // Otimiza estilos para melhor renderização
            const style = clonedDoc.createElement('style')
            style.textContent = `
              * {
                -webkit-font-smoothing: antialiased !important;
                -moz-osx-font-smoothing: grayscale !important;
                text-rendering: optimizeLegibility !important;
              }
              
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
              }
            `
            clonedDoc.head.appendChild(style)
          }
        })
      } catch (firstError) {
        console.warn('Primeira tentativa falhou, tentando com clone manual:', firstError)
        
        // Segunda tentativa: clona manualmente e limpa completamente
        const clonedElement = element.cloneNode(true) as HTMLElement
        clonedElement.id = contentId + '-clone'
        
        // Adiciona o clone temporariamente ao DOM
        document.body.appendChild(clonedElement)
        
        try {
          // Aplica limpeza agressiva no clone
          aggressiveStyleCleaning(document, contentId + '-clone')
          
          // Força reflow no clone
          clonedElement.offsetHeight
          
          canvas = await html2canvas(clonedElement, {
            scale: 2.5, // Escala ligeiramente menor para fallback
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
        precision: 2
      })
      
      // Adiciona metadados ao PDF
      pdf.setProperties({
        title: fileName || 'Relatório DAS',
        subject: 'Documento de Arrecadação do Simples Nacional',
        author: 'Sistema de Gestão',
        creator: 'PDF Generator v2.0',
        producer: 'jsPDF',
        creationDate: new Date()
      })
      
      // Dimensões do PDF A4 em mm
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      
      // Função para otimizar contraste e brilho da imagem
      const optimizeImageQuality = (canvas: HTMLCanvasElement): string => {
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = canvas.width
        tempCanvas.height = canvas.height
        const ctx = tempCanvas.getContext('2d')
        
        if (!ctx) return canvas.toDataURL("image/png")
        
        // Desenha a imagem original
        ctx.drawImage(canvas, 0, 0)
        
        // Aplica filtros para melhorar contraste e reduzir excesso de branco
        const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
        const data = imageData.data
        
        // Parâmetros de otimização
        const contrast = 1.2 // Aumenta contraste
        const brightness = -10 // Reduz brilho ligeiramente
        const gamma = 0.9 // Ajuste de gamma para melhor definição
        
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
        return tempCanvas.toDataURL("image/png", 0.95) // Alta qualidade
      }

      // Converte o canvas para imagem otimizada
      const imgData = optimizeImageQuality(canvas)
      
      // Calcula as dimensões para manter a proporção e otimizar layout
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      
      // Otimiza o uso do espaço da página
      const maxWidth = pdfWidth - 20 // Margens de 10mm de cada lado
      const maxHeight = pdfHeight - 30 // Margens superior e inferior
      const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight)
      
      const finalWidth = imgWidth * ratio
      const finalHeight = imgHeight * ratio
      const imgX = (pdfWidth - finalWidth) / 2
      const imgY = 15 // Margem superior otimizada
      
      // Adiciona a marca d'água somente quando configurada
      if (isTextWatermark && watermarkImage) {
        // Marca d'água com texto sem transparência (cinza claro)
        pdf.setFontSize(30)
        pdf.setTextColor(180, 180, 180)

        for (let y = 30; y < pdfHeight; y += 50) {
          for (let x = 20; x < pdfWidth; x += 100) {
            pdf.text(watermarkImage || '', x, y, { angle: 45 })
          }
        }

        // Conteúdo principal por cima da marca d'água
        pdf.addImage(
          imgData,
          'PNG',
          imgX,
          imgY,
          finalWidth,
          finalHeight,
          undefined,
          'FAST'
        )

        pdf.save(`${fileName}.pdf`)
        setIsGenerating(false)
      } else if (watermarkImage) {
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

            if (ctx) {
              ctx.clearRect(0, 0, tempCanvas.width, tempCanvas.height)
              ctx.globalAlpha = 0.08 // Opacidade suave da marca d'água
              ctx.drawImage(watermarkImg, 0, 0, tempCanvas.width, tempCanvas.height)
              const fadedData = tempCanvas.toDataURL('image/png')

              // Primeiro a imagem de marca d'água como fundo
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

            // Conteúdo principal por cima
            pdf.addImage(
              imgData,
              'PNG',
              imgX,
              imgY,
              finalWidth,
              finalHeight,
              undefined,
              'FAST'
            )

            pdf.save(`${fileName}.pdf`)
            setIsGenerating(false)
          } catch (e) {
            // Fallback: gerar somente conteúdo
            pdf.addImage(
              imgData,
              'PNG',
              imgX,
              imgY,
              finalWidth,
              finalHeight,
              undefined,
              'FAST'
            )
            pdf.save(`${fileName}.pdf`)
            setIsGenerating(false)
          }
        }

        watermarkImg.onerror = () => {
          // Caso a marca d'água não carregue, gera apenas o conteúdo
          pdf.addImage(
            imgData,
            'PNG',
            imgX,
            imgY,
            finalWidth,
            finalHeight,
            undefined,
            'FAST'
          )

          pdf.save(`${fileName}.pdf`)
          setIsGenerating(false)
        }
      } else {
        // Sem marca d'água: apenas adiciona o conteúdo capturado
        pdf.addImage(
          imgData,
          'PNG',
          imgX,
          imgY,
          finalWidth,
          finalHeight,
          undefined,
          'FAST'
        )

        pdf.save(`${fileName}.pdf`)
        setIsGenerating(false)
      }
    } catch (error) {
      console.error("Erro ao gerar PDF:", error)
      alert("Erro ao gerar PDF. Tente novamente.")
      setIsGenerating(false)
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