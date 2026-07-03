export type WebGLFallbackReason =
  | 'unsupported'
  | 'init-error'
  | 'no-context'
  | 'context-lost'
  | 'render-error';

/** Testa WebGL no canvas real antes de bootar Three.js. */
export function probeWebGL(canvas: HTMLCanvasElement): boolean {
  try {
    const attrs: WebGLContextAttributes = {
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
    };
    const ctx =
      canvas.getContext('webgl2', attrs) ??
      canvas.getContext('webgl', attrs) ??
      canvas.getContext('experimental-webgl', attrs);
    return !!ctx;
  } catch {
    return false;
  }
}

/** Marca fallback estático — sem alertas visuais, só CSS + evento para a hero. */
export function markWebGLFallback(reason: WebGLFallbackReason, canvas?: HTMLCanvasElement) {
  document.documentElement.classList.add('no-webgl');
  if (canvas) {
    canvas.hidden = true;
    canvas.setAttribute('aria-hidden', 'true');
  }
  document.dispatchEvent(
    new CustomEvent('jellyfish:unavailable', { detail: { reason } })
  );
}
