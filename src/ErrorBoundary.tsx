import { Component, type ReactNode } from "react";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="recovery">
        <div className="brand-mark">m</div>
        <h1>Wróćmy do Twoich spraw.</h1>
        <p>
          Nie udało się wyświetlić tego widoku. Zapisany lokalnie postęp
          pozostaje na urządzeniu.
        </p>
        <button className="primary" onClick={() => location.reload()}>
          Otwórz aplikację ponownie
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
