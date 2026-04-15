// src/pages/_app.tsx
// Wrap all pages with AuthProvider so auth state is available everywhere

import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AuthProvider } from '@/context/AuthContext';
// import Navbar from '@/components/navbar';
import '@/styles/globals.css';
// Pages where Navbar should NOT appear
const NO_NAVBAR_ROUTES = ['/auth/login', '/auth/register'];

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const showNavbar = !NO_NAVBAR_ROUTES.includes(router.pathname);

  return (
    <AuthProvider>
      <Head>
        <link rel="icon" type="image/png" href="/logo.png" />
      </Head>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
