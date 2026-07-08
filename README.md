
  # Information Display Dashboard

  This is a code bundle for Information Display Dashboard. The original project is available at https://www.figma.com/design/51DLnmBYKYHQSsM8VZU0z8/Information-Display-Dashboard.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## GitHub Pages Deployment

  This repository is configured for GitHub Pages project deployment at:

  - `https://fitz117.github.io/InformationDisplayDashboard/`

  ### Before pushing

  1. Create a GitHub repository named `InformationDisplayDashboard` under the `Fitz117` account.
  2. In GitHub, open `Settings` -> `Pages` and set `Source` to `GitHub Actions`.
  3. In GitHub, open `Settings` -> `Secrets and variables` -> `Actions`.
  4. Add these repository secrets:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

  ### Local environment

  Copy `.env.example` to `.env.local` and fill in your Supabase values.

  ### Deploy

  Push to the `main` branch. GitHub Actions will build the app and publish the `dist` folder to GitHub Pages automatically.
  
