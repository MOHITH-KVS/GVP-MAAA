import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Settings page error boundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="text-xl font-semibold text-red-600">Something went wrong in Settings.</h2>
          <p className="mt-2 text-sm text-slate-600">
            Please refresh the page or contact the administrator.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
