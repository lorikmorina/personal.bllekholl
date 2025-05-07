"use client"

import { useEffect, useRef } from "react"

interface TurnstileWidgetProps {
  siteKey: string
  onSuccess: (token: string, widgetId?: string) => void
  theme?: "light" | "dark" | "auto"
}

export default function TurnstileWidget({ 
  siteKey, 
  onSuccess, 
  theme = "auto" 
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const initialized = useRef(false)
  const widgetId = useRef<string | null>(null)

  useEffect(() => {
    // Only initialize once
    if (initialized.current || !containerRef.current || !window.turnstile) return;
    
    // Render the widget
    const widgetIdValue = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token: string) => {
        // Store the widget ID
        if (widgetIdValue) {
          widgetId.current = widgetIdValue;
        }
        // Call the callback with token and widget ID
        onSuccess(token, widgetId.current || undefined);
      },
      theme: theme
    });
    
    // Store the widget ID
    if (widgetIdValue) {
      widgetId.current = widgetIdValue;
    }
    
    initialized.current = true;
    
    // No cleanup needed as we want the widget to persist
  }, [siteKey, onSuccess, theme]);

  return <div ref={containerRef}></div>;
} 