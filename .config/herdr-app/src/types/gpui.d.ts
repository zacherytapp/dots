// Loose typings for the gpui-kit runtime that Herdr mods run in. The real declarations
// (~/.config/herdr-app/gpui-kit.d.ts, 800 KB) are written by the app and type every style
// method; here an element is a fluent builder whose methods all return another element,
// which is enough to type-check the data side (herdr.d.ts) strictly.

declare module "gpui-kit" {
  /** A described element: every builder method returns the element for chaining. */
  export interface El {
    [method: string]: (...args: any[]) => El;
  }

  export interface Timer {
    every(ms: number, handler: (cx: Cx) => void): unknown;
    after(ms: number, handler: (cx: Cx) => void): unknown;
  }

  export interface FocusHandle {
    focus(): void;
  }

  export interface Cx {
    notify(): void;
    spawn(task: (cx: Cx) => Promise<void> | void): unknown;
    readonly timer: Timer;
    stop_propagation(): void;
    focus_handle(): FocusHandle;
  }

  export interface Size {
    width: number;
    height: number;
  }

  export interface MouseEvent {
    click_count?: number;
    position?: { x: number; y: number };
  }

  export interface ScrollEvent {
    delta: { x: number; y: number };
  }

  export type HostValue = unknown;

  export class View {
    init?(props: unknown, cx: Cx): void;
    render(cx: Cx): El;
    close?(cx: Cx): Promise<void>;
  }

  export function div(): El;
  export function svg(path: string): El;
  export function image(path: string): El;
}

declare module "gpui-base" {
  import type { Cx, El } from "gpui-kit";

  export interface InputState {
    value(): string;
    set_value(next: string): void;
    /** Draws the text as a password. */
    set_masked(masked: boolean): void;
    focus(): void;
    on(
      event: "change" | "submit" | "focus" | "blur",
      handler: (event: { shift?: boolean }, cx: Cx) => void,
    ): boolean;
  }

  export const InputState: {
    new: (options?: { placeholder?: string; value?: string }) => InputState;
  };
  export const Input: { new: (state: InputState) => El };

  export function v_flex(): El;
  export function h_flex(): El;
}

/** src/assets icons, inlined as text by the build (esbuild loader "text"). */
declare module "*.svg" {
  const text: string;
  export default text;
}
