import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-desk mx-auto my-12 p-8 border border-rule bg-paper-inset text-ink">
          <div className="font-serif text-2xl font-medium mb-3 text-loss">Research Desk Interrupted</div>
          <p className="text-ink-soft text-sm mb-4 leading-relaxed">
            An unforeseen condition halted the dossier renderer. The case file details could not be presented cleanly.
          </p>
          <div className="p-3 bg-paper border border-rule text-xs font-mono text-ink-soft mb-6">
            {this.state.error?.message || 'Unknown application error'}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 border border-ink text-xs font-medium hover:bg-ink hover:text-paper transition-colors"
          >
            Reload Dossier
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
