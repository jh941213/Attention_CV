'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import Squares from '@/components/Squares'
import Link from 'next/link'

export default function Contact() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-900 to-black overflow-hidden">
      {/* Animated squares background */}
      <div className="absolute inset-0 z-0">
        <Squares 
          speed={0.5}
          squareSize={40}
          direction='diagonal'
          borderColor='rgba(255, 255, 255, 0.1)'
          hoverFillColor='rgba(255, 255, 255, 0.05)'
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6">
        <div className="flex items-center">
          <Link href="/" className="text-white font-bold text-xl tracking-tight hover:text-gray-300 transition-colors">
            Attention CV
          </Link>
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
      <div className="relative z-10 container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              Get in Touch
            </h1>
            <p className="text-xl text-gray-300">
              Questions about our AI CV builder? Need help creating your portfolio? We're here to help.
            </p>
          </div>

          {/* Contact form */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
            <form className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject" className="text-white">Subject</Label>
                <Input
                  id="subject"
                  placeholder="What's this about?"
                  className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-white">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Tell us more..."
                  rows={5}
                  className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>

              <Button 
                type="submit" 
                size="lg" 
                className="w-full bg-white text-black hover:bg-gray-100 py-3 text-lg font-semibold rounded-full transition-all duration-200"
              >
                Send Message
              </Button>
            </form>

            <div className="mt-8 pt-8 border-t border-gray-700">
              <div className="grid md:grid-cols-2 gap-6 text-center md:text-left">
                <div>
                  <h3 className="text-white font-semibold mb-2">Email</h3>
                  <p className="text-gray-300">kim.db@kt.com</p>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">Contact</h3>
                  <p className="text-gray-300">Jaehyun KIM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}