import "server-only"
import { features } from "@/config/env"
import type { OAuthProvider } from "@/core/auth/oauth-ports"

import { googleOAuthProvider } from "./google.provider"
import { githubOAuthProvider } from "./github.provider"

export type OAuthProviderName = "google" | "github"

export function getOAuthProvider(name: string): OAuthProvider | null {
  if (name === "google") return features.oauthGoogle ? googleOAuthProvider : null
  if (name === "github") return features.oauthGithub ? githubOAuthProvider : null
  return null
}
