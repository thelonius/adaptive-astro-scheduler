import '@testing-library/jest-dom/vitest';

// Polyfill ResizeObserver — jsdom doesn't have it, but DayDetailPanel uses it
class ResizeObserverStub {
    constructor(private cb: ResizeObserverCallback) {}
    observe(_el: Element) {
        this.cb([{ contentRect: { width: 300, height: 300 } } as ResizeObserverEntry], this);
    }
    unobserve() {}
    disconnect() {}
}
Object.defineProperty(window, 'ResizeObserver', { writable: true, value: ResizeObserverStub });

// jsdom returns zero for all getBoundingClientRect — stub to 300×300 so size-aware components render
Element.prototype.getBoundingClientRect = () =>
    ({ width: 300, height: 300, top: 0, left: 0, bottom: 300, right: 300, x: 0, y: 0, toJSON: () => {} } as DOMRect);

// Polyfill matchMedia for components that use it (e.g. Chakra responsive props)
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    }),
});
