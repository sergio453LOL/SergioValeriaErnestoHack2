# Log Pose Console — Los Caramandungas (TEAM-028)

Consola en React + TypeScript para la Guild de Cazarrecompensas (Hackathon Frontend CS2031).

## Integrantes

| Nombre | Código |
|:--|:--|
| Sergio Rojas | 202XXXXXXX |
| Valeria Ayala | 202XXXXXXX |
| Ernesto Corzo | 202310441 |

## Stack

React, TypeScript estricto, Vite, React Router, Tailwind CSS y Axios.

## Cómo ejecutar

Requisitos: Node 24 LTS y npm.

```bash
npm install
cp .env.example .env
npm run dev
```

La app lee la URL de la API desde `VITE_API_BASE_URL` (ver `.env.example`).

Build de producción:

```bash
npm run build
```

## Rutas

| Ruta | Descripción |
|:--|:--|
| `/register` | Registro de la tripulación |
| `/login` | Inicio de sesión |
| `/` | Dashboard con indicadores y estado del Log Pose |
| `/wanted` | Carteles de "Se Busca" con paginación, filtros, búsqueda y orden en la URL |
| `/wanted/:id` | Detalle de un cartel |
