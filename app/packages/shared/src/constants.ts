/** Maximum CV versions per candidate (Req 4.2). */
export const MAX_CV_VERSIONS = 5;

/** Supported CV upload formats (assumption per Req 4.5). */
export const SUPPORTED_CV_FORMATS = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] as const;

/** Confirmed candidate language set, to be finalized (Req 16.6). */
export const SUPPORTED_LOCALES = ['en', 'ar', 'he'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
