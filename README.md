Welcome to your new TanStack Start app!

# Getting Started

To run this application:

```bash
pnpm install
pnpm dev
```

# Building For Production

To build this application for production:

```bash
pnpm build
```

## Testing

This project uses [Vitest](https://vitest.dev/) for testing. You can run the tests with:

```bash
pnpm test
```

## Turtle Ingestion

To run the full Turtle pipeline (`raw -> normalize -> import`):

```bash
pnpm ingest:turtle
```

Note: `ingest:turtle` runs in dry-run mode by default and only writes
`data/turtle/catalog.import-payload.json` and `data/turtle/catalog.import-report.json`.

To run the same pipeline and persist into Convex (idempotent upsert mutations):

```bash
pnpm ingest:turtle:persist
```

To skip network fetch and rebuild from existing raw files:

```bash
pnpm ingest:turtle:no-fetch
```

To skip fetch and persist into Convex:

```bash
pnpm ingest:turtle:no-fetch:persist
```

To run the full operator flow (sync WoW icons, index/verify, then turtle ingest):

```bash
pnpm ingest:turtle:full
```

To run the full operator flow and persist into Convex:

```bash
pnpm ingest:turtle:full:persist
```

## WoW Icons

This project mirrors all icon assets from:

`https://gitlab.com/razzeee/gear-planner/-/tree/main/public/wow-icons?ref_type=heads`

Icon workflow commands:

```bash
pnpm icons:wow:sync
pnpm icons:wow:index
pnpm icons:wow:verify
pnpm icons:wow:all
```

- `sync`: downloads and mirrors all remote icon files into `public/wow-icons`.
- `index`: generates `public/wow-icons/icon-index.json` for normalized key lookups.
- `verify`: compares local icon set against the GitLab tree to ensure parity.

## Backend Mode

By default, the app uses local snapshot state.

Optional environment flags:

```bash
VITE_CONSUME_BACKEND=convex
VITE_CONVEX_URL=https://<your-deployment>.convex.cloud
```

Current status: when `convex` is requested and URL is present, consume state uses Convex bridge APIs (`...ByExternalId` queries/mutations in `convex/guildWorkspace.ts`) for live sync.

If you are signed out, the UI falls back to local preview state until authentication is established.

## Auth

Convex auth is configured for Discord OAuth only (no anonymous fallback).

Required backend env:

```bash
CONVEX_SITE_URL=https://<your-deployment>.convex.site
SITE_URL=http://localhost:3000
AUTH_DISCORD_ID=<discord-client-id>
AUTH_DISCORD_SECRET=<discord-client-secret>
JWT_PRIVATE_KEY=<pkcs8-private-key>
JWKS=<json-web-key-set>
```

To configure auth env vars and keys for your deployment, run:

```bash
npx @convex-dev/auth
```

When Convex mode is enabled in the frontend, header controls use Discord sign-in/sign-out and show the authenticated account identity/provider. Guild workspace Convex mutations and queries derive user identity from auth instead of caller-provided user IDs.

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

### Removing Tailwind CSS

If you prefer not to use Tailwind CSS:

1. Remove the demo pages in `src/routes/demo/`
2. Replace the Tailwind import in `src/styles.css` with your own styles
3. Remove `tailwindcss()` from the plugins array in `vite.config.ts`
4. Uninstall the packages: `pnpm add @tailwindcss/vite tailwindcss --dev`

## Linting & Formatting


This project uses [eslint](https://eslint.org/) and [prettier](https://prettier.io/) for linting and formatting. Eslint is configured using [tanstack/eslint-config](https://tanstack.com/config/latest/docs/eslint). The following scripts are available:

```bash
pnpm lint
pnpm format
pnpm check
```



## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add a new file in the `./src/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from "@tanstack/react-router";
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you render `{children}` in the `shellComponent`.

Here is an example layout that includes a header:

```tsx
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'My App' },
    ],
  }),
  shellComponent: ({ children }) => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header>
          <nav>
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
          </nav>
        </header>
        {children}
        <Scripts />
      </body>
    </html>
  ),
})
```

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Server Functions

TanStack Start provides server functions that allow you to write server-side code that seamlessly integrates with your client components.

```tsx
import { createServerFn } from '@tanstack/react-start'

const getServerTime = createServerFn({
  method: 'GET',
}).handler(async () => {
  return new Date().toISOString()
})

// Use in a component
function MyComponent() {
  const [time, setTime] = useState('')

  useEffect(() => {
    getServerTime().then(setTime)
  }, [])

  return <div>Server time: {time}</div>
}
```

## API Routes

You can create API routes by using the `server` property in your route definitions:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'

export const Route = createFileRoute('/api/hello')({
  server: {
    handlers: {
      GET: () => json({ message: 'Hello, World!' }),
    },
  },
})
```

## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/people')({
  loader: async () => {
    const response = await fetch('https://swapi.dev/api/people')
    return response.json()
  },
  component: PeopleComponent,
})

function PeopleComponent() {
  const data = Route.useLoaderData()
  return (
    <ul>
      {data.results.map((person) => (
        <li key={person.name}>{person.name}</li>
      ))}
    </ul>
  )
}
```

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).

# Demo files

Files prefixed with `demo` can be safely deleted. They are there to provide a starting point for you to play around with the features you've installed.

# Learn More

You can learn more about all of the offerings from TanStack in the [TanStack documentation](https://tanstack.com).

For TanStack Start specific documentation, visit [TanStack Start](https://tanstack.com/start).
