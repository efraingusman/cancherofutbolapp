# Suite E2E de Canchero (Playwright)

Tests end-to-end que corren la app en **dos orientaciones**:

- **`pc-horizontal`** — viewport 1366×768 (PC / landscape).
- **`celular-vertical`** — viewport 390×844 (celular en vertical / portrait).

## Cómo correr

```bash
# Instalar el navegador la primera vez
npx playwright install chromium

# Todo (hace build de www/ y corre ambos proyectos)
npm run test:e2e

# Solo PC horizontal / solo celular vertical
npm run test:e2e:pc
npm run test:e2e:mobile

# Ver el reporte HTML del último run
npm run test:e2e:report
```

## Cómo funciona

- `tests/serve.js` — servidor estático mínimo (sin dependencias) que sirve el build de `www/`
  en `http://localhost:4178`. Playwright lo levanta solo (ver `webServer` en `playwright.config.js`).
- `tests/e2e/canchero.spec.js` — los tests.
- Los tests son **herméticos**: interceptan y cortan todo pedido a hosts externos (Supabase, CDNs
  de gsap/leaflet/chart.js, Google Fonts, Boxicons, AdSense) devolviendo un 200 vacío al instante.
  Así no dependen de la red y no se cuelga el `DOMContentLoaded` por los `<script src="https://…">`
  síncronos. El service worker se bloquea (`serviceWorkers: 'block'`) para que su reload no
  interrumpa las navegaciones.

## Qué cubre hoy (sin login)

- La página carga, título correcto, sin errores JS propios de la app.
- La **barra superior** (logo + acciones) está visible y arriba de todo, en **ambas orientaciones**
  y también en un landscape forzado (valida el requisito "el header siempre se ve").
- ENTRAR / REGISTRO presentes; al tocar ENTRAR aparece la UI de login.
- **AdSense apagado por defecto** (`ADSENSE_PUB_ID` vacío ⇒ no se piden anuncios) y el helper
  `_feedAdHtml` existe y no genera HTML cuando no hay editor configurado.
- `CANCHERO_BUILD` declarado.

## Extender a flujos logueados (pendiente)

Para testear feed, perfiles, portada, identidades, cancha, reels, etc. hay que autenticar.
Opciones:

1. Guardar un `storageState` con una sesión de una cuenta de prueba
   (`test.tienda.canchero@gmail.com` / `test.complejo.canchero@gmail.com`, `Canchero2026!`) y
   pasarlo en un proyecto nuevo, corriendo **contra la app desplegada** (no hermético) o contra
   una instancia de Supabase de test.
2. Inyectar `window.userData` + `canchero_user` en `localStorage` con `page.addInitScript` para
   simular sesión y probar el render de UI sin backend real.
