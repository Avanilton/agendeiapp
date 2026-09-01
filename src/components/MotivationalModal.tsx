'use client'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const mensagensMotivacionais = [
  { titulo: 'Você é incrível! ✨', texto: 'Cada cliente que sai satisfeito é um reflexo do seu talento e dedicação. Continue brilhando!' },
  { titulo: 'Foco e determinação! 🚀', texto: 'Grandes negócios são construídos dia após dia, com consistência e amor pelo que faz. Você está no caminho certo!' },
  { titulo: 'Sua arte transforma! 💅', texto: 'Beleza não é só estética — é confiança, autoestima e bem-estar. Você transforma vidas todos os dias.' },
  { titulo: 'Crescimento é inevitável! 🌱', texto: 'Cada desafio superado te torna mais forte. Seu negócio cresce porque você cresce junto com ele.' },
  { titulo: 'Você faz a diferença! 💜', texto: 'Clientes voltam não só pelo serviço, mas pela experiência. E você cria experiências únicas.' },
  { titulo: 'Acredite em você! 🌟', texto: 'Toda grande conquista começa com a decisão de tentar. E você já tomou essa decisão. Siga em frente!' },
  { titulo: 'Hoje é um novo começo! 🌅', texto: 'Cada dia é uma oportunidade de superar ontem. Aproveite ao máximo este dia!' },
]

function getDayIndex() {
  const start = new Date('2026-01-01').getTime()
  const now = new Date().getTime()
  const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24))
  return diff % mensagensMotivacionais.length
}


export default function MotivationalModal() {
  const [show, setShow] = useState(false)
  const msg = mensagensMotivacionais[getDayIndex()]

  useEffect(() => {
    const key = 'agendei_motivacional_visto'
    const visto = sessionStorage.getItem(key)
    if (!visto) {
      // Show after a short delay so layout loads first
      const t = setTimeout(() => setShow(true), 800)
      return () => clearTimeout(t)
    }
  }, [])

  const handleClose = () => {
    sessionStorage.setItem('agendei_motivacional_visto', '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        animation: 'fadeIn 0.3s ease'
      }}
      onClick={handleClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420,
          background: 'var(--color-surface)',
          borderRadius: 24, overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
          animation: 'slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Gradient header */}
        <div style={{
          background: 'var(--color-gradient)',
          padding: '32px 24px 24px',
          textAlign: 'center',
          position: 'relative',
        }}>
          <button
            onClick={handleClose}
            style={{
              position: 'absolute', top: 12, right: 12,
              background: 'rgba(255,255,255,0.2)', border: 'none',
              borderRadius: 10, width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'white',
            }}
          >
            <X size={16}/>
          </button>
          <div style={{ fontSize: 56, marginBottom: 12, lineHeight: 1 }}>
            {msg.titulo.split(' ').pop()}
          </div>
          <h2 style={{
            fontFamily: 'Outfit', fontSize: 22, fontWeight: 800,
            color: 'white', margin: 0
          }}>
            {msg.titulo.split(' ').slice(0, -1).join(' ')}
          </h2>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          <p style={{
            fontSize: 15, lineHeight: 1.7, color: 'var(--color-text)',
            textAlign: 'center', margin: '0 0 24px'
          }}>
            {msg.texto}
          </p>
          <button
            onClick={handleClose}
            className="btn btn-primary w-full"
            style={{ justifyContent: 'center', borderRadius: 12, padding: '12px 24px', fontSize: 15 }}
          >
            Vamos lá! 💪
          </button>
          <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>
            Esta mensagem não aparecerá novamente hoje
          </p>
        </div>
      </div>
    </div>
  )
}
