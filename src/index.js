/* eslint-disable no-undef */
function clearProblem() {
  $(".problem-section").remove();
  $(".attribution").remove();
}

function clearAll() {
  $(".options-input-container").remove();
  $(".problem-section").remove();
  $(".attribution").remove();
}

function formatProblem() {
  console.log("Gonna write code later");
}

function fixLinks() {
  $(".article-text a").each(function() {
    let href = $(this).attr("href");
    if (typeof href !== "undefined" && href.charAt(0) === "/")
      $(this).attr("href", `https://artofproblemsolving.com${href}`);
  });
}

function collapseSolutions() {
  $("#solutions-header").click(function() {
    $("#solutions-section").toggleClass("section-collapsed");
  });
}

async function addArticle() {
  $(".options-input-container").after(
    `<div class="problem-section">
      <h2 class="section-header" id="article-header">Article Text</h2>
      <a href="" text="(view on aops)" id="aops-link">(View on the AoPS Wiki)</a>
      <div class="article-text" id="full-text"></div>
    </div>
    <p class="attribution">
      Article content retrieved from the
      <a
        href="https://artofproblemsolving.com/wiki/index.php/"
        text="Art of Problem Solving Wiki"
        >Art of Problem Solving Wiki</a
      >.
    </p>`
  );

  var apiEndpoint = "https://artofproblemsolving.com/wiki/api.php";
  var pagename = $("#find-input .input-field").val();
  var params = `action=parse&page=${pagename}&format=json`;

  const response = await fetch(`${apiEndpoint}?${params}&origin=*`);
  const json = await response.json();

  if (typeof json.parse !== "undefined") {
    var problemText = json.parse.text["*"];
    $(".article-text").html(problemText); // need to sanitize quotes & angles
  } else {
    $(".article-text").html(
      `<p class="error">The page you specified does not exist.</p>`
    );
  }

  $("#article-header").html(pagename);
  $("#aops-link").attr(
    "href",
    `https://artofproblemsolving.com/wiki/index.php/${pagename}`
  );
  return true;
}

async function addProblem(problem) {
  $(".options-input-container").after(
    `<div class="problem-section">
      <h2 class="section-header" id="article-header">Problem Text</h2>
      <a text="(View on the AoPS Wiki)" id="aops-link">(View on the AoPS Wiki)</a>
      <div class="article-text" id="problem-text"></div>
    </div>
    <div class="problem-section section-collapsed" id="solutions-section">
      <h2 class="section-header" id="solutions-header">Solutions</h2>
      <!-- Make collapsible -->
      <div class="article-text" id="solutions-text"></div>
    </div>
    <p class="attribution">
      Article content retrieved from the
      <a
        href="https://artofproblemsolving.com/wiki/index.php/"
        text="Art of Problem Solving Wiki"
        >Art of Problem Solving Wiki</a
      >.
    </p>`
  );
  var apiEndpoint = "https://artofproblemsolving.com/wiki/api.php";
  var pagename = problem;
  var params = `action=parse&page=${pagename}&format=json`;

  const response = await fetch(`${apiEndpoint}?${params}&origin=*`);
  const json = await response.json();

  if (typeof json.parse !== "undefined") {
    var problemText = json.parse.text["*"];
    $(".article-text").html(problemText); // need to sanitize quotes & angles
  } else {
    $(".article-text").html(
      `<p class="error">The page you specified does not exist.</p>`
    );
  }

  $("#article-header").html(pagename);
  $("#aops-link").attr(
    "href",
    `https://artofproblemsolving.com/wiki/index.php/${pagename}`
  );
  return true;
}

