"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Three.js/WebGL, kısıtlı GPU'larda (uzak masaüstleri, düşük güçlü sandbox'lar)
// başarısız olabilir veya context'ini kaybedebilir. Bozuk bir canvas göstermek
// yerine sessizce başarısız ol — sayfanın kendi arka planı, o olmadan da hero'yu
// görsel olarak taşımaya devam eder.
export class WebglErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    // yut — dekoratif bir 3D arka plan için telemetriye gerek yok
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
