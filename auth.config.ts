import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.googleId = (profile as { sub?: string }).sub ?? token.sub;
        token.picture = (profile as { picture?: string }).picture ?? token.picture;
        token.name = (profile as { name?: string }).name ?? token.name;
        token.email = (profile as { email?: string }).email ?? token.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.googleId as string) ?? (token.sub as string);
        session.user.image = token.picture as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
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
  secret: process.env.NEXTAUTH_SECRET ?? "adscale-dev-secret-change-in-production",
  session: { strategy: "jwt" },
});
