'use client'

import React, { useRef, useState } from 'react'
import * as AspectRatio from "@radix-ui/react-aspect-ratio"
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react'

const VideoGuide = () => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted
      setIsMuted(!isMuted)
    }
  }

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        videoRef.current.requestFullscreen()
      }
    }
  }

  return (
    <section className="py-12 md:py-20 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-8 md:mb-12">
          Supacheck Quick Start Guide
        </h2>
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-xl overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-[0_0_2rem_rgba(0,0,0,0.3)] dark:shadow-[0_0_1rem_rgba(255,255,255,0.1)] dark:hover:shadow-[0_0_2rem_rgba(255,255,255,0.2)]">
            <AspectRatio.Root ratio={16 / 9}>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onClick={togglePlay}
              >
                <source src="/SupacheckFinal.mov" type="video/quicktime" />
                Your browser does not support the video tag.
              </video>
            </AspectRatio.Root>
            
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 flex items-center justify-between text-white transition-opacity duration-300 opacity-0 hover:opacity-100">
              <button 
                onClick={togglePlay}
                className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors duration-200"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={toggleMute}
                  className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors duration-200"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                
                <button 
                  onClick={toggleFullscreen}
                  className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors duration-200"
                  aria-label="Fullscreen"
                >
                  <Maximize size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default VideoGuide 