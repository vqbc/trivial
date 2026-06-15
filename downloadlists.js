import fetch from "node-fetch";
import fs from "fs";

(async () => {

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url) {
  const proxyApiKey = process.env.Proxy_API_Key;

  if (!proxyApiKey) {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Direct fetch failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  const maxAttempts = 6;
  const retryableStatuses = new Set([429, 500, 503, 520]);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch("https://api.zyte.com/v1/extract", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${proxyApiKey}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        httpResponseBody: true,
      }),
    });

    if (response.ok) {
      const data = await response.json();

      if (data.statusCode && data.statusCode >= 400) {
        throw new Error(`AoPS fetch through Zyte failed: ${data.statusCode}`);
      }

      const body = Buffer.from(
        data.httpResponseBody,
        "base64"
      ).toString("utf8");

      return JSON.parse(body);
    }

    const status = response.status;
    const errorText = await response.text();

    if (!retryableStatuses.has(status) || attempt === maxAttempts) {
      throw new Error(
        `Zyte API failed after ${attempt} attempt(s): ${status} ${errorText}`
      );
    }

    const exponentialDelay = 1000 * 2 ** (attempt - 1);
    const jitter = Math.floor(Math.random() * 1000);
    const delay = Math.min(exponentialDelay + jitter, 30000);

    console.warn(
      `Zyte returned ${status}. Retrying in ${Math.round(
        delay / 1000
      )} seconds (attempt ${attempt + 1}/${maxAttempts})...`
    );

    await sleep(delay);
  }
}

  let allPages = [];
  let allProblems = [];
  let numPages = 18500;

  let validProblem = (problem) =>
    problem.match(/^\d{4} .* Problems\/Problem [A-Z]?\d+$/);

  let computeTest = (problem) =>
    problem
      .match(/(\d{4} )(.*)( Problems)/)[2]
      .replace(/AMC ((?:10)|(?:12))[AB]/, "AMC $1")
      .replace(/AIME I+/, "AIME")
      .replace(/AJHSME/, "AMC 8");
  let computeYear = (problem) => problem.match(/^\d{4}/)[0];
  let computeNumber = (problem) => problem.match(/\d+$/)[0];

  let sortProblems = (problems) =>
    problems.sort(
      (a, b) =>
        Math.sign(computeYear(a) - computeYear(b)) ||
        computeTest(a).localeCompare(computeTest(b)) ||
        Math.sign(computeNumber(a) - computeNumber(b))
    );

  console.log("Preloading all wiki pages, allow around 15 seconds...");
  const apiEndpoint = "https://artofproblemsolving.com/wiki/api.php";

  function buildApiUrl(apcontinue) {
    const url = new URL(apiEndpoint);

    const params = new URLSearchParams({
      action: "query",
      list: "allpages",
      aplimit: "max",
      format: "json",
      origin: "*",
    });

    if (apcontinue !== undefined) {
      params.set("apcontinue", apcontinue);
    }

    url.search = params.toString();
    return url.toString();
  }

  let json = await fetchJson(buildApiUrl());

  for (let page of json.query.allpages) {
    if (page.title.charAt(0) !== "/") allPages.push(page.title);
    if (validProblem(page.title)) allProblems.push(page.title);
  }

  while (json?.continue) {
    console.log(`${Math.round((allPages.length / numPages) * 100)}% loaded...`);
    json = await fetchJson(buildApiUrl(json.continue.apcontinue));

    for (let page of json.query.allpages) {
      if (page.title.charAt(0) !== "/") allPages.push(page.title);
      if (validProblem(page.title)) allProblems.push(page.title);
    }
  }

  console.log(`Finished loading Special:AllPages (${allPages.length} pages).`);

  allProblems = sortProblems(allProblems);

  try {
    fs.writeFileSync(
      "public/data/allpages.json",
      JSON.stringify(allPages, undefined, 2)
    );
    fs.writeFileSync(
      "public/data/allproblems.json",
      JSON.stringify(allProblems, undefined, 2)
    );
  } catch (err) {
    console.error(err);
  }
  try {
    let roundedLength = Math.ceil(allPages.length / 500) * 500;
    let code = fs.readFileSync("downloadlists.js", "utf8");
    code = code.replace(
      /let numPages = \d*?;/,
      `let numPages = ${roundedLength};`
    );
    fs.writeFileSync("downloadlists.js", code);
  } catch (err) {
    console.error(err);
  }
})();