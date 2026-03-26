# Biblioteca

A fantasy book library generator for tabletop RPG sessions, creative writing, and worldbuilding. Generates random atmospheric descriptions of imaginary books using an oracle system — genre, era, binding material, color, scent, and decorative style.

All output is in Spanish.

## What it does

Running `biblioteca.php` calls the `oraculo()` function multiple times to randomly pick values from thematic tables and outputs an atmospheric description like:

```
Visualiza una biblioteca Fantasy en la epoca Medieval
Visualiza un libro con las siguientes caracteristicas:
Encuadernacion: Piel humana
Color: Negro
Olor: Tierra mojada
Estilo: Grabados dorados
```

It also includes RPG dice mechanics for **Ironsworn** and **Blue Beard** systems, useful for resolving actions during tabletop sessions.

## Tech stack

- PHP 8 (FPM)
- Nginx (reverse proxy)
- MariaDB
- Docker / Docker Compose

## Getting started

```bash
docker compose up
```

Then visit [http://localhost](http://localhost).

## Project structure

| File | Purpose |
|------|---------|
| `app/biblioteca.php` | Core logic: dice rolls, RPG mechanics, oracle tables, book generation |
| `app/index.php` | Entry point |
| `compose.yaml` | Docker Compose config (Nginx, PHP-FPM, MariaDB) |
| `Dockerfile` | PHP-FPM image with PDO MySQL and XDebug |
| `nginx.conf` | Nginx server config routing PHP requests to FPM |

## RPG mechanics

Two action roll systems are implemented:

- **Ironsworn** (`hacerTiradaIronSworn($atributo)`): rolls `attribute + d6` against two d10s. Returns `H` (hit), `W` (weak hit), or `M` (miss).
- **Blue Beard** (`hacerTiradaBlueBeard($atributo)`): rolls `2d6 + attribute`, compared against thresholds 7 and 9. Returns `H`, `W`, or `M`.

Both include simulation modes (`modoIron()`, `modoBlue()`) that run 1000 rolls and print hit/weak/miss statistics.

## Oracle tables

The book generator draws from these categories:

| Category | Examples |
|----------|---------|
| Género (genre) | Fantasy, XXXPunk, Mitos de Cthulhu, Sobrenatural, Romance, Investigación |
| Época (era) | Antigua, Medieval, Renacimiento, Victoriana, Contemporánea, Futura |
| Encuadernación (binding) | Piel humana, Cuero, Hueso, Cartón, Madera, Terciopelo |
| Color | Negro, Rojo, Morado, Verde, Azul, Blanco |
| Olor (scent) | Flores silvestres, Mar, Tierra mojada, Especias, Fruta podrida, Madera quemada |
| Estilo | Grabados dorados, Ilustraciones, Relieves en hueso, Tela bordada, … |
