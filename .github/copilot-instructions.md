# Bloom Prompt Editor Copilot Instructions

This document provides guidance for AI assistants working on the Bloom Prompt Editor codebase.

## Project Overview

This is a web-based tool for creating, testing, and managing prompts for Large Language Models (LLMs) to aid in the translation and creation of literature for minority languages, specifically in the context of the Bloom project.

The application is a React single-page application (SPA) built with Vite and TypeScript. It uses Supabase for its backend, including database and authentication, and integrates with OpenRouter to run prompts against various LLMs.

## Architecture

- **Frontend**: The frontend is built with React and TypeScript.
  - **UI Components**: We use `shadcn/ui` for our component library. You can find the base components in `src/components/ui`. When adding new UI, please use or adapt these components.
  - **State Management**: Global state, like user settings, is managed through custom hooks such as `useSettings.ts` and `useLocalStorage.ts`. For component-level state, standard React state management is used.
  - **Routing**: The application uses `react-router-dom` for routing. The main pages are in `src/pages`.
- **Backend**: We use Supabase for our database and authentication.
  - **Database Migrations**: Database schema changes are managed with migration files located in `supabase/migrations`. When you need to change the database schema, create a new migration file.
  - **Supabase Client**: The Supabase client is initialized in `src/integrations/supabase/client.ts`.
- **AI Integration**: The application communicates with LLMs via the OpenRouter API.
  - **OpenRouter Client**: The logic for this is in `src/integrations/openrouter/openRouterClient.ts`. This file contains functions for fetching available models and for running prompts.

## Development Workflow

- **Package Manager**: This project uses `npm` for package management.
- **Running the development server**: To run the app locally, use `npm run dev`.
- **Building for production**: To create a production build, use `npm run build`.
- **Linting**: To check for linting errors, run `npm run lint`.

## Key Files and Directories

- `src/App.tsx`: The main application component where routing is set up.
- `src/pages/Index.tsx`: The main page of the application, which contains the primary UI for the prompt editor.
- `src/components/`: Contains the React components.
  - `SettingsTab.tsx`: The component for managing user settings, including the OpenRouter API key.
  - `InputBooksTab.tsx`: The component for handling the input markdown text.
  - `OutputSection.tsx`: The component that displays the output from the LLM.
- `src/integrations/openrouter/openRouterClient.ts`: Handles all communication with the OpenRouter API.
- `src/integrations/supabase/client.ts`: The Supabase client.
- `supabase/migrations/`: Database migration files.
- `package.json`: Defines scripts and dependencies.
- `vite.config.ts`: Vite configuration.
- `tailwind.config.ts`: Tailwind CSS configuration.

## Style

For components that don't need children, use this style:

const Foo = (props: { foo: number }) => {
return <div>{props.foo}</div>;
};

Do not define interfaces and do not destructure props unless necessary. Use the `props` object directly.
