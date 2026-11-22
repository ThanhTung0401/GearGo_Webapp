import React from "react";

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

/**
 * ErrorBoundary cấp ứng dụng giúp tránh trắng trang khi có lỗi runtime ở component con.
 */
export default class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  AppErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || "Đã xảy ra lỗi hiển thị không mong muốn.",
    };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("AppErrorBoundary caught error:", error, info);
  }

  private handleReload = () => {
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen flex items-center justify-center bg-[var(--color-cream)] px-4">
          <section className="max-w-md w-full rounded-2xl border border-[var(--color-bone)] bg-white p-6 shadow-sm text-center space-y-4">
            <h1 className="text-xl font-bold text-[var(--color-bark)]">
              Rất tiếc, giao diện vừa gặp sự cố
            </h1>
            <p className="text-sm text-[var(--color-charcoal)]/80 leading-relaxed">
              {this.state.errorMessage}
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="btn btn-primary btn-md"
              >
                Tải lại trang
              </button>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
