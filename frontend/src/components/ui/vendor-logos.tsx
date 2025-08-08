'use client'

import React from 'react'
import Image from 'next/image'

interface LogoProps {
  className?: string
}

// Azure Logo
export const AzureLogo: React.FC<LogoProps> = ({ className = "w-4 h-4" }) => (
  <Image
    src="/azure.jpeg"
    alt="Azure"
    width={20}
    height={20}
    className={className}
  />
)

// OpenAI Logo
export const OpenAILogo: React.FC<LogoProps> = ({ className = "w-4 h-4" }) => (
  <Image
    src="/openai.png"
    alt="OpenAI"
    width={20}
    height={20}
    className={className}
  />
)

// Anthropic/Claude Logo
export const ClaudeLogo: React.FC<LogoProps> = ({ className = "w-4 h-4" }) => (
  <Image
    src="/claude.png"
    alt="Claude"
    width={20}
    height={20}
    className={className}
  />
)

// Keep the old SVG version as fallback
export const AnthropicLogo: React.FC<LogoProps> = ({ className = "w-4 h-4" }) => (
  <Image
    src="/claude.png"
    alt="Anthropic"
    width={20}
    height={20}
    className={className}
  />
)