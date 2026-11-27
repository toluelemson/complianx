import { Component, Suspense, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';

type RouteBoundaryProps = { children: ReactNode };

export function RouteBoundary({ children }: RouteBoundaryProps) {
  const { pathname } = useLocation();

  return (
    <RouteErrorBoundary key={pathname}>
      <Suspense
        fallback={
          <main className="flex min-h-screen items-center justify-center bg-background p-6">
            <p role="status" className="text-muted-foreground">
              Loading page…
            </p>
          </main>
        }
      >
        {children}
      </Suspense>
    </RouteErrorBoundary>
  );
}

class RouteErrorBoundary extends Component<
  RouteBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="grid min-h-screen place-content-center justify-items-center gap-4 bg-background p-6 text-center">
        <div role="alert">
          <h1 className="text-xl font-semibold">This page couldn’t load</h1>
        </div>
        <Button type="button" onClick={() => window.location.reload()}>
          Reload page
        </Button>
      </main>
    );
  }
}
