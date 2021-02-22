let allPages = [];
let allProblems = [];

function downloadObject(obj, filename) {
  obj = JSON.stringify(obj, undefined, 4);

  var blob = new Blob([obj], { type: "text/json" }),
    a = document.createElement("a");

  a.download = filename;
  a.href = window.URL.createObjectURL(blob);
  a.dataset.downloadurl = ["text/json", a.download, a.href].join(":");
  a.click();
}

let validProblem = (problem) =>
  problem.includes("Problems/Problem") &&
  problem.match(/^\d{4}/) &&
  problem.match(/\d+$/);

let computeTest = (problem) =>
  problem
    .match(/(\d{4} )(.*)( Problems)/)[2]
    .replace(/AMC ((?:10)|(?:12))[AB]/, "AMC $1")
    .replace(/AIME I+/, "AIME")
    .replace(/AJHSME/, "AMC 8");
let computeYear = (problem) => problem.match(/^\d{4}/)[0];
let computeNumber = (problem) => problem.match(/\d+$/)[0];

let sortProblems = (problems) => {
  let sorted = problems.sort((a, b) => {
    switch (Math.sign(computeYear(a) - computeYear(b))) {
      case -1:
        return -1;
      case 1:
        return 1;
      case 0:
        switch (computeTest(a).localeCompare(computeTest(b))) {
          case -1:
            return -1;
          case 1:
            return 1;
          case 0:
            return Math.sign(computeNumber(a) - computeNumber(b));
        }
    }
  });
  return sorted;
};

console.log("Preloading all wiki pages, allow around 15 seconds...");
let apiEndpoint = "https://artofproblemsolving.com/wiki/api.php";
let params = `action=query&list=allpages&aplimit=max&format=json`;
let paramsContinue;

let response = await fetch(`${apiEndpoint}?${params}&origin=*`);
let json = await response.json();

for (let page of json.query.allpages) {
  if (page.title.charAt(0) !== "/") allPages.push(page.title);
  if (validProblem(page.title)) allProblems.push(page.title);
}

while (json?.continue) {
  console.log(`${Math.round((allPages.length / 13500) * 100)}% loaded...`);
  paramsContinue = params + `&apcontinue=${json.continue.apcontinue}`;
  response = await fetch(`${apiEndpoint}?${paramsContinue}&origin=*`);
  json = await response.json();

  for (let page of json.query.allpages) {
    if (page.title.charAt(0) !== "/") allPages.push(page.title);
    if (validProblem(page.title)) allProblems.push(page.title);
  }
}

console.log(`Finished loading Special:AllPages (${allPages.length} pages).`);

allProblems = sortProblems(allProblems);

downloadObject(allPages, "allpages.json");
downloadObject(allProblems, "allproblems.json");
