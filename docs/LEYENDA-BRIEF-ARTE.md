# Canchero Leyenda — Brief completo de arte

> Documento para pasarle a Claude Design (o a cualquier artista) para **rediseñar
> todos los fondos, personajes y sprites** del juego. Describe qué es cada cosa,
> cuándo aparece, qué tamaño tiene y qué tiene que comunicar.
>
> Estado actual: **todo el arte es SVG generado por código** (rectángulos, cero
> imágenes externas). Se ve funcional pero muy básico. El objetivo es reemplazarlo
> por arte real manteniendo las mismas medidas y puntos de anclaje.

---

## 1. Qué es el juego

Simulador narrativo de una vida futbolística, en español rioplatense, jugable
desde el celular. El jugador nace en un barrio cualquiera, juega en el potrero a
los 11, pasa por juveniles, debuta, hace una carrera completa, se retira, elige
una segunda vida (DT, dirigente, comentarista, empresario, escuela de fútbol o
vida tranquila), envejece por tramos de 5 años, forma una familia y después el
juego continúa con un hijo o un nieto (**el legado**), generación tras generación.

El calendario arranca en **2026** y puede llegar a **2100+**, así que el mundo
tiene que envejecer visualmente: hoy → digital → holográfico → robots → órbita.

**Vista:** side-scroller 2D, cámara lateral fija, el personaje camina de izquierda
a derecha por escenarios de ~880–1040 px de ancho lógico por **250 px de alto**.

---

## 2. Estilo visual actual y hacia dónde ir

| Hoy | Objetivo |
|---|---|
| Pixel art "de rectángulos", generado por código | Pixel art real, dibujado, con paleta cohesiva |
| Sombreado plano de 3 tonos por hash de color | Iluminación intencional por escenario (hora del día, interior/exterior) |
| Fondos de degradados + tiras de color | Fondos ilustrados con profundidad (3 capas: fondo / medio / primer plano) |
| Objetos de 30–90 px sin detalle | Props legibles a 1× y a 2.4× |

**Paleta de marca:** verde lima `#baff00` (acento), negro verdoso `#0a0c0a`
(fondo), gris cálido `#c4ccc0` (texto secundario).
**Regla dura:** `shape-rendering: crispEdges`, nada de antialias, todo alineado a
la grilla de píxeles.

---

## 3. El personaje jugable (sprite principal)

- Lienzo lógico: **48 × 72 px**, figura de cuerpo entero **de frente**, escalada ×2–×4.
- El "piso" del sprite está en y = 68; la sombra elíptica va en y = 69.5.
- Proporciones por edad (multiplicadores sobre altura/hombros/cabeza):

| Edad | Etiqueta | Altura | Hombros | Cabeza |
|---|---|---|---|---|
| 0–2 | Bebé | *sprite propio 22×20* | — | enorme |
| ≤13 | Pibe | 0.70 | 0.78 | 1.16 |
| 14–16 | Juvenil | 0.84 | 0.88 | 1.08 |
| 17–19 | Joven | 0.94 | 0.96 | 1.03 |
| 20–30 | Plenitud | 1.00 | 1.00 | 1.00 |
| 31–35 | Veterano | 1.00 | 1.02 | 1.00 |
| 36–45 | Ex jugador | 0.99 | 1.01 | 1.00 |
| 46–60 | Mayor | 0.97 | 0.98 | 1.00 |
| 61+ | Anciano | 0.93 | 0.93 | 1.00 |

### Variables de apariencia (todas combinables)

- **Piel:** clara, media, trigueña, morena, oscura (cada una con tono base, sombra y sombra profunda).
- **Pelo:** corto, rapado, largo, afro, tupé, mohicano, rastas, colita, pelado.
- **Color de pelo:** negro, castaño, rubio, colorado, canoso, platinado, fantasía (lima).
- **Barba:** 0 a 3 (afeitado → candado → barba → barbón). Nunca antes de los 17.
- **Accesorios:** vincha, guantes, tatuajes, muñequera.
- **Género:** masculino / femenino. El cuerpo femenino tiene hombros más angostos
  (×0.86), cadera más ancha (+3), cintura marcada, melena que cae por detrás de
  los hombros, pestañas y labio. **Nunca barba ni calvicie.**
