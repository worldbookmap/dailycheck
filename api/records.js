const DEFAULT_FILE_PATH = "data/dailycheck-data.json";

function base64EncodeUtf8(text) {
  return Buffer.from(text, "utf8").toString("base64");
}

function base64DecodeUtf8(text) {
  return Buffer.from(text, "base64").toString("utf8");
}

function githubConfig() {
  return {
    owner: process.env.GITHUB_OWNER || "worldbookmap",
    repo: process.env.GITHUB_REPO || "dailycheck",
    branch: process.env.GITHUB_BRANCH || "main",
    filePath: process.env.GITHUB_FILE_PATH || DEFAULT_FILE_PATH,
    token: process.env.GITHUB_TOKEN || ""
  };
}

function githubHeaders(token) {
  const headers = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function encodePath(path) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

async function fetchGitHubFileMeta(config) {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodePath(config.filePath)}?ref=${encodeURIComponent(config.branch)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: githubHeaders(config.token)
  });

  if (response.status === 404) {
    return { sha: null, payload: { version: 1, updatedAt: new Date().toISOString(), records: {} } };
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`GitHub read failed: ${message}`);
  }

  const data = await response.json();
  const text = base64DecodeUtf8((data.content || "").replace(/\n/g, ""));
  const parsed = JSON.parse(text);

  return {
    sha: data.sha,
    payload: parsed
  };
}

async function updateGitHubFile(config, nextPayload, currentSha) {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodePath(config.filePath)}`;
  const body = {
    message: `Update dailycheck data at ${new Date().toISOString()}`,
    content: base64EncodeUtf8(JSON.stringify(nextPayload, null, 2)),
    branch: config.branch
  };

  if (currentSha) {
    body.sha = currentSha;
  }

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      ...githubHeaders(config.token),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`GitHub update failed: ${message}`);
  }

  return response.json();
}

export default async function handler(req, res) {
  const config = githubConfig();

  if (req.method === "GET") {
    try {
      const { payload } = await fetchGitHubFileMeta(config);
      return res.status(200).json(payload);
    } catch (error) {
      return res.status(500).send(error.message || "Failed to fetch records");
    }
  }

  if (req.method === "POST") {
    if (!config.token) {
      return res.status(500).send("Missing GITHUB_TOKEN on server");
    }

    try {
      const incoming = req.body && typeof req.body === "object" ? req.body : {};
      const nextPayload = {
        version: 1,
        updatedAt: new Date().toISOString(),
        records: incoming.records && typeof incoming.records === "object" ? incoming.records : {}
      };

      const { sha } = await fetchGitHubFileMeta(config);
      const result = await updateGitHubFile(config, nextPayload, sha);

      return res.status(200).json({ ok: true, commit: result.commit?.sha || null });
    } catch (error) {
      return res.status(500).send(error.message || "Failed to save records");
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).send("Method Not Allowed");
}
