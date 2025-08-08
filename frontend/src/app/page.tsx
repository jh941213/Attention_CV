'use client'

import Galaxy from '@/components/Galaxy'
import SplashCursor from '@/components/SplashCursor'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col">
      {/* Galaxy background */}
      <div className="absolute inset-0 z-0">
        <Galaxy
          mouseRepulsion={true}
          mouseInteraction={true}
          density={1.2}
          glowIntensity={0.4}
          saturation={0.6}
          hueShift={240}
          transparent={false}
        />
      </div>

      {/* Fluid splash cursor effect */}
      <SplashCursor 
        DENSITY_DISSIPATION={2.8}
        VELOCITY_DISSIPATION={1.5}
        SPLAT_FORCE={4000}
        SPLAT_RADIUS={0.15}
        COLOR_UPDATE_SPEED={8}
        CURL={2.5}
        TRANSPARENT={true}
        SHADING={true}
      />
      
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6">
        <div className="flex items-center">
          <span className="text-white font-bold text-xl tracking-tight">Attention CV</span>
        </div>
        <div className="flex items-center space-x-6">
          <Link href="/" className="text-white hover:text-gray-300 transition-colors">
            Home
          </Link>
          <Link href="https://github.com/jh941213" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-300 transition-colors">
            GitHub
          </Link>
        </div>
      </nav>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6">
        <div className="text-center space-y-10 max-w-4xl mx-auto">
          {/* Main title */}
          <div className="space-y-6">
            <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
              Create Your Perfect
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                GitHub Portfolio
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Transform your CV into a stunning GitHub Pages website with AI assistance
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-12 w-full max-w-lg mx-auto">
            <Link href="/chat-editor" className="w-full sm:w-auto">
              <Button 
                size="lg" 
                className="w-full sm:w-auto bg-white text-black hover:bg-gray-100 px-10 py-4 text-lg font-medium rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border-0 min-w-[160px]"
              >
                Get Started
              </Button>
            </Link>
            <Link href="/contact" className="w-full sm:w-auto">
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full sm:w-auto bg-gray-900/50 backdrop-blur-sm border-2 border-gray-600/50 text-gray-300 hover:bg-gray-800/60 hover:border-gray-500/60 hover:text-white px-10 py-4 text-lg font-medium rounded-full transition-all duration-300 transform hover:scale-[1.02] min-w-[160px]"
              >
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-6 px-6 border-t border-gray-800/20">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0">
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <span>© 2025 Attention CV</span>
              <span className="hidden md:inline">•</span>
              <span className="text-gray-500">Built by kdb</span>
            </div>
            <div className="flex items-center space-x-6 text-sm">
              <a 
                href="https://www.apache.org/licenses/LICENSE-2.0" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-300 transition-colors"
              >
                Apache 2.0
              </a>
              <a 
                href="https://github.com/jh941213" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-300 transition-colors"
              >
                GitHub
              </a>
              <span className="text-gray-600 text-xs">
                v1.0.0
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}