- **Evolutivas** (las aplica el juego solo, con el paso de los años y las decisiones):
  peso (−1/0/+1, con panza dibujada), calvicie (0–3), canas (0–2), cicatriz facial
  (0–2), tatuajes acumulados (0–3), cadenas de oro / reloj (bling 0–2), lentes,
  vendaje de rodilla, muletas, implante capilar, uniforme naranja de preso.

### Vestuarios

| Id | Qué es | Notas de dibujo |
|---|---|---|
| *(ninguno)* | Camiseta del club | Kit real: sólido, rayas verticales, banda diagonal; apellido + dorsal legibles |
| `dt` | Buzo de técnico | Azul oscuro, **manga larga** |
| `medico` | Ambo y guardapolvo blanco | Estetoscopio al cuello, bolsillo, **manga larga** |
| `enfermero` | Ambo verde agua | **manga larga** |
| `tv` | Saco de panelista | Camisa clara + corbata, **manga larga** |
| `traje` | Traje | Negro, camisa clara, corbata bordó, **manga larga** |
| `empresario` | Camisa y saco verde | **manga larga** |
| `escuela` | Buzo naranja de escuelita | **manga larga** |
| `calle` | Remera y pantalón | Manga corta |
| `abrigo` | Campera | **manga larga** |
| `jubilado` | Cárdigan marrón | **manga larga** |

> Regla: fuera de la cancha **nadie anda en short**; toda ropa civil dibuja
> pierna larga hasta el zapato.

### Poses y animaciones

Hay ~25 poses. Cada una define rotación de brazo izquierdo/derecho, inclinación
de cabeza, salto, expresión (normal / feliz / triste / dolor) y ciclo de piernas
(quieto / caminar / correr / paso corto / sentado), más un **gesto** que anima los
brazos encima de la pose base.

Poses clave: `idle`, `caminar`, `correr`, `festejo`, `gol`, `campeon` (levanta la
copa o una medalla sobre la cabeza), `posando` (sostiene la camiseta con las dos
manos en la presentación), `lesion`, `esposado`, `llorar`, `taparse`, `bajon`,
`pensativo`, `nervioso`, `alivio`, `firmar`, `orgullo`, `rico`, `aplaudir`,
**`bebe` (acuna un bebé sobre los antebrazos, a la altura del pecho)**.

Gestos: respirar, braceo, agitar, levantar, hundirse, dolor, meditar, saludar,
mostrar, temblar, jadear, aplaudir, pecho, sollozar, **acunar**.

Animaciones permanentes: respiración (sube/baja el cuerpo), parpadeo, balanceo
lateral, giro leve de cabeza. Todas se desactivan con `prefers-reduced-motion`.

### El bebé (sprite aparte, 22 × 20)

Cabeza grande, cuerpo envuelto en manta (celeste o rosa según género), pelusa,
dos ojitos, boquita, manitos asomando. Se usa de 0 a 2 años y dentro de la cuna.

---

## 4. Escenarios caminables

Cada mundo tiene sus escenarios; se pasa de uno a otro caminando hasta el borde.
**Alto: 250 px. La línea de piso está a un % del alto que cambia por escenario.**

### Mundo POTRERO (11–14 años)
| Escena | Ancho | Piso | Qué se ve |
|---|---|---|---|
| El baldío | 940 | 76% | Atardecer naranja, tierra pelada, arcos de palos, paredón con pintadas |
| Tu cuadra | 860 | 80% | Casas bajas, vereda rota, kiosco, cables cruzados |

