# ASSETS NECESARIOS — Canchero (para subir a carpetas)

Reglas generales:
- **Formato**: PNG con **fondo transparente** (escudos y trofeos) o JPG/PNG para fotos de fondo.
- **Tamaño**: escudos/trofeos cuadrados ~256×256 o 512×512. Fondos ~1280×720.
- **Nombre de archivo**: EXACTO como se indica abajo (minúsculas, sin espacios, guiones). Es
  clave que el nombre coincida o no se cargan.
- Poné cada grupo en su carpeta. Yo después las copio al proyecto y las conecto.

---

## 📁 CARPETA 1 — "escudos clubes" (img/clubs)
Ya EXISTEN estos (no hace falta): ajax, al-hilal, al-ittihad, al-nassr, atletico, barcelona,
bayern, boca, chelsea, danubio, dortmund, fiorentina, flamengo, gremio, independiente,
inter-miami, inter, juventus, liverpool, lyon, man-city, man-united, milan, monaco, nacional,
napoli, penarol, real-madrid, river, roma, santos, sevilla, sporting, tottenham, valencia.

**FALTAN (nombre de archivo → club):**
```
defensor-sporting.png   → Defensor Sporting (UY)
liverpool-uy.png        → Liverpool FC (Uruguay)
montevideo-city.png     → Montevideo City Torque
boston-river.png        → Boston River
cerro.png               → Cerro (UY)
maipu.png               → Dep. Maipú (ARG)
san-martin.png          → San Martín
chacarita.png           → Chacarita
gimnasia-mza.png        → Gimnasia (Mendoza)
estudiantes-ba.png      → Estudiantes (Bs As)
racing.png              → Racing Club (ARG)
san-lorenzo.png         → San Lorenzo
rosario-central.png     → Rosario Central
newells.png             → Newell's Old Boys
velez.png               → Vélez Sarsfield
estudiantes.png         → Estudiantes de La Plata
talleres.png            → Talleres
palmeiras.png           → Palmeiras
sao-paulo.png           → São Paulo
corinthians.png         → Corinthians
internacional.png       → Internacional
fluminense.png          → Fluminense
real-sociedad.png       → Real Sociedad
villarreal.png          → Villarreal
betis.png               → Real Betis
arsenal.png             → Arsenal
newcastle.png           → Newcastle
lazio.png               → Lazio
psg.png                 → Paris Saint-Germain
marsella.png            → Olympique Marsella
lille.png               → Lille
leipzig.png             → RB Leipzig
leverkusen.png          → Bayer Leverkusen
frankfurt.png           → Eintracht Frankfurt
benfica.png             → Benfica
porto.png               → Porto
braga.png               → Braga
america-mx.png          → Club América
chivas.png              → Chivas Guadalajara
monterrey.png           → Monterrey
tigres.png              → Tigres
cruz-azul.png           → Cruz Azul
la-galaxy.png           → LA Galaxy
lafc.png                → LAFC
atlanta-united.png      → Atlanta United
al-ahli.png             → Al-Ahli
```
(Para clubes amateur inventados NO hace falta escudo: se genera uno con iniciales.)

---

## 📁 CARPETA 2 — "trofeos" (img/trofeos)
Trofeos reales de cada competencia. Nombre de archivo → competencia:
```
champions.png       → UEFA Champions League
europa-league.png   → UEFA Europa League
libertadores.png    → Copa Libertadores
sudamericana.png    → Copa Sudamericana
mundial.png         → Copa del Mundo (FIFA)
copa-america.png    → Copa América
eurocopa.png        → Eurocopa
mundial-clubes.png  → Mundial de Clubes
premier.png         → Premier League (trofeo)
laliga.png          → LaLiga
serie-a.png         → Serie A (Scudetto)
bundesliga.png      → Bundesliga
ligue1.png          → Ligue 1
brasileirao.png     → Brasileirão
liga-arg.png        → Liga Profesional Argentina
liga-uy.png         → Campeonato Uruguayo
liga-generico.png   → (trofeo genérico para ligas sin imagen)
copa-generico.png   → (copa genérica para copas sin imagen)
bota-oro.png        → Bota de Oro (goleador)
balon-oro.png       → Balón de Oro (mejor jugador)
```

---

## 📁 CARPETA 3 — "fotos jugadores trivia" (img/trivia/jugadores)
Para la Trivia "adiviná el jugador por foto". Foto de la cara/figura, fondo cualquiera.
Nombre = nombre del jugador en minúsculas con guiones. Ejemplos:
```
messi.png, cristiano.png, maradona.png, pele.png, ronaldinho.png, neymar.png,
mbappe.png, haaland.png, suarez.png, cavani.png, forlan.png, ...
```
(Mandá las que quieras; yo armo las preguntas con las que subas. Cuantas más, mejor.)

---

## 📁 CARPETA 4 — "imagenes decisiones carrera" (img/carrera/decisiones)
Una imagen por TIPO de situación del Modo Carrera (Canchero Leyenda). Ilustrativa, estilo
Canchero (verde/oscuro). Nombre de archivo → situación:
```
potrero.jpg         → picado en el potrero / fútbol callejero
ojeador.jpg         → un ojeador en la tribuna
fichaje.jpg         → firma de contrato / fichaje
renovacion.jpg      → renovación de contrato
prestamo.jpg        → salir a préstamo
transferencia.jpg   → transferencia a otro club
lesion.jpg          → lesión / camilla
joda.jpg            → salida nocturna / joda
prensa.jpg          → conferencia de prensa / periodistas
representante.jpg   → reunión con el representante
tecnico.jpg         → charla con el técnico (cambio de posición)
familia.jpg         → tema familiar
casamiento.jpg      → boda / pareja
inversion.jpg       → negocio / inversión
hincha.jpg          → hincha / situación con la gente
seleccion.jpg       → citación a la selección
titulo.jpg          → festejo de título
final.jpg           → final / penal decisivo
mentoria.jpg        → mentoría a un juvenil
mercado.jpg         → valor de mercado / negociación
```

---

## 📁 CARPETA 5 — "fondos juegos" (img/carrera/fondos)  (opcional)
Fondos de pantalla para intro y pasos del juego (elegir edad, identidad). ~1280×720.
```
intro-carrera.jpg   → portada del inicio de Canchero Leyenda
elegir-edad.jpg     → fondo pantalla de duración/edad
hub-carrera.jpg     → fondo del hub de carrera (sutil, oscuro)
```

---

## Cómo entregarlo
Poné cada carpeta con esos nombres exactos y avisame. Yo:
1. Copio todo a `img/clubs`, `img/trofeos`, `img/trivia/jugadores`, `img/carrera/...`.
2. Conecto los escudos a Canchero Leyenda (reemplazan los bloques de iniciales) y a la Trivia.
3. Conecto trofeos a la vitrina + animación de título.
4. Armo preguntas de Trivia con las fotos de jugadores.
5. Pongo la imagen que corresponde en cada decisión de la carrera.

Lo que NO subas, queda con el fallback actual (iniciales / ícono) hasta que lo tengas.
