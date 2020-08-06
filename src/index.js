/* eslint-disable no-undef */
(() => {
  var allPages = [];
  var categoryPages = [];
  var problemOptions = `<input class="input-multi" name="input-subjects"
    id="input-subjects"
    placeholder="Subjects, e.g. Intermediate Algebra Problems"
    value="(All Subjects)"
    data-whitelist="(All Subjects),
    3D Geometry Problems,
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
  </div>`;
  var notes = `<p>
    *Difficulty levels will likely be more inaccurate for earlier years,
    because of changes in competition difficulty and problem design over
    time.
  </p>
  <p>
    **The script preloads a list of all pages in alphabetical order when the
    site is loaded, for use when a random page is selected from all
    subjects. Because it takes around 10 seconds to fully load, trying to
    get a problem before then will only give older problems early in
    alphabetical order.
  </p>
  <p>
    ***The 30-question AHMSE was replaced by the AMC 10 and AMC 12 and the
    AIME was split into the AIME I and AIME II in 2000. The AMC 10 and 
    AMC 12 were split into A and B tests in 2002.
  </p>`;

  (async () => {
    console.log("Preloading all wiki pages, allow around 10 seconds...");
    let apiEndpoint = "https://artofproblemsolving.com/wiki/api.php";
    let params = `action=query&list=allpages&aplimit=max&format=json`;
    let paramsContinue;

    let response = await fetch(`${apiEndpoint}?${params}&origin=*`);
    let json = await response.json();

    for (let page of json.query.allpages) {
      allPages.push(page.title);
    }

    while (typeof json.continue !== "undefined") {
      paramsContinue = params + `&apcontinue=${json.continue.apcontinue}`;
      response = await fetch(`${apiEndpoint}?${paramsContinue}&origin=*`);
      json = await response.json();
      for (let page of json.query.allpages) {
        allPages.push(page.title);
      }
    }
    console.log("Finished loading Special:AllPages.");
  })();

  async function addArticle(pagename) {
    $(".options-input-container").after(
      `<div class="problem-section">
      <h2 class="section-header" id="article-header">Article Text</h2>
      <a href="" id="aops-link">
        (View on the AoPS Wiki)
      </a>
      <div class="article-text" id="full-text"></div>
    </div>`
    );

    var apiEndpoint = "https://artofproblemsolving.com/wiki/api.php";
    var params = `action=parse&page=${pagename}&format=json`;

    const response = await fetch(`${apiEndpoint}?${params}&origin=*`);
    const json = await response.json();

    if (typeof json.parse !== "undefined") {
      var problemText = json.parse.text["*"];
      $(".article-text").html(problemText);
      $("#article-header").html(titleCleanup(pagename));
      $("#aops-link").attr(
        "href",
        `https://artofproblemsolving.com/wiki/index.php/${pagename}`
      );
    } else {
      $(".article-text").html(
        `<p class="error">The page you specified does not exist.</p>`
      );
      $("#article-header").html("Error");
      $("#aops-link").remove();
    }
  }

  async function addProblem(pagename) {
    $(".options-input-container").after(
      `<div class="problem-section">
      <h2 class="section-header" id="article-header">Problem Text</h2>
      <a href="" id="aops-link">
        (View on the AoPS Wiki)
      </a>
      <div class="article-text" id="problem-text"></div>
    </div>
    <div class="problem-section section-collapsed" id="solutions-section">
      <h2 class="section-header" id="solutions-header">Solutions</h2>
      <div class="article-text" id="solutions-text"></div>
    </div>`
    );
    var apiEndpoint = "https://artofproblemsolving.com/wiki/api.php";
    var params = `action=parse&page=${pagename}&format=json`;

    const response = await fetch(`${apiEndpoint}?${params}&origin=*`);
    const json = await response.json();

    if (typeof json.parse !== "undefined") {
      var problemText = json.parse.text["*"];
      $("#problem-text").html(getProblem(problemText));
      $("#solutions-text").html(getSolutions(problemText));
      $("#article-header").html(titleCleanup(pagename));
      $("#aops-link").attr(
        "href",
        `https://artofproblemsolving.com/wiki/index.php/${pagename}`
      );
    } else {
      $(".article-text").html(
        `<p class="error">The page you specified does not exist.</p>`
      );
      $("#article-header").html("Error");
      $("#aops-link").remove();
      $("#solutions-section").remove();
    }
  }

  function addBatch() {
    $(".options-input-container").after(
      `<div class="problem-section">
      <h2 class="section-header" id="article-header">Problem Batch</h2>
      <div class="article-text" id="batch-text"></div>
    </div>`
    );
  }

  async function getPages() {
    function addPagesFromArray(members) {
      for (let problem of members) {
        if (
          matchesOptions(problem, tests, yearsFrom, yearsTo, diffFrom, diffTo)
        )
          pages.push(problem);
      }
    }

    function addPagesFromJSON(members) {
      for (let problem of members) {
        if (
          matchesOptions(
            problem.title,
            tests,
            yearsFrom,
            yearsTo,
            diffFrom,
            diffTo
          )
        )
          pages.push(problem.title);
        fullPages.push(problem.title);
      }
    }

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
    let fullPages = [];

    if (subjects.some((e) => e.value === "(All Subjects)")) {
      for (let problem of allPages) {
        if (
          problem.includes("Problems/Problem") &&
          matchesOptions(problem, tests, yearsFrom, yearsTo, diffFrom, diffTo)
        )
          pages.push(problem);
      }
    } else {
      for (let subject of subjects) {
        if (categoryPages.some((e) => e.subject === subject.value)) {
          addPagesFromArray(
            categoryPages.find((e) => e.subject === subject.value).pages
          );
        } else {
          let apiEndpoint = "https://artofproblemsolving.com/wiki/api.php";
          let pagename = subject.value;
          let params = `action=query&list=categorymembers&cmtitle=Category:${pagename}&cmlimit=max&format=json`;
          let paramsContinue;

          let response = await fetch(`${apiEndpoint}?${params}&origin=*`);
          let json = await response.json();

          if (typeof json.query.categorymembers[0] !== "undefined") {
            addPagesFromJSON(json.query.categorymembers);
            while (typeof json.continue !== "undefined") {
              paramsContinue =
                params + `&cmcontinue=${json.continue.cmcontinue}`;
              response = await fetch(
                `${apiEndpoint}?${paramsContinue}&origin=*`
              );
              json = await response.json();
              addPagesFromJSON(json.query.categorymembers);
            }
          }
          categoryPages.push({ subject: subject.value, pages: fullPages });
        }
      }
    }
    return pages;
  }

  function matchesOptions(
    problem,
    tests,
    yearsFrom,
    yearsTo,
    diffFrom,
    diffTo
  ) {
    if (!/^\d{4}.*Problems\/Problem \d+$/.test(problem)) return false;

    let problemTest = problem
      .match(/(\d{4} )(.*)( Problems)/)[2]
      .replace(/AMC ((?:10)|(?:12))[AB]/, "AMC $1")
      .replace(/AIME I+/, "AIME");
    if (
      !tests.some((e) => e.value === "(All Tests)") &&
      tests.map((e) => e.value).indexOf(problemTest) < 0
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
        problemDiff = 3;
        break;
    }
    if (problemDiff < diffFrom || diffTo < problemDiff) return false;

    return true;
  }

  function getProblem(htmlString) {
    let htmlParsed = $.parseHTML(htmlString);
    let after = $(htmlParsed)
      .children()
      .first()
      .nextUntil(":header:not(:contains('Problem')), table")
      .addBack()
      .not(".toc")
      .not(":header:contains('Problem')");
    let afterHTML = "";

    after.each(function () {
      afterHTML += this.outerHTML;
    });
    return afterHTML;
  }

  function getSolutions(htmlString) {
    let htmlParsed = $.parseHTML(htmlString);
    let after = $(htmlParsed)
      .children()
      .filter(":header:contains('Solution')")
      .nextUntil(":header:not(:contains('Solution')), table")
      .addBack(":header:contains(' Solution'), :header:contains('Solution ')");
    let afterHTML = "";

    after.each(function () {
      afterHTML += this.outerHTML;
    });
    return afterHTML;
  }

  const sanitize = (string) =>
    string.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const titleCleanup = (string) =>
    string
      .replace(/_/g, " ")
      .replace("Problems/Problem ", "#")
      .replace("%27", "'");

  $("#single-problem").click(() => {
    clearAll();

    $(".button-container").after(
      `<div class="options-input-container">
      <div class="options-input" id="single-input">
        <label class="input-label" for="title">
          Year, test, problem number:
        </label>
        <input class="input-field" type="text" placeholder="e.g. 2012 AMC 10A #23"/>
        <button class="input-button" id="single-button">
          View Problem
        </button>
      </div>
      <div class="options-input" id="random-input">
        <label class="input-label" id="random-label">
          Allowed subjects, tests, years,
          <a
            class="dark-link"
            href="https://artofproblemsolving.com/wiki/index.php/AoPS_Wiki:Competition_ratings"
            >difficulty</a
          >:
        </label>
        ${problemOptions}
        <button class="input-button" id="random-button">
          View Random
        </button>
      </div>
      ${notes}`
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
      prettify_enabled: false,
    });
    $("#input-diff").ionRangeSlider({
      type: "double",
      grid: true,
      min: 0,
      max: 10,
      from: 2,
      to: 9,
      step: 0.5,
    });
  });

  $("#problem-batch").click(() => {
    clearAll();

    $(".button-container").after(
      `<div class="options-input-container">
      <div class="options-input" id="batch-input">
        <label class="input-label" for="title">
          Year and test:
        </label>
        <input class="input-field" type="text" placeholder="e.g. 2016 AIME I"/>
        <button class="input-button" id="batch-button">
          View Problems
        </button>
      </div>
      <div class="options-input" id="ranbatch-input">
        <label class="input-label" id="ranbatch-label">
          Allowed subjects, tests, years,
          <a
            class="dark-link"
            href="https://artofproblemsolving.com/wiki/index.php/AoPS_Wiki:Competition_ratings"
            >difficulty</a
          >, number of problems:
        </label>
        ${problemOptions}
        <div class="range-container">
          <input class="input-range" id="input-number"/>
        </div>
        <div class="range-container checkbox-container">
          <div class="checkbox-wrap">
            <input type="checkbox" checked class="input-check" id="input-sort"/>
            <label class="checkbox-label">
              Sort questions by difficulty?
            </label>
          </div>
          <div class="checkbox-wrap">
            <input type="checkbox" checked class="input-check" id="input-sort"/>
            <label class="checkbox-label">
              Hide question sources when printed?
            </label>
          </div>
        </div>
        <button class="input-button" id="ranbatch-button">
          Make Random
        </button>
      </div>
      ${notes}
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
      prettify_enabled: false,
    });
    $("#input-diff").ionRangeSlider({
      type: "double",
      grid: true,
      min: 0,
      max: 10,
      from: 2,
      to: 9,
      step: 0.5,
    });
    $("#input-number").ionRangeSlider({
      grid: true,
      min: 0,
      max: 50,
      from: 25,
    });
  });

  $("#find-article").click(() => {
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

  $(".page-container").on("click", "#single-button", async () => {
    clearProblem();

    await addProblem(
      sanitize(
        $("#single-input .input-field").val().replace("#", "Problems/Problem ")
      )
    );
    fixLinks();
    collapseSolutions();
    directLinks();
  });

  $(".page-container").on("click", "#random-button", async () => {
    clearProblem();

    let pages = await getPages();
    console.log(`${pages.length} total problems retrieved.`);

    if (pages.length === 0) {
      await addProblem("Error");
      $("#aops-link").remove();
      $("#solutions-section").remove();
      $(".article-text").html(
        `<p class="error">
          No problems could be found meeting those requirements.
        </p>`
      );
    } else {
      let randomPage = pages[Math.floor(Math.random() * pages.length)];
      console.log(randomPage);
      await addProblem(randomPage);
    }
    fixLinks();
    collapseSolutions();
    directLinks();
  });

  $(".page-container").on("click", "#batch-button", async () => {
    clearProblem();

    await addArticle(
      sanitize(`${$("#batch-input .input-field").val()} Problems`)
    );
    formatBatch();
    fixLinks();
    directLinks();
  });

  $(".page-container").on("click", "#ranbatch-button", async () => {
    clearProblem();

    addBatch();
    let pages = await getPages();
    console.log(`${pages.length} total problems retrieved.`);
    if (pages.length === 0) {
      $(".article-text").html(
        `<p class="error">
          No problems could be found meeting those requirements.
        </p>`
      );
      $("#article-header").html("Error");
    } else {
      let inputNumber = $("#input-number");
      let numProblems = inputNumber.data().from;
      let randomPage;
      let pageIndex;

      for (let i = 0; i < numProblems && pages.length !== 0; i++) {
        pageIndex = Math.floor(Math.random() * pages.length);
        randomPage = pages[pageIndex];
        console.log(randomPage);

        var apiEndpoint = "https://artofproblemsolving.com/wiki/api.php";
        var params = `action=parse&page=${randomPage}&format=json`;

        const response = await fetch(`${apiEndpoint}?${params}&origin=*`);
        const json = await response.json();

        var problemText = json.parse.text["*"];
        $("#batch-text").append(`<h2>Problem ${i + 1}
          <span class="header-sourcelink">
            (<a href="https://artofproblemsolving.com/wiki/index.php/${randomPage}">${titleCleanup(
          randomPage
        )}</a>)
          </span>
        </h2>`);
        $("#batch-text").append(getProblem(problemText));

        pages.splice(pageIndex, 1);
      }
    }
    fixLinks();
    directLinks();
  });

  $(".page-container").on("click", "#find-button", async () => {
    clearProblem();

    await addArticle(sanitize($("#find-input .input-field").val()));
    fixLinks();
    directLinks();
  });

  function clearProblem() {
    $(".problem-section").remove();
  }

  function clearAll() {
    $(".options-input-container").remove();
    $(".problem-section").remove();
  }

  function formatBatch() {
    $("p").has("a:contains(Solution)").remove();
    $("table:contains(Problem)").remove();
    $("table:contains(Answer)").remove();
    $("p:contains('The problems on this page are copyrighted')").remove();
  }

  function fixLinks() {
    $(".article-text a").each(function () {
      let href = $(this).attr("href");
      if (typeof href !== "undefined" && href.charAt(0) === "/")
        $(this).attr("href", `https://artofproblemsolving.com${href}`);
    });
  }

  async function directLinks() {
    $(".article-text a").click(async function (event) {
      let pagename = $(this).attr("href");
      if (pagename.includes("artofproblemsolving.com/wiki/")) {
        event.preventDefault();
        pagename = pagename.replace(
          "https://artofproblemsolving.com/wiki/index.php/",
          ""
        );
        clearProblem();
        await addArticle(pagename);
        fixLinks();
        directLinks();
      }
    });
  }

  function collapseSolutions() {
    $("#solutions-header").click(() => {
      $("#solutions-section").toggleClass("section-collapsed");
    });
  }
})();
