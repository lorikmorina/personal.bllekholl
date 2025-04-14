"use client"

import { useEffect, useRef } from "react"

interface TurnstileWidgetProps {
  siteKey: string
  onSuccess: (token: string) => void
  theme?: "light" | "dark" | "auto"
}

export default function TurnstileWidget({ 
  siteKey, 
  onSuccess, 
  theme = "auto" 
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)

  useEffect(() => {
    // Only initialize once
    if (initialized.current || !containerRef.current || !window.turnstile) return;
    
    // Render the widget
    window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onSuccess,
      theme: theme
    });
    
    initialized.current = true;
    
    // No cleanup needed as we want the widget to persist
  }, [siteKey, onSuccess, theme]);

  return <div ref={containerRef}></div>;
} 