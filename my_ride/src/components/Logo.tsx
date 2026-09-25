'use client'
import React from 'react'
import Link from 'next/link'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  lightMode?: boolean
}

export default function Logo({ size = 'md', lightMode = false }: LogoProps) {
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl'
  const iconSize = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8'

  return (
    <Link href="/" className="inline-flex items-center gap-3 group select-none">
      {/* Sleek Minimalist Monogram Mark */}
      <div className={`${iconSize} rounded-xl bg-white text-zinc-950 font-black flex items-center justify-center text-xs tracking-tighter shadow-sm group-hover:scale-105 transition-transform duration-200`}>
        <span className="font-extrabold text-sm sm:text-base">M</span>
      </div>

      {/* Clean Premium Brand Typography */}
      <div className="flex items-center">
        <span className={`font-extrabold tracking-tight ${textSize} ${lightMode ? 'text-zinc-900' : 'text-white'}`}>
          MY
        </span>
        <span className="font-extrabold tracking-tight text-emerald-400 ml-1.5">
          RIDE
        </span>
      </div>
    </Link>
  )
}
