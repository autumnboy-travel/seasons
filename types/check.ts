// Type-level smoke test: `npx tsc -p types` must pass.
import { autumn, VERSION, type SeasonOptions } from '@autumnboy-studio/seasons';

const options: SeasonOptions = { count: 'auto', colors: ['#f2853a', ['#ffd65a', '#e3961c']], wind: 1 };
autumn.render(options).pause().resume();
const running: boolean = autumn.isRunning;
const version: string = VERSION;
autumn.stop();

// @ts-expect-error count must be "auto" or a number
autumn.render({ count: 'many' });

export { running, version };