### Mundo JUVENILES (15–17 años)
| Escena | Ancho | Piso | Qué se ve |
|---|---|---|---|
| La pensión | 820 | 78% | Cuartos compartidos, cuchetas, bolsos, un teléfono |
| El predio | 1000 | 72% | Canchas de entrenamiento, conos, gimnasio, vestidor |

### Mundo CLUB (carrera profesional)
| Escena | Ancho | Piso | Qué se ve |
|---|---|---|---|
| Tu casa | 880 | 78% | **ver sección 5** |
| El vestuario | 860 | 76% | Lockers, pizarra táctica, banco, botines colgados, pelota |
| La cancha | 1040 | 62% | Césped, líneas, arco con red, tribunas al fondo, torres de luz |
| La oficina | 820 | 78% | Escritorio, vitrina de copas, banderín, notebook |

### Mundo VIDA (post-retiro, tramos de 5 años de los 36 a los 80)
| Escena | Ancho | Piso | Qué se ve |
|---|---|---|---|
| Tu casa | 880 | 78% | **ver sección 5** |
| El barrio | 980 | 80% | Noche, luna, edificios con luces, faroles, kiosco, banco de plaza |
| Tu laburo | 860 | 76% | Cambia por rol (ver abajo) |
| Tu lugar | 1000 | 74% | Cambia por rol (ver abajo) |

### "Tu laburo" y "Tu lugar" por rol

| Rol | Laburo | Tu lugar | Paleta |
|---|---|---|---|
| Director Técnico | Vestuario con pizarra táctica | El campo de entrenamiento | Verde lima sobre verde oscuro |
| Comentarista | Piso de TV: riel de luces, pantalla grande, micrófono, escritorio | El piso de TV | Azul frío |
| Dirigente | Despacho: escritorio grande, vitrina de copas, banderín | El palco | Dorado sobre marrón |
| Empresario | Oficina con ventanal a la ciudad, gráfico de bolsa, planta | Tu negocio | Verde esmeralda |
| Escuela de fútbol | Cancha de barrio al atardecer: arco con red, conos, pelotas | La canchita de los pibes | Naranja atardecer |
| Vida tranquila | Living: sillón, TV, ventana, mate | La plaza del barrio | Violeta suave |

---

## 5. La casa (el escenario más importante)

La casa **sube y baja con el patrimonio**. Cinco niveles:

0. La pieza de la casa de tus viejos — humedad en la pared, grieta, catre, cajón,
   tele chica, bombita colgando, ventana chica (76×60).
1. Un monoambiente alquilado — futón, tele, plantita, ventana 108×78.
2. Tu primer departamento propio — sofá, mesa, tele mediana, ventana 150×96.
3. Una casa con jardín — sofá grande, tele grande, molduras, zócalo, ventana 220×118.
4. Una casa que sale en las revistas — araña, planta grande, mármol, pileta que se
   ve por el ventanal (300×140).

### Estructura obligatoria del escenario "casa"

```
|<------------ 78% INTERIOR ------------>|MURO|<-- 22% EXTERIOR -->|
 ventana   muebles   vitrina de trofeos   puerta  vereda | cordón | calle
```

- **El muro** va del techo al piso, 10 px de grosor, con sombra propia.
- **La puerta** mide 40% del alto de la escena (≈ 1.9 veces la altura de una
  persona), con marco, dos paneles y picaporte dorado.
- **Afuera**: vereda con baldosas, cordón, asfalto con marcación central,
  farol de calle, edificios del barrio al fondo con ventanas encendidas.
- **El auto** (si lo comprás) se estaciona en la calle, nunca adentro.
- **El vecino** está siempre del lado de afuera.
- La ventana nunca puede superponerse con la puerta ni con los muebles.

### Muebles y props de la casa

Cama (respaldo alto, somier, sábana, acolchado con dobladillo, dos almohadas,
patas), ropero (dos puertas, tiradores dorados, ropa colgada visible), espejo de
cuerpo entero con marco de madera, cuna con el bebé adentro, TV mostrando un
partido, vitrina de trofeos que se llena a medida que ganás.

