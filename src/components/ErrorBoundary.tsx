import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'Unknown runtime error',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Render crash:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <div className="max-w-xl w-full rounded-xl border border-border bg-card p-6 space-y-3">
            <h1 className="text-xl font-semibold">אירעה שגיאה בטעינת המערכת</h1>
            <p className="text-sm text-muted-foreground">רענן את הדף. אם זה ממשיך, שלח צילום מסך של ההודעה הזו.</p>
            <pre className="text-xs bg-muted/40 border border-border rounded-md p-3 overflow-auto whitespace-pre-wrap break-words">
              {this.state.message}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
