type Listener = () => void;

export class Store<T extends object> {
  private listeners = new Set<Listener>();

  constructor(private state: T) {}

  get = (): T => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  set(patch: Partial<T>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
}
