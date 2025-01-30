import NextAuth, { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";

import { logger } from "@/services/logger";
export const authOptions: NextAuthOptions = {
  // Configure one or more authentication providers
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_SECRET || "",
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_SECRET || "",
    }),
    // ...add more providers here
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile, email }) {
      if (email === process.env.ALLOWED_USERS) {
        logger.info("User allowed to sign in");

        return true;
      }
      logger.error(
        `User ${email} not allowed to sign in as they are not in the allowed users list ${process.env.ALLOWED_USERS}`,
      );
      logger.error(`User object: ${JSON.stringify(user)}`);
      logger.error(`Account object: ${JSON.stringify(account)}`);
      logger.error(`Profile object: ${JSON.stringify(profile)}`);

      return false;
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
      }

      logger.info(`JWT callback: ${token.email}`);
      logger.info(`User object: ${JSON.stringify(user)}`);

      return token;
    },
  },
};

export default NextAuth(authOptions);