async function getPages() {
  let inputSubjects = $("#input-subjects");
  let inputTests = $("#input-tests");
  let inputYears = $("#input-years");
  let inputDiff = $("#input-diff");

  let subjects = JSON.parse(inputSubjects.val());
  let tests = JSON.parse(inputTests.val());
  let yearsFrom = inputYears.data().from;
  let yearsTo = inputYears.data().to;
  let diffFrom = inputDiff.data().from;
  let diffTo = inputDiff.data().to;

  let pages = [];

  if (subjects.some(e => e.value === "(All Subjects)")) {
    let done = false;

    while (!done) {
      let response = await fetch(
        `https://artofproblemsolving.com/wiki/api.php?action=query&list=random&rnnamespace=0&rnlimit=1&format=json&origin=*`
      );
      let json = await response.json();
      if (
        json.query.random[0].title.includes("Problems/Problem") &&
        matchesOptions(
          json.query.random[0].title,
          tests,
          yearsFrom,
          yearsTo,
          diffFrom,
          diffTo
        )
      ) {
        pages.push(json.query.random[0].title);
        done = true;
      }
    }
    /* Slow as fuck
    var apiEndpoint = "https://artofproblemsolving.com/wiki/api.php";
    var params = `action=query&list=allpages&aplimit=max&format=json`;
    var paramsContinue;

    var response = await fetch(`${apiEndpoint}?${params}&origin=*`);
    var json = await response.json();

    for (var j = 0; j < json.query.allpages.length; j++) {
      pages.push(json.query.allpages[j].title);
    }
    while (typeof json.continue !== "undefined") {
      paramsContinue = params + `&apcontinue=${json.continue.apcontinue}`;
      response = await fetch(`${apiEndpoint}?${paramsContinue}&origin=*`);
      json = await response.json();
      for (var k = 0; k < json.query.allpages.length; k++) {
        pages.push(json.query.allpages[k].title);
      }
    }
    */
  } else {
    for (let i = 0, iLength = subjects.length; i < iLength; i++) {
      let apiEndpoint = "https://artofproblemsolving.com/wiki/api.php";
      let pagename = subjects[i].value;
      let params = `action=query&list=categorymembers&cmtitle=Category:${pagename}&cmlimit=max&format=json`;
      let paramsContinue;

      let response = await fetch(`${apiEndpoint}?${params}&origin=*`);
      let json = await response.json();

      function addPagesFromJSON(members) {
        for (let j = 0, jLength = members.length; j < jLength; j++) {
          if (
            matchesOptions(
              members[j].title,
              tests,
              yearsFrom,
              yearsTo,
              diffFrom,
              diffTo
            )
          )
            pages.push(members[j].title);
        }
      }

      if (typeof json.query.categorymembers[0] !== "undefined") {
        addPagesFromJSON(json.query.categorymembers);
        while (typeof json.continue !== "undefined") {
          paramsContinue = params + `&cmcontinue=${json.continue.cmcontinue}`;
          response = await fetch(`${apiEndpoint}?${paramsContinue}&origin=*`);
          json = await response.json();
          addPagesFromJSON(json.query.categorymembers);
        }
      } else {
        console.log(`No problems found in subject ${pagename}.`);
      }
    }
  }
  return pages;
}

function matchesOptions(problem, tests, yearsFrom, yearsTo, diffFrom, diffTo) {
  if (!/^\d{4}.*Problems\/Problem \d+$/.test(problem)) return false;

  let problemTest = problem
    .match(/(\d{4} )(.*)( Problems)/)[2]
    .replace(/AMC ((?:10)|(?:12))[AB]/, "AMC $1")
    .replace(/AIME I+/, "AIME");
  if (
    !tests.some(e => e.value === "(All Tests)") &&
    tests.map(e => e.value).indexOf(problemTest) < 0
  )
    return false;

  let problemYear = problem.match(/^\d{4}/)[0];
  if (problemYear < yearsFrom || yearsTo < problemYear) return false;

  let problemNumber = problem.match(/\d+$/)[0];
  let problemDiff;
  switch (problemTest) {
    case "AMC 8":
      if (problemNumber < 13) {
        problemDiff = 1;
      } else if (problemNumber < 21) {
        problemDiff = 1.5;
      } else {
        problemDiff = 2;
      }
      break;
    case "AMC 10":
      if (problemNumber < 13) {
        problemDiff = 1;
      } else if (problemNumber < 21) {
        problemDiff = 1.5;
      } else {
        problemDiff = 2;
      }
      break;
    default:
      break;
  }
  if (problemDiff < diffFrom || diffTo < problemDiff) return false;

  return true;
}

