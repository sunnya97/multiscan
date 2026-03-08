import { Env } from "./chains";

const GITHUB_API = "https://api.github.com";
const REPO = "sunnya97/multiscan";
const LABEL = "network-suggestion";

function githubHeaders(env: Env): Record<string, string> {
  return {
    Authorization: `token ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "multiscan-worker",
  };
}

export interface CheckResult {
  exists: boolean;
  issueNumber?: number;
  issueTitle?: string;
  issueUrl?: string;
  reactions?: number;
}

export interface CreateResult {
  created: boolean;
  issueNumber?: number;
  issueUrl?: string;
  existingIssue?: { number: number; url: string; title: string };
}

export async function checkExistingSuggestion(
  networkName: string,
  env: Env,
): Promise<CheckResult> {
  const url = `${GITHUB_API}/repos/${REPO}/issues?state=open&labels=${encodeURIComponent(LABEL)}&per_page=100`;
  const resp = await fetch(url, { headers: githubHeaders(env) });

  if (!resp.ok) {
    throw new Error(`GitHub API error: ${resp.status}`);
  }

  const issues = (await resp.json()) as Array<{
    number: number;
    title: string;
    html_url: string;
    reactions: { "+1": number; total_count: number };
  }>;

  const needle = networkName.toLowerCase();
  const match = issues.find((issue) =>
    issue.title.toLowerCase().includes(needle),
  );

  if (match) {
    return {
      exists: true,
      issueNumber: match.number,
      issueTitle: match.title,
      issueUrl: match.html_url,
      reactions: match.reactions["+1"],
    };
  }

  return { exists: false };
}

export async function createSuggestion(
  networkName: string,
  description: string | undefined,
  env: Env,
): Promise<CreateResult> {
  // Check for duplicates first
  const existing = await checkExistingSuggestion(networkName, env);

  if (existing.exists && existing.issueNumber) {
    // Add +1 reaction to existing issue
    const reactionUrl = `${GITHUB_API}/repos/${REPO}/issues/${existing.issueNumber}/reactions`;
    await fetch(reactionUrl, {
      method: "POST",
      headers: {
        ...githubHeaders(env),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: "+1" }),
    });

    return {
      created: false,
      existingIssue: {
        number: existing.issueNumber,
        url: existing.issueUrl!,
        title: existing.issueTitle!,
      },
    };
  }

  // Create new issue
  const body = description
    ? `**Network:** ${networkName}\n\n**Description:** ${description}`
    : `**Network:** ${networkName}`;

  const createUrl = `${GITHUB_API}/repos/${REPO}/issues`;
  const resp = await fetch(createUrl, {
    method: "POST",
    headers: {
      ...githubHeaders(env),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: `Network Suggestion: ${networkName}`,
      body,
      labels: [LABEL],
    }),
  });

  if (!resp.ok) {
    throw new Error(`GitHub API error: ${resp.status}`);
  }

  const issue = (await resp.json()) as {
    number: number;
    html_url: string;
  };

  return {
    created: true,
    issueNumber: issue.number,
    issueUrl: issue.html_url,
  };
}
