@echo off
echo ============================================
echo  CANCHERO - Configuracion Supabase
echo ============================================
echo.
echo Paso 1: Login a Supabase (se abrira el navegador)
echo Presiona ENTER para continuar...
pause > nul
"C:\Users\Cliente\AppData\Local\npm-cache\_npx\aa8e5c70f9d8d161\node_modules\.bin\supabase.cmd" login
echo.
echo Paso 2: Ejecutando SQL de Fase 3...
"C:\Users\Cliente\AppData\Local\npm-cache\_npx\aa8e5c70f9d8d161\node_modules\.bin\supabase.cmd" db execute --project-ref dofbxgqzcvfjpnvcvdjb --file "C:\Users\Cliente\Documents\canchero app\www\supabase_fase3.sql"
echo.
echo Listo! Presiona cualquier tecla para cerrar.
pause > nul