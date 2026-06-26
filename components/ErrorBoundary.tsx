"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Label untuk membantu identifikasi error di console */
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  countdown: number;
}

export default class ErrorBoundary extends Component<Props, State> {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, countdown: 0 };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, countdown: 3 };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ""}]`, error.message, info.componentStack);
    // Auto-retry after countdown
    this.startAutoRetry();
  }

  componentDidUpdate(_prevProps: Props, prevState: State) {
    // Reset countdown jika error baru
    if (prevState.error !== this.state.error && this.state.hasError) {
      this.startAutoRetry();
    }
  }

  componentWillUnmount() {
    this.clearTimer();
  }

  private startAutoRetry() {
    this.clearTimer();
    this.setState({ countdown: 3 });
    this.timer = setInterval(() => {
      this.setState((prev) => {
        if (prev.countdown <= 1) {
          this.clearTimer();
          return { hasError: false, error: null, countdown: 0 } as State;
        }
        return { countdown: prev.countdown - 1 } as State;
      });
    }, 1000);
  }

  private clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  handleManualRetry = () => {
    this.clearTimer();
    this.setState({ hasError: false, error: null, countdown: 0 });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Terjadi Kesalahan
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {this.props.name
                ? `Gagal memuat ${this.props.name}.`
                : "Aplikasi mengalami error yang tidak terduga."}
            </p>
            {this.state.error && process.env.NODE_ENV === "development" && (
              <p className="text-xs text-gray-400 bg-gray-100 rounded-lg p-3 mb-4 text-left font-mono break-all max-h-24 overflow-y-auto">
                {this.state.error.message}
              </p>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleManualRetry}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F35b04] text-white text-sm font-medium hover:bg-orange-700 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Coba Lagi
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Refresh Halaman
              </button>
            </div>
            {this.state.countdown > 0 && (
              <p className="mt-3 text-xs text-gray-400">
                Auto-retry dalam {this.state.countdown} detik...
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
