// @ts-check
const { test, expect } = require('@playwright/test');

// Errores de consola que NO son culpa de la app (red externa, extensiones, etc.)
const IGNORE_CONSOLE = [
  /favicon/i,
  /supabase/i,               // sin credenciales de test, la red a Supabase puede fallar
  /net::ERR_/i,
  /Failed to load resource/i,
  /adsbygoogle/i,
  /ERR_INTERNET_DISCONNECTED/i,
  /google/i,
];

// Tests herméticos: abortar todo pedido a hosts externos (CDNs, fuentes, Supabase,
// AdSense). Sin esto, los <script src="https://..."> síncronos (gsap/supabase/leaflet)
// bloquean el DOMContentLoaded cuando no hay red. Solo se sirve localhost.
async function blockExternal(page) {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1') || url.startsWith('data:') || url.startsWith('blob:')) {
      return route.continue();
    }
    // Cumplir de inmediato con un 200 vacío (no abortar): así los <script src>
    // síncronos externos "cargan" al instante y el parser sigue sin bloquearse.
    const type = route.request().resourceType();
    const ct = type === 'stylesheet' ? 'text/css'
      : type === 'script' ? 'text/javascript'
      : type === 'image' ? 'image/gif'
      : 'text/plain';
    return route.fulfill({ status: 200, contentType: ct, body: '' });
  });
}

function trackErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const t = msg.text();
      if (!IGNORE_CONSOLE.some((re) => re.test(t))) errors.push(t);
    }
  });
  page.on('pageerror', (err) => {
    const t = String(err);
    if (!IGNORE_CONSOLE.some((re) => re.test(t))) errors.push(t);
  });
  return errors;
}

test.beforeEach(async ({ page }) => {
  await blockExternal(page);
});

test.describe('Canchero — landing y layout', () => {
  test('la página carga y el título es correcto', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/', { waitUntil: 'commit' });
    await expect(page).toHaveTitle(/canchero/i);
    // No debe haber errores JS propios de la app al cargar
    expect(errors, 'errores de consola propios de la app').toEqual([]);
  });

  test('la BARRA SUPERIOR (logo) está visible', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });
    const nav = page.locator('#main-nav');
    await expect(nav).toBeVisible();
    // El logo dentro del header
    const logo = nav.locator('.nav-brand img').first();
    await expect(logo).toBeVisible();
    // El header debe estar arriba de todo (fixed, top ~0)
    const box = await nav.boundingBox();
    expect(box).not.toBeNull();
    if (box) expect(box.y).toBeLessThan(30);
  });

  test('los accesos ENTRAR / REGISTRO están presentes (deslogueado)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });
    // En desktop se ve ENTRAR; en mobile puede colapsar en hamburguesa. Cualquiera vale.
    const loginOrMenu = page.locator('#btn-nav-login, #btn-hamburger').first();
    await expect(loginOrMenu, 'debe verse ENTRAR o el menú hamburguesa').toBeVisible();
  });

  test('AdSense está APAGADO por defecto (sin pedir anuncios)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });
    // Esperar a que script.js registre sus globales (el archivo es grande)
    await page.waitForFunction(() => typeof window._feedAdHtml === 'function', null, { timeout: 15000 });
    const pub = await page.evaluate(() => window.ADSENSE_PUB_ID);
    expect(pub, 'ADSENSE_PUB_ID vacío = sin anuncios hasta configurarlo').toBe('');
    const empty = await page.evaluate(() => window._feedAdHtml(0));
    expect(empty, 'sin PUB_ID no se genera HTML de anuncio').toBe('');
  });

  test('el splash con logo aparece y se oculta (no queda tapando la app)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });
    // El splash existe al arrancar
    const splash = page.locator('#app-splash');
    await expect(splash).toBeAttached();
    const logo = splash.locator('.app-splash-logo');
    await expect(logo).toBeVisible();
    // Y se remueve/oculta (no debe quedar cubriendo la interfaz)
    await expect(splash).toBeHidden({ timeout: 8000 });
  });

  test('el service worker y el build están declarados', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });
    await page.waitForFunction(() => typeof CANCHERO_BUILD !== 'undefined', null, { timeout: 15000 });
    const build = await page.evaluate(() => CANCHERO_BUILD);
    expect(build, 'CANCHERO_BUILD definido').toBeTruthy();
  });
});

