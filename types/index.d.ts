/** A CSS colour, or a [centre, edge] pair for a two-tone leaf. */
export type LeafColor = string | [centre: string, edge: string];

export interface SeasonOptions {
  /** Number of leaves, or "auto" to scale with screen size (8 on phones, up to 40 on large screens). Default "auto". */
  count?: 'auto' | number;
  /** Falling speed multiplier, 0.1 to 5. Default 1. */
  speed?: number;
  /** Leaf size multiplier, 0.3 to 3. Default 1. */
  size?: number;
  /** Sideways drift, -5 (left) to 5 (right). Default 0. */
  wind?: number;
  /** "golden", "warm", "mixed", one colour, or a list of colours. Default "mixed". */
  colors?: 'golden' | 'warm' | 'mixed' | string | LeafColor[];
  /** Overall opacity, 0 to 1. Default 1. */
  opacity?: number;
  /** z-index of the overlay canvas. Default 2147483000 (on top of everything). */
  zIndex?: number;
  /** Element to fill instead of the whole viewport. Default: the whole page. */
  container?: HTMLElement | null;
  /** Upper limit for the device pixel ratio, 1 to 4. Default 2 (keeps phones fast). */
  maxPixelRatio?: number;
  /** "respect" shows nothing for users who prefer reduced motion. Default "respect". */
  reducedMotion?: 'respect' | 'ignore';
  /** Pause while the browser tab is hidden. Default true. */
  pauseWhenHidden?: boolean;
  /** Whole number for a repeatable layout. Default null (random). */
  seed?: number | null;
}

export interface Season {
  /** Starts the effect, or restarts it with new options. Does nothing during server-side rendering. */
  render(options?: SeasonOptions): Season;
  /** Removes the effect and everything it added to the page. */
  stop(): Season;
  /** Freezes the leaves in place. */
  pause(): Season;
  /** Continues after pause(). */
  resume(): Season;
  /** True while leaves are animating. */
  readonly isRunning: boolean;
}

/** Falling autumn leaves. */
export declare const autumn: Season;

/** Package version. */
export declare const VERSION: string;