---

## 6. Objetos interactivos (props)

Cada uno se dibuja apoyado en el piso, a escala coherente con una persona
(el muñeco mide ~56 unidades de alto).

| Prop | Medida lógica | Notas |
|---|---|---|
| Pelota | 26×26 | Clásica blanca y negra |
| Cama | 88×50 | ver arriba |
| Cuna | 46×34 | Con bebé adentro, manta celeste o rosa |
| Ropero | 40×54 | |
| Espejo | 30×58 | Reflejo insinuado |
| TV | 60×46 | Muestra una cancha con jugadores y marcador |
| Kiosco | 70×52 | Toldo, revistas, golosinas |
| Gimnasio | 58×40 | Banco y barra con discos |
| Cartel | 56×56 | Poste con cartel amarillo |
| Escritorio/trabajo | 64×50 | Monitor y trofeo |
| Descanso | 46×52 | Planta / sillón |

### Bienes que se compran (se ven en la escena)

| Bien | Medida | Notas |
|---|---|---|
| **Auto** | 62×26 | Capot bajo, techo caído, parabrisas inclinado, paragolpes, luces, **ruedas redondas con llanta**. Cambia por época: cupé clásico → eléctrico → aerodinámico → **flotante** (sin ruedas, con colchón de luz) |
| Casa | 52×48 | Techo a dos aguas, puerta, dos ventanas |
| Yate | 78×40 | Casco, cabina, mástil |
| Avión | 88×34 | Fuselaje, alas, cola |
| Reloj de oro | 16×22 | |
| Restaurante | 52×40 | Toldo, mesas |
| Escuela | 56×40 | Campanario, ventanas |
| Fundación | 40×36 | Corazón rosa, manos |

---

## 7. Las eras tecnológicas (esto tiene que verse)

| Era | Años | Qué cambia en el mundo |
|---|---|---|
| **Hoy** | 2026–2034 | Todo normal. Faroles amarillos, TV de panel. |
| **Digital** | 2035–2047 | Panel gigante colgado en la pared, faroles blancos, más pantallas. |
| **Holo** | 2048–2061 | Luz ambiental de colores, dron chico en el aire, carteles de neón, vía elevada al fondo, **autos que flotan**. |
| **Robot** | 2062–2074 | Holograma sobre la mesa, **robots repartidores caminando por la vereda**, dron de vigilancia, faroles de neón frío. |
| **Orbital** | 2075+ | **Ascensor espacial** al fondo del barrio, **nave despegando**, autos totalmente flotantes con colchón de luz. |

El año y la era se muestran **siempre**, arriba a la derecha, en un chip con el
verde lima de marca.

---

## 8. Personajes no jugables

Todos usan el mismo sistema de sprite del jugador, con apariencia estable por
nombre. Cada uno tiene **nombre + apellido** (el apellido cambia según el país
donde estés jugando) y un rol visible debajo.

| Personaje | Edad | Ropa | Género | Dónde aparece |
|---|---|---|---|---|
| Los pibes del baldío | 11–14 | calle | m | Potrero |
| Tu viejo | 44 | calle | m | Tu cuadra |
| El ojeador | 50 | tv | — | Potrero |
| DT de juveniles | 52 | dt | m | Predio |
| Compañero de cuarto | 16 | calle | m | Pensión |
| Un veterano de primera | 34 | kit | m | Predio |
| El técnico | 55 | dt | m | Vestuario |
| El capitán | 29 | kit | m | Vestuario |
| Un hincha | 38 | calle | — | Cancha |
| Tu representante | 40–55 | traje o tv | — | Oficina |
| Tu pareja | tu edad −2 | calle | **el que elijas (por defecto mujer, pelo largo)** | Casa |
| Tus hijos | 0–40 | calle | m/f según el nombre | Casa |
| Tus nietos | 0–20 | calle | m/f según el nombre | Casa |
| El vecino | 46 | calle | — | **Vereda, nunca adentro** |
| El médico del barrio | 52 | **medico** | — | Barrio |
| El jefe (presidente, productor, vice, socio, profe) | 58 | traje/escuela | — | Laburo |
| Un pibe que te pide un autógrafo | **10** | calle | m | Decisión |

