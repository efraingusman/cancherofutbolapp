@echo off
echo ===========================================
echo   GENERANDO APK DE CANCHERO PARA ANDROID
echo ===========================================
echo.
echo Este script abrira Android Studio para que exportes el APK final.
echo Dado que tu consola tiene Java 8, debemos hacerlo desde la interfaz de Android Studio que ya tiene Java 17 integrado.
echo.
echo Paso 1: Sincronizando los ultimos cambios de la web al celular...
call npm run sync
echo.
echo Paso 2: Abriendo Android Studio...
call npx cap open android
echo.
echo Cuando Android Studio cargue, ve al menu superior y haz clic en:
echo Build -^> Build Bundle(s) / APK(s) -^> Build APK(s)
echo.
pause
