"use client";

import { Component, type ReactNode } from "react";
import { logger } from "@/lib/logger";

interface Props {
  children: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

const MAX_RETRY = 3;

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorCount: 0 };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorCount: 0 };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // Log error ke monitoring
    logger.error(
      `ErrorBoundary${this.props.name ? `:${this.props.name}` : ""}: ${error.message}, stack: ${info.componentStack || ""}`,
      { tag: "ErrorBoundary" }
    );
  }

  handleManualRetry = () => {
    this.setState({ hasError: false, error: null, errorCount: 0 });
  };

  render() {
    if (this.state.hasError) {
      const reachedMax = this.state.errorCount >= MAX_RETRY;
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
            {reachedMax ? (
              <div className="space-y-3">
                <p className="text-sm text-amber-600 font-medium">
                  Sudah mencoba {MAX_RETRY}x dan masih gagal.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F35b04] to-orange-700 text-white text-sm font-medium hover:from-[#F35b04] hover:to-orange-800 transition-all shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Halaman
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={this.handleManualRetry}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F35b04] to-orange-700 text-white text-sm font-medium hover:from-[#F35b04] hover:to-orange-800 transition-all shadow-sm"
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
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
