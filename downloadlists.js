import fetch from "node-fetch";
import fs from "fs";

(async () => {

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

  if (!response.ok) {
    throw new Error(`Zyte API failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();

  if (data.statusCode && data.statusCode >= 400) {
    throw new Error(`AoPS fetch through Zyte failed: ${data.statusCode}`);
  }

  const body = Buffer.from(data.httpResponseBody, "base64").toString("utf8");
  return JSON.parse(body);
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
  let apiEndpoint = "https://artofproblemsolving.com/wiki/api.php";
  let params = `action=query&list=allpages&aplimit=max&format=json`;
  let paramsContinue;

  let json = await fetchJson(`${apiEndpoint}?${params}&origin=*`);

  for (let page of json.query.allpages) {
    if (page.title.charAt(0) !== "/") allPages.push(page.title);
    if (validProblem(page.title)) allProblems.push(page.title);
  }

  while (json?.continue) {
    console.log(`${Math.round((allPages.length / numPages) * 100)}% loaded...`);
    paramsContinue = params + `&apcontinue=${json.continue.apcontinue}`;
    json = await fetchJson(`${apiEndpoint}?${paramsContinue}&origin=*`);

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
