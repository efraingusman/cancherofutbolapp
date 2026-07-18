@echo off
echo ===========================================
echo   SUBIENDO CANCHERO A VERCEL (GRATIS)
echo ===========================================
echo.
echo Para que Vercel te regale el hosting, necesitas confirmar que eres una persona real.
echo.
echo Paso 1: Vamos a iniciar sesion...
call npx vercel login
echo.
echo Paso 2: Subiendo la pagina...
call npx vercel --prod
echo.
echo ¡Listo! Si no hubo errores, tu pagina ya es publica y esta en internet.
pause
