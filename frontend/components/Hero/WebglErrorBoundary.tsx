"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Three.js/WebGL can fail or lose context on constrained GPUs (remote desktops,
// low-power sandboxes). Fail silently rather than surfacing a broken canvas —
// the page's own background still carries the hero visually without it.
export class WebglErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    // swallow — no telemetry needed for a decorative 3D background
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