---

## 9. Pantallas de decisión

Formato: banner ilustrado arriba (640×150, recortado a 120 px de alto) + tarjeta
de texto + 2–4 botones de opción.

El banner usa el fondo del **lugar** donde ocurre la decisión, más un ícono de
categoría arriba a la derecha:

`potrero → baldío` · `ojeador → baldío` · `fichaje/agente/dinero/contrato/sponsor → oficina`
`final/título/táctica/selección → cancha` · `prensa/redes → estudio de TV`
`lesión/salud → clínica` · `mentoría → predio` · `joda → noche` · `familia/vida → casa`

### Recuadro del avatar en las decisiones

Marco con cielo en degradado + capa decorativa + **piso sólido de 22 px con línea
de horizonte**, sobre el que el personaje apoya los pies. Diez escenarios:

| Escenario | Cielo | Piso | Decorado |
|---|---|---|---|
| cancha | verde oscuro | césped `#2f5c24` | franjas de corte de pasto |
| estadio | violeta noche | césped `#2d6b2a` | tribuna con público + focos |
| potrero | marrón atardecer | tierra `#6b4a22` | paredón de ladrillo |
| vestuario | azul petróleo | baldosa `#243a44` | lockers |
| cárcel | gris | cemento `#3a3a3c` | rejas |
| hospital | verde agua | piso `#2a4a4e` | azulejos |
| noche | azul profundo | asfalto `#2b3038` | ventanas encendidas |
| oficina | ocre | parqué `#4a3a22` | ventanal con reflejo |
| casa | violeta | parqué `#4a3520` | pared con textura |
| lluvia | gris azulado | mojado `#2c3a42` | lluvia animada en diagonal |

---

## 10. Interfaz

- **Barra superior:** avatar chico, nombre + edad, año + club, hasta 4 estadísticas
  en chips (nivel, moral, fama, dinero / presión, resultados, plantel, salud /
  felicidad, familia, soledad, salud).
- **Chip de legado:** dorado mientras no superaste a tu ancestro, verde lima
  cuando lo superaste.
- **Botón de salir:** círculo con ✕, arriba a la derecha, discreto.
- **Chip de año:** siempre visible junto al botón de salir.
- **Lista de acciones:** botones grandes; el que hace avanzar el juego va primero
  y destacado en verde lima. Al lado de cada persona hay un botón de conversación.
- **Barras de necesidad:** 10 segmentos, se ponen rojas cuando la cosa va mal.
- **Escudos de club:** los reales están en `img/clubs/`; los que no existen usan
  un crest generado (pentágono redondeado, dos tonos e iniciales).
- **Camisetas:** dibujadas en SVG con el kit del club (sólido / rayas / banda).
- **Trofeos:** imágenes reales en `img/trofeos/`, con medalla dorada de fallback.

---

## 11. Idiomas

Español (por defecto), inglés, portugués, francés e italiano. El texto se traduce
en tiempo real sobre el DOM, así que **todo el arte tiene que ser libre de texto**
salvo el que se dibuja como texto SVG (apellido y dorsal de la camiseta).

---

## 12. Prioridades del rediseño

1. **El sprite del jugador** — es lo que más se ve, en todas las edades y ropas.
2. **La casa** (5 niveles × 5 eras) — es el escenario donde más tiempo se pasa.
3. **El barrio y la calle** — segunda escena más visitada, y donde se lee el avance tecnológico.
4. **La cancha y el vestuario**.
5. Props y bienes.
6. Escenarios de las pantallas de decisión.
7. Los mundos de potrero y juveniles.
