"use client"

import { JSX,useEffect, useRef, useState } from "react"

interface Dimensions {
  width: number
  height: number
}

interface ParticleType {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  color: string
  isShootingStar: boolean
  shootingStarTimer: number
  originalSpeedX: number
  originalSpeedY: number
  trail: Array<{ x: number; y: number; opacity: number }>
  update: (width: number, height: number) => void
  draw: (ctx: CanvasRenderingContext2D) => void
}

export function AnimatedBackground(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    class Particle implements ParticleType {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      color: string
      isShootingStar: boolean
      shootingStarTimer: number
      originalSpeedX: number
      originalSpeedY: number
      trail: Array<{ x: number; y: number; opacity: number }>

      constructor(x: number, y: number) {
        this.x = x
        this.y = y
        this.size = Math.random() * 2 + 0.5
        this.speedX = Math.random() * 0.4 - 0.2
        this.speedY = Math.random() * 0.4 - 0.2
        this.originalSpeedX = this.speedX
        this.originalSpeedY = this.speedY
        const brightness = Math.random() * 60 + 180 
        this.color = `rgba(${brightness}, ${brightness}, ${brightness}, ${Math.random() * 0.4 + 0.3})`
        this.isShootingStar = false
        this.shootingStarTimer = 0
        this.trail = []
      }
      
      update(width: number, height: number): void {
        const currentTime = Date.now()
        
        if (!this.isShootingStar && !hasActiveShootingStar && 
            (currentTime - lastShootingStarTime > 10000) && 
            Math.random() < 0.001) {
          this.isShootingStar = true
          this.shootingStarTimer = 120 
          hasActiveShootingStar = true
          lastShootingStarTime = currentTime
          
          const margin = 50
          const maxX = width - margin
          const maxY = height - margin
          
          if (this.x < margin) this.x = margin
          if (this.x > maxX) this.x = maxX
          if (this.y < margin) this.y = margin
          if (this.y > maxY) this.y = maxY
          
          const maxSpeed = 3
          this.speedX = (Math.random() - 0.5) * maxSpeed
          this.speedY = (Math.random() - 0.5) * maxSpeed
          this.trail = []
        }
        
        if (this.isShootingStar) {
          this.trail.push({ 
            x: this.x, 
            y: this.y, 
            opacity: 1 
          })
          
          if (this.trail.length > 20) {
            this.trail.shift()
          }
          
          this.trail.forEach((point, index) => {
            point.opacity = index / this.trail.length
          })
          
          this.shootingStarTimer--
          
          if (this.shootingStarTimer <= 0) {
            this.isShootingStar = false
            hasActiveShootingStar = false
            this.speedX = this.originalSpeedX
            this.speedY = this.originalSpeedY
            this.trail = []
          }
        }
        
        this.x += this.speedX
        this.y += this.speedY
        
        if (this.isShootingStar) {
          if (this.x > width || this.x < 0 || this.y > height || this.y < 0) {
            this.isShootingStar = false
            hasActiveShootingStar = false
            this.speedX = this.originalSpeedX
            this.speedY = this.originalSpeedY
            this.trail = []
            this.x = Math.max(0, Math.min(width, this.x))
            this.y = Math.max(0, Math.min(height, this.y))
          }
        } else {
          if (this.x > width || this.x < 0) this.speedX *= -1
          if (this.y > height || this.y < 0) this.speedY *= -1
        }
      }
      
      draw(ctx: CanvasRenderingContext2D): void {
        if (this.isShootingStar && this.trail.length > 1) {
          ctx.save()
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'
          ctx.lineWidth = 0.5
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(this.trail[0].x, this.trail[0].y)
          
          for (let i = 1; i < this.trail.length; i++) {
            ctx.lineTo(this.trail[i].x, this.trail[i].y)
          }
          
          ctx.stroke()
          ctx.restore()
        }
        
        ctx.fillStyle = this.isShootingStar ? 'rgba(255, 255, 255, 1)' : this.color
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.isShootingStar ? this.size * 1.2 : this.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    
    const resizeCanvas = (): void => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height
      setDimensions({ width: rect.width, height: rect.height })
      init()
    }
    
    let particles: Particle[] = []
    let lastShootingStarTime = 0
    let hasActiveShootingStar = false
    
    const init = (): void => {
      particles = []
      const numberOfParticles = Math.min((canvas.width * canvas.height) / 20000, 40)
      for (let i = 0; i < numberOfParticles; i++) {
        particles.push(new Particle(
          Math.random() * canvas.width,
          Math.random() * canvas.height
        ))
      }
    }
    
    const connect = (): void => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < 80) {
            const opacity = (1 - distance / 80) * 0.15
            const gradient = ctx.createLinearGradient(
              particles[i].x,
              particles[i].y,
              particles[j].x,
              particles[j].y
            )
            gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`)
            gradient.addColorStop(0.5, `rgba(200, 200, 200, ${opacity * 0.8})`)
            gradient.addColorStop(1, `rgba(255, 255, 255, ${opacity})`)
            
            ctx.strokeStyle = gradient
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }
    }
    
    const animate = (): void => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      particles.forEach(particle => {
        particle.update(canvas.width, canvas.height)
        particle.draw(ctx)
      })
      
      connect()
      requestAnimationFrame(animate)
    }
    
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    animate()
    
    return (): void => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden bg-neutral-950">
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-black to-neutral-900" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-radial from-neutral-800/10 via-transparent to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-radial from-gray-800/10 via-transparent to-transparent rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-gradient-radial from-neutral-700/8 via-transparent to-transparent rounded-full blur-3xl" />
      <div className="absolute top-1/3 right-0 w-96 h-96 bg-gradient-radial from-gray-700/8 via-transparent to-transparent rounded-full blur-3xl" />
      
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-radial from-neutral-800/5 via-transparent to-transparent rounded-full blur-3xl" />
      
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ 
          background: 'transparent',
          mixBlendMode: 'normal'
        }}
      />
    </div>
  )
}

export default AnimatedBackground