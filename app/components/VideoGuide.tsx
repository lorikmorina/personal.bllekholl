'use client'

import React from 'react'
import * as AspectRatio from "@radix-ui/react-aspect-ratio"

const VideoGuide = () => {
  return (
    <section className="py-12 md:py-20 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-8 md:mb-12">
          Quick Start Guide
        </h2>
        <div className="max-w-4xl mx-auto">
          <AspectRatio.Root ratio={16 / 9}>
            <iframe
              className="w-full h-full rounded-lg shadow-xl"
              src="https://www.youtube.com/embed/HYaauRzRVqg?si=Lw_hE3jKWqwZeIY4"
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            ></iframe>
          </AspectRatio.Root>
        </div>
      </div>
    </section>
  )
}

export default VideoGuide 