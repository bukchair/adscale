/**
 * Type stubs for Next.js modules used in the app but not installed.
 * The project runs on Vite; these stubs satisfy TypeScript without importing Next.js.
 */

declare module "next" {
  export interface NextConfig {
    [key: string]: unknown;
  }
  export interface Metadata {
    title?: string;
    description?: string;
    [key: string]: unknown;
  }
}

declare module "next/navigation" {
  export function useRouter(): {
    push(href: string): void;
    replace(href: string): void;
    back(): void;
    forward(): void;
    refresh(): void;
    prefetch(href: string): void;
  };
  export function useSearchParams(): URLSearchParams;
  export function usePathname(): string;
  export function redirect(href: string): never;
  export function notFound(): never;
}

declare module "next-auth" {
  export interface Session {
    user?: {
      id?: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    expires: string;
    [key: string]: unknown;
  }
  export interface NextAuthConfig {
    providers?: unknown[];
    callbacks?: Record<string, unknown>;
    pages?: Record<string, string>;
    secret?: string;
    session?: Record<string, unknown>;
    [key: string]: unknown;
  }
  export interface NextAuthResult {
    handlers: unknown;
    auth: unknown;
    signIn: unknown;
    signOut: unknown;
  }
  export default function NextAuth(config: NextAuthConfig): NextAuthResult;
}

declare module "next-auth/react" {
  import type { Session } from "next-auth";
  export function SessionProvider(props: {
    children: React.ReactNode;
    session?: Session | null;
  }): JSX.Element;
  export function useSession(): {
    data: Session | null;
    status: "loading" | "authenticated" | "unauthenticated";
  };
  export function signIn(
    provider?: string,
    options?: Record<string, unknown>
  ): Promise<{ error?: string; ok?: boolean; url?: string } | undefined>;
  export function signOut(options?: Record<string, unknown>): Promise<void>;
}

declare module "next-auth/providers/google" {
  function GoogleProvider(options: {
    clientId: string;
    clientSecret: string;
    authorization?: Record<string, unknown>;
    [key: string]: unknown;
  }): unknown;
  export default GoogleProvider;
}
