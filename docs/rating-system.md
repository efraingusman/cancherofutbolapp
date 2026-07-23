# Sistema de valoración del jugador

## Para qué existe

La valoración (`/100`) era decorativa: todos nacían en 50 y nada la movía. Ahora
se **gana jugando**, y sirve para algo concreto: que un jugador encuentre partidos
de su nivel y que los equipos se armen parejos.

## Regla de oro: nunca baja

La valoración **solo sube**. Si el cálculo diera menos que el valor actual, se
mantiene el actual.

Es una decisión de producto, no un descuido: ver bajar un número que ya te
mostraron se siente como un castigo y desalienta. Alguien que juega mal
simplemente sube más lento.

Consecuencia: un jugador inactivo conserva su valoración. Si en el futuro se
quiere que la inactividad pese, hay que hacerlo con otra señal (por ejemplo,
"últimos 90 días") y **no** bajando este número.

## Fórmula

```
puntos = partidos × 1
       + goles × 1.5
       + asistencias × 1
       + mvp × 3

valoración = min(99, 50 + redondear(puntos))
```

Arranca en **50** y el techo es **99**.

### Por qué esos pesos

| Qué | Peso | Por qué |
|---|---|---|
| Partido jugado | 1 | Premia presentarse. Es lo que más queremos que pase. |
| Gol | 1.5 | Vale más que presentarse, pero no tanto como para que solo suban los delanteros. |
| Asistencia | 1 | Igual que un partido: el que la da también genera. |
| MVP | 3 | Lo eligen los demás; es la señal más honesta de que jugaste bien. |

El MVP pesa el triple justamente porque **no es autorreportado**.

### Ejemplo

Un jugador con 10 partidos, 5 goles, 3 asistencias y 1 MVP:

```
puntos = 10 + 7.5 + 3 + 3 = 23.5
valoración = 50 + 24 = 74
```

## Niveles

Los niveles se derivan de la valoración y son los que se usan para filtrar
partidos:

| Nivel | Valoración |
|---|---|
| Principiante | 50 – 59 |
| Intermedio | 60 – 74 |
| Avanzado | 75 – 89 |
| Crack | 90 – 99 |

Un partido puede declarar el nivel que busca (`matches.skill_level`). Si no lo
declara, aparece para todos: **no se esconde un partido por no tener el dato**.

## De dónde salen los números

Todo sale de `users.stats`, que ya se actualiza sola cuando:

- se carga un gol o una asistencia en un partido (`_fBumpStat`, en
  `canchero-match-v2.js`);
- se cargan eventos de un torneo (`_bumpUserStats`, en
  `canchero-tournaments.js`);
- una organización había cargado a un jugador a mano y esa persona se registra
  después con el mismo email (`claimPendingPlayerData`).

Nada de esto se edita a mano: **no hay ni hubo** una pantalla para escribirse la
valoración uno mismo. Lo único editable del perfil es la posición.

## Dónde vive

`canchero-rating.js`:

- `CancheroRating.calcular(stats)` → valoración a partir de las estadísticas
- `CancheroRating.nivel(valoracion)` → `{ id, label, min, max }`
- `CancheroRating.sincronizar(email)` → recalcula y guarda si subió
- `CancheroRating.balancear(jugadores)` → reparte en dos equipos parejos

## Balance de equipos

`balancear()` ordena a los jugadores de mayor a menor valoración y los reparte
en serpiente (1→A, 2→B, 3→B, 4→A, 5→A...). Es sencillo y da diferencias chicas,
que es lo que importa en un partido de amigos. No busca el óptimo perfecto:
busca que no queden todos los buenos de un lado.