test.describe('Canchero — barra superior en ambas orientaciones', () => {
  // Este bloque corre bajo los dos proyectos (pc-horizontal y celular-vertical),
  // por lo que valida el requisito de que el header se vea siempre.
  test('el header sigue visible en la orientación del proyecto', async ({ page }, testInfo) => {
    await page.goto('/', { waitUntil: 'commit' });
    const nav = page.locator('#main-nav');
    await expect(nav, `header visible en ${testInfo.project.name}`).toBeVisible();
    // Captura para revisión visual (adjunta al reporte)
    await testInfo.attach(`landing-${testInfo.project.name}.png`, {
      body: await page.screenshot({ fullPage: false }),
      contentType: 'image/png',
    });
  });

  test('en landscape forzado el header permanece visible', async ({ page }) => {
    // Forzar viewport horizontal (PC / celular rotado)
    await page.setViewportSize({ width: 900, height: 420 });
    await page.goto('/', { waitUntil: 'commit' });
    const nav = page.locator('#main-nav');
    await expect(nav).toBeVisible();
    const display = await nav.evaluate((el) => getComputedStyle(el).display);
    expect(display).not.toBe('none');
  });
});

test.describe('Canchero — arranque con sesión (no queda en home)', () => {
  // Verifica el fix: con sesión, la app abre el dashboard, nunca el home de marketing.
  async function bootAs(page, user) {
    await page.addInitScript((u) => {
      try { localStorage.setItem('canchero_user', JSON.stringify(u)); } catch (e) {}
    }, user);
    await page.goto('/', { waitUntil: 'commit' });
    // Esperar a que el boot (DOMContentLoaded) haya corrido la navegación
    await page.waitForFunction(() => {
      const h = document.getElementById('view-home');
      const j = document.getElementById('view-jugador');
      return h && j && getComputedStyle(h).display === 'none' && getComputedStyle(j).display !== 'none';
    }, null, { timeout: 12000 });
  }

  test('jugador: abre el dashboard, no el home', async ({ page }) => {
    await bootAs(page, { email: 'test.jugador@canchero.app', name: 'Juga Test', role: 'jugador' });
    await expect(page.locator('#view-jugador')).toBeVisible();
    const homeDisp = await page.locator('#view-home').evaluate((el) => getComputedStyle(el).display);
    expect(homeDisp).toBe('none');
  });

  test('tienda (negocio): abre el dashboard, no el home', async ({ page }) => {
    await bootAs(page, { email: 'test.tienda.canchero@gmail.com', name: 'Deportes El Crack', role: 'tienda', isComplexApproved: false });
    await expect(page.locator('#view-jugador')).toBeVisible();
    const homeDisp = await page.locator('#view-home').evaluate((el) => getComputedStyle(el).display);
    expect(homeDisp).toBe('none');
  });

  test('cambiar de rol abre el FEED del dashboard, no la landing "ENTRÁ COMO..."', async ({ page }) => {
    await bootAs(page, { email: 'test.jugador@canchero.app', name: 'Juga Test', role: 'jugador' });
    // Cambiar de perfil por API (equivale a usar el selector "Cambiar de Perfil")
    await page.waitForFunction(() => typeof window._switchToProfile === 'function', null, { timeout: 12000 });
    await page.evaluate(() => { try { window._switchToProfile('fanatico'); } catch (e) {} window._switchToProfile('jugador'); });
    await page.waitForTimeout(600);
    const st = await page.evaluate(() => ({
      home: getComputedStyle(document.getElementById('view-home')).display,
      jugador: getComputedStyle(document.getElementById('view-jugador')).display,
    }));
    expect(st.home, 'la landing NO debe quedar visible tras cambiar de rol').toBe('none');
    expect(st.jugador).not.toBe('none');
  });
});

test.describe('Canchero — interacción básica sin login', () => {
  test('abrir el modal de ENTRAR desde el hero (si está disponible)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });
    // Botón ENTRAR del header (desktop) — esperar a que esté visible antes de decidir.
    const entrar = page.locator('#btn-nav-login');
    await entrar.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    if (!(await entrar.isVisible())) {
      test.skip(true, 'ENTRAR no visible en esta orientación (menú colapsado)');
      return;
    }
    // El onclick usa openEntrarModal de script.js — esperar a que esté cargado.
    await page.waitForFunction(() => typeof window.openEntrarModal === 'function', null, { timeout: 15000 });
    await entrar.click();
    // Debe aparecer la UI de login/roles (texto visible), no un modal oculto preexistente.
    const loginUi = page.getByText(/iniciar sesión|continuar con google|¿quién sos|elegí/i).first();
    await expect(loginUi).toBeVisible({ timeout: 6000 });
  });
});
