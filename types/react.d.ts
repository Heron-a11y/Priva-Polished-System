declare module 'react' {
  export class Component<P = {}, S = {}> {
    state: S;
    props: P;
    setState: (state: Partial<S> | ((prevState: S) => Partial<S>), callback?: () => void) => void;
    componentDidCatch?: (error: Error, errorInfo: ErrorInfo) => void;
    render(): ReactNode;
    constructor(props: P);
  }
  
  export interface ComponentClass<P = {}, S = {}> {
    new (props: P): Component<P, S>;
  }
  
  export interface ErrorInfo {
    componentStack: string;
  }
  
  export type ReactNode = any;
  
  export interface FunctionComponent<P = {}> {
    (props: P): ReactNode;
  }
  
  export type FC<P = {}> = FunctionComponent<P>;
  
  export function useState<T>(initialState: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useRef<T>(initialValue: T): { current: T };
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
  
  export const Component: ComponentClass;
  export const PureComponent: ComponentClass;
  
  export default React;
}

declare namespace React {
  class Component<P = {}, S = {}> {
    state: S;
    props: P;
    setState: (state: Partial<S> | ((prevState: S) => Partial<S>), callback?: () => void) => void;
    componentDidCatch?: (error: Error, errorInfo: ErrorInfo) => void;
    render(): ReactNode;
    constructor(props: P);
  }
  
  interface ComponentClass<P = {}, S = {}> {
    new (props: P): Component<P, S>;
  }
  
  interface ErrorInfo {
    componentStack: string;
  }
  
  type ReactNode = any;
  
  interface FunctionComponent<P = {}> {
    (props: P): ReactNode;
  }
  
  type FC<P = {}> = FunctionComponent<P>;
  
  function useState<T>(initialState: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
  function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  function useRef<T>(initialValue: T): { current: T };
  function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
  
  const Component: ComponentClass;
  const PureComponent: ComponentClass;
}

declare const React: {
  Component: any;
  PureComponent: any;
  useState: <T>(initialState: T | (() => T)) => [T, (value: T | ((prev: T) => T)) => void];
  useEffect: (effect: () => void | (() => void), deps?: any[]) => void;
  useRef: <T>(initialValue: T) => { current: T };
  useCallback: <T extends (...args: any[]) => any>(callback: T, deps: any[]) => T;
};