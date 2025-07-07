"use client"

import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const [iframeHeight, setIframeHeight] = useState('100vh')

  useEffect(() => {
    // Update iframe height based on window size
    const updateHeight = () => {
      const windowHeight = window.innerHeight
      const navbarHeight = 64 // Adjust based on actual navbar height
      setIframeHeight(`${windowHeight - navbarHeight}px`)
    }

    window.addEventListener('resize', updateHeight)
    updateHeight()

    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  return (
    <div className="w-full" style={{ height: iframeHeight }}>
      <iframe 
        src="https://visual-data-garden.lovable.app"
        className="w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      />
    </div>
  )
}