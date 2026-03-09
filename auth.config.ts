import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// Login uses only basic scopes — no restricted/sensitive scopes that require Google verification.
// Platform connections (Ads, Analytics, Search Console, Gmail) use a separate OAuth flow
// via /api/auth/google-connect which requests the extended scopes independently.
const LOGIN_SCOPES = "openid email profile";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope: LOGIN_SCOPES,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.googleId    = (profile as { sub?: string }).sub ?? token.sub;
        token.picture     = (profile as { picture?: string }).picture ?? token.picture;
        token.name        = (profile as { name?: string }).name ?? token.name;
        token.email       = (profile as { email?: string }).email ?? token.email;
        // Store access_token so auth-callback can connect Google platforms
        token.accessToken  = account.access_token  as string | undefined;
        token.refreshToken = account.refresh_token as string | undefined;
        token.scope        = account.scope         as string | undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id    = (token.googleId as string) ?? (token.sub as string);
        session.user.image = token.picture as string;
        session.user.name  = token.name as string;
        session.user.email = token.email as string;
        // Expose tokens to client so auth-callback can save connections
        (session as any).accessToken  = token.accessToken;
        (session as any).refreshToken = token.refreshToken;
        (session as any).scope        = token.scope;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // After Google sign-in, always go through auth-callback for setup
      if (url.includes("/api/auth/callback/google")) return `${baseUrl}/auth-callback`;
      if (url.startsWith(baseUrl)) return url;
      return `${baseUrl}/auth-callback`;
    },
  },
  secret: process.env.NEXTAUTH_SECRET ?? "bscale-dev-secret-change-in-production",
  session: { strategy: "jwt" },
});

