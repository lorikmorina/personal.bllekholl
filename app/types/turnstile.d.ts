interface Window {
  turnstile?: {
    render: (element: HTMLElement | string, options: any) => string;
    reset: (widgetId: string) => void;
    remove: (widgetId: string) => void;
  };
  onloadTurnstileCallback?: () => void;
} 