$("#single-problem").click(function() {
  clearAll();

  $(".button-container").after(
    `<div class="options-input-container">
      <div class="options-input" id="single-input">
        <label class="input-label" for="title">
          Year, test, problem number:
        </label>
        <input class="input-field" type="text" placeholder="e.g. 2005 AMC 10A Problem 8"/>
        <button class="input-button" id="single-button">
          View Problem
        </button>
      </div>
      <div class="options-input" id="random-input">
        <label class="input-label" id="random-label">
          Allowed subjects, tests, years, <a
          class="dark-link"
          href="https://artofproblemsolving.com/wiki/index.php/AoPS_Wiki:Competition_ratings"
          text="difficulty">difficulty</a>:
        </label>
        <input class="input-multi" name="input-subjects"
          id="input-subjects"
          placeholder="Subjects, e.g. Intermediate Algebra Problems"
          value="(All Subjects)"
          data-whitelist="(All Subjects),
          Introductory Algebra Problems,
          Introductory Combinatorics Problems,
          Introductory Geometry Problems,
          Introductory Logic Problems‏‎,
          Introductory Number Theory Problems,
          Introductory Probability Problems‏‎,
          Introductory Trigonometry Problems,
          Intermediate Algebra Problems,
          Intermediate Combinatorics Problems,
          Intermediate Geometry Problems,
          Intermediate Number Theory Problems,
          Intermediate Probability Problems‏‎,
          Intermediate Trigonometry Problems,
          Olympiad Algebra Problems,
          Olympiad Combinatorics Problems,
          Olympiad Geometry Problems,
          Olympiad Inequality Problems,
          Olympiad Number Theory Problems,
          Olympiad Trigonometry Problems‏‎">
        </input>
        <input class="input-multi" name="input-tests"
          id="input-tests"
          placeholder="Tests, e.g. AMC 10"
          value="(All Tests)"
          data-whitelist="(All Tests), AJHSME, AHSME, AMC 8, AMC 10, AMC 12,
          AIME, USAJMO, USAMO, Canadian MO, IMO">
        </input>
        <div class="range-container">
          <input class="input-range" id="input-years"></input>
        </div>
        <div class="range-container">
          <input class="input-range" id="input-diff"></input>
        </div>
        <button class="input-button" id="random-button">
          View Random
        </button>
      </div>
      *The AHSME was gradually reduced from 50 to 30 problems from 1950 to 1974.
      Difficulty levels will likely be more inaccurate for earlier years, because of this variation
      and because of the general increase in difficulty of the AHSME/AMC over the years.
    </div>`
  );

  var inputSubjects = document.querySelector("#input-subjects");
  new Tagify(inputSubjects);
  var inputTests = document.querySelector("#input-tests");
  new Tagify(inputTests);

  $("#input-years").ionRangeSlider({
    type: "double",
    grid: true,
    min: 1950,
    max: 2020,
    from: 1974,
    to: 2020,
    prettify_enabled: false
  });
  $("#input-diff").ionRangeSlider({
    type: "double",
    grid: true,
    min: 0,
    max: 10,
    from: 2,
    to: 9,
    step: 0.5
  });
});

$("#printable-batch").click(function() {
  clearAll();

  $(".button-container").after(
    `<div class="options-input options-input-container" id="batch-input">
      (placeholder)
    </div>`
  );
});

$("#find-article").click(function() {
  clearAll();

  $(".button-container").after(
    `<div class="options-input options-input-container" id="find-input">
      <label class="input-label" for="title">
        Exact article name:
      </label>
      <input class="input-field" type="text" placeholder="e.g. Heron's Formula"/>
      <button class="input-button" id="find-button">
        View Article
      </button>
    </div>`
  );
});

$(".page-container").on("click", "#find-button", async function() {
  clearProblem();

  let response = await addArticle();
  if (response) {
    fixLinks();
  }
});
/* Make some kind of thing for clicking on links in the article */

$(".page-container").on("click", "#single-button", async function() {
  clearProblem();

  let response = await addProblem(
    $("#single-input .input-field")
      .val()
      .replace("Problem", "Problems/Problem")
  );
  if (response) {
    formatProblem();
    fixLinks();
    collapseSolutions();
  }
});

$(".page-container").on("click", "#random-button", async function() {
  clearProblem();

  let pages = [];
  pages = await getPages();
  console.log(`${pages.length} total problems retrieved.`);
  let randomPage = pages[Math.floor(Math.random() * pages.length)];

  let response = await addProblem(randomPage);
  if (response) {
    if (pages.length === 0) {
      $("#solution-section").hide();
      $(".article-text").html(
        `<p class="error">No problems could be found meeting those requirements.</p>`
      );
    }
    formatProblem();
    fixLinks();
    collapseSolutions();
  }
});
