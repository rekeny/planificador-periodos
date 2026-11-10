import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import es from './es.json';

// Spanish is the only language of the app (docs/constitution.md, principle 7), so the
// resources are bundled and initialised synchronously: screens and tests never wait.
void i18n.use(initReactI18next).init({
  lng: 'es',
  fallbackLng: 'es',
  resources: { es: { translation: es } },
  interpolation: { escapeValue: false },
  initAsync: false,
});

export { i18n };
