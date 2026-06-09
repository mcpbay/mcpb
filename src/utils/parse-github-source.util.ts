export function isGitHubUrl(source: string): boolean {
  if (source.startsWith("github://") || source.startsWith("git@github.com:")) {
    return true;
  }

  try {
    const parsed = new URL(source);
    return parsed.hostname === "github.com" || parsed.hostname === "www.github.com";
  } catch {
    return false;
  }
}

export function toGithubUri(source: string): string {
  if (source.startsWith("github://")) {
    return source;
  }

  if (source.startsWith("git@github.com:")) {
    return source
      .replace("git@github.com:", "github://")
      .replace(/\.git(?=\/|$)/, "");
  }

  const parsed = new URL(source);
  const parts = parsed.pathname.replace(/^\/+/, "").replace(/\.git$/, "").split("/");

  if (parts.length < 2) {
    throw new Error(
      `Invalid GitHub URL: "${source}". Expected format: https://github.com/owner/repo[/tree/branch][/path]`,
    );
  }

  const owner = parts[0];
  const repo = parts[1];
  const rest = parts.slice(2).join("/");

  return `github://${owner}/${repo}${rest ? `/${rest}` : ""}`;
}
