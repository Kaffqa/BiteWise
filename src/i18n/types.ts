import type { en } from './en';

export type Language = 'en' | 'id';

type WidenStrings<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
  ? WidenStrings<U>[]
  : T extends object
  ? { [K in keyof T]: WidenStrings<T[K]> }
  : T;

export type TranslationDictionary = WidenStrings<typeof en>;
