# Fotos de Ciudades / Departamentos

Cada departamento de Uruguay tiene su carpeta aquí. Cuando ponés una foto `cover.jpg` en la carpeta de un departamento, esa foto aparece como portada de la tarjeta en el directorio de Complejos, Tiendas y Profesionales.

## Cómo agregar fotos

1. Navegá a `img/ciudades/uruguay/{nombre_departamento}/`
2. Reemplazá el archivo `cover.jpg` con tu foto real
3. **La foto DEBE llamarse exactamente `cover.jpg`**
4. Tamaño recomendado: **400×225 px** (proporción 16:9)
5. Ejecutá `node build.js` y luego `npx vercel --prod` para publicar el cambio

## Departamentos disponibles

| Carpeta | Departamento |
|---|---|
| `montevideo/` | Montevideo |
| `canelones/` | Canelones |
| `maldonado/` | Maldonado |
| `colonia/` | Colonia |
| `salto/` | Salto |
| `paysandu/` | Paysandú |
| `rivera/` | Rivera |
| `rocha/` | Rocha |
| `tacuarembo/` | Tacuarembó |
| `durazno/` | Durazno |
| `florida/` | Florida |
| `lavalleja/` | Lavalleja |
| `soriano/` | Soriano |
| `treintaytres/` | Treinta y Tres |
| `flores/` | Flores |
| `rio_negro/` | Río Negro |
| `artigas/` | Artigas |
| `cerro_largo/` | Cerro Largo |
| `san_jose/` | San José |

## Notas

- Sin foto → la tarjeta se muestra con el color degradado original (funciona perfecto igual)
- Con foto → la imagen se superpone sobre el color con opacidad del 55% + overlay oscuro para legibilidad
- Para agregar más países en el futuro: crear `img/ciudades/{pais}/{ciudad}/cover.jpg`
