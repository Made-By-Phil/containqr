# GEMINI.md

## Project Overview

This is a web application for managing "containers" of items. It's built with React, Vite, TypeScript, and Tailwind CSS. The application allows users to create, view, search, and filter containers. Each container has a name, location, a list of items, and other properties. The UI is built with shadcn-ui and the application uses `@tanstack/react-query` for data fetching.

The project is structured as follows:

-   `src/components`: Contains reusable React components.
-   `src/pages`: Contains the main pages of the application.
-   `src/data`: Contains mock data for the application.
-   `src/types`: Contains TypeScript type definitions.
-   `src/lib`: Contains utility functions.
-   `public`: Contains static assets.

## Building and Running

### Prerequisites

-   Node.js and npm

### Development

To run the application in development mode, use the following command:

```sh
npm run dev
```

This will start a development server on `http://localhost:8080`.

### Building

To create a production build of the application, use the following command:

```sh
npm run build
```

The build output will be located in the `dist` directory.

### Testing

To run the tests, use the following command:

```sh
npm run test
```

### Linting

To lint the codebase, use the following command:

```sh
npm run lint
```

## Development Conventions

-   The project uses TypeScript for static typing.
-   Styling is done with Tailwind CSS and shadcn-ui.
-   The project uses `eslint` for linting.
-   The project uses `vitest` and `@testing-library/react` for testing.
-   The project follows the standard file structure for a Vite + React application.
-   Path aliases are configured to use `@` for the `src` directory.
