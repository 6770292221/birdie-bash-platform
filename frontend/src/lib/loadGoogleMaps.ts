let loadingPromise: Promise<void> | null = null;

export function loadGoogleMaps(apiKey?: string, language: string = 'th'): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as { google?: { maps?: unknown } }).google?.maps) return Promise.resolve();
  if (!apiKey) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=${language}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });

  return loadingPromise;
}

