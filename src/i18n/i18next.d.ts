import 'i18next';

import type es from './es.json';

// Typed translation keys: t('app.title') compiles and t('app.titel') does not.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof es };
  }
}
