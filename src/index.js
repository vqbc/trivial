/* eslint-disable no-undef */
(() => {
  var allPages = [];
  var allProblems = [];
  var categoryPages = [];
  var problemOptions = `<input class="input-multi"
    id="input-subjects"
    placeholder="Subjects, e.g. Olympiad Algebra Problems"
    data-whitelist="(All Subjects),
    3D Geometry Problems,
    Introductory Algebra Problems,
    Introductory Combinatorics Problems,
    Introductory Geometry Problems,
    Introductory Logic Problems‎,
    Introductory Number Theory Problems,
    Introductory Probability Problems‎,
    Introductory Trigonometry Problems,
    Intermediate Algebra Problems,
    Intermediate Combinatorics Problems,
    Intermediate Geometry Problems,
    Intermediate Number Theory Problems,
    Intermediate Probability Problems‎,
    Intermediate Trigonometry Problems,
    Olympiad Algebra Problems,
    Olympiad Combinatorics Problems,
    Olympiad Geometry Problems,
    Olympiad Inequality Problems,
    Olympiad Number Theory Problems,
    Olympiad Trigonometry Problems‎">
  </input>
  <input class="input-multi"
    id="input-tests"
    placeholder="Tests, e.g. AMC 10"
    data-whitelist="(All Tests), (AMC Tests), AJHSME, AHSME, AMC 8, AMC 10,
    AMC 12, AIME, USAJMO, USAMO, Canadian MO, IMO">
  </input>
  <div class="range-container">
    <input class="input-range" id="input-years"></input>
  </div>
  <div class="range-container">
    <input class="input-range" id="input-diff"></input>
  </div>`;
  var notes = `<div class="notes">
    <h3 id="notes-header">Notes</h3>
    <ul id="notes-text">
      <li>
        Difficulty levels will likely be more inaccurate for earlier years,
        because of changes in competition difficulty and problem design over
        time.
      </li>
      <li>
        The script preloads a list of all pages in alphabetical order when the
        site is loaded, for use when a random page is selected from all
        subjects. Because it takes around 10 seconds to fully load, trying to
        get a problem before then will only give older problems early in
        alphabetical order.
      </li>
      <li>
        The 30-question AHMSE was replaced by the AMC 10 and AMC 12 and the
        AIME was split into the AIME I and AIME II in 2000. The AMC 10 and 
        AMC 12 were split into A and B tests in 2002.
      </li>
      <li>
        AMC Tests refers to the AHSME, AJHSME, AMC 8/10/12, AIME, USAMO, and IMO.
      </li>
    <ul>
  </div>`;
  var clickedTimes = 0;
  var allPagesLoaded = false;

  (async () => {
    console.log("Preloading all wiki pages, allow around 10 seconds...");
    let apiEndpoint = "https://artofproblemsolving.com/wiki/api.php";
    let params = `action=query&list=allpages&aplimit=max&format=json`;
    let paramsContinue;

    let response = await fetch(`${apiEndpoint}?${params}&origin=*`);
    let json = await response.json();

    for (let page of json.query.allpages) {
      if (page.title.charAt(0) !== "/") allPages.push(page.title);
      if (
        page.title.includes("Problems/Problem") &&
        page.title.match(/^\d{4}/) &&
        page.title.match(/\d+$/)
      )
        allProblems.push(page.title);
    }

    while (typeof json.continue !== "undefined") {
      paramsContinue = params + `&apcontinue=${json.continue.apcontinue}`;
      response = await fetch(`${apiEndpoint}?${paramsContinue}&origin=*`);
      json = await response.json();
      for (let page of json.query.allpages) {
        if (page.title.charAt(0) !== "/") allPages.push(page.title);
        if (
          page.title.includes("Problems/Problem") &&
          page.title.match(/^\d{4}/) &&
          page.title.match(/\d+$/)
        )
          allProblems.push(page.title);
      }
    }
    allPagesLoaded = true;
    console.log("Finished loading Special:AllPages.");

    allProblems = sortProblems(allProblems);
  })();

  const allPagesLoadWait = () =>
    Math.round(10 - (allPages.length / 12500) * 10);

  async function addArticle(pagename) {
    $("article").append(
      `<div class="problem-section">
      <h2 class="section-header" id="article-header">Article Text</h2>
      <a href="" class="aops-link">
        (View on the AoPS Wiki)
      </a>
      <div class="article-text" id="full-text"></div>
    </div>`
    );

    let apiEndpoint = "https://artofproblemsolving.com/wiki/api.php";
    let params = `action=parse&page=${pagename}&format=json`;

    const response = await fetch(`${apiEndpoint}?${params}&origin=*`);
    const json = await response.json();

    if (typeof json.parse !== "undefined") {
      var problemText = json.parse.text["*"];
      $(".article-text").html(problemText);
      $("#article-header").html(titleCleanup(pagename));
      $(".aops-link").attr(
        "href",
        `https://artofproblemsolving.com/wiki/index.php/${pagename}`
      );
    } else {
      $(".article-text").html(
        `<p class="error">The page you specified does not exist.</p>`
      );
      $("#article-header").html("Error");
      $(".aops-link").remove();
    }
  }

  async function addProblem(pagename) {
    $("article").append(
      `<div class="problem-section">
      <h2 class="section-header" id="article-header">Problem Text</h2>
      <a href="" class="aops-link">
        (View on the AoPS Wiki)
      </a>
      <div class="article-text" id="problem-text"></div>
    </div>
    <div class="problem-section section-collapsed" id="solutions-section">
      <h2 class="section-header" id="solutions-header">Solutions</h2>
      <div class="article-text" id="solutions-text"></div>
    </div>`
    );
    let apiEndpoint = "https://artofproblemsolving.com/wiki/api.php";
    let params = `action=parse&page=${pagename}&format=json`;

    const response = await fetch(`${apiEndpoint}?${params}&origin=*`);
    const json = await response.json();

    if (typeof json.parse !== "undefined") {
      var problemText = json.parse.text["*"];
      $("#problem-text").html(getProblem(problemText));
      $("#solutions-text").html(getSolutions(problemText));
      $("#article-header").html(titleCleanup(pagename));
      $(".aops-link").attr(
        "href",
        `https://artofproblemsolving.com/wiki/index.php/${pagename}`
      );
      return [
        (getProblem(problemText) && getSolutions(problemText) ? 1 : 0) -
          problemText.includes("Redirect to"),
        problemText,
      ];
    } else {
      $(".article-text").html(
        `<p class="error">The page you specified does not exist.</p>`
      );
      $("#article-header").html("Error");
      $(".aops-link").remove();
      $("#solutions-section").remove();
    }
  }

  function addBatch() {
    $(".notes").after(
      `<div class="problem-section">
      <h2 class="section-header" id="batch-header">Problem Batch</h2>
      <div class="article-text" id="batch-text"></div>
    </div>
    <div class="problem-section section-collapsed" id="solutions-section">
      <h2 class="section-header" id="solutions-header">Solutions</h2>
      <div class="article-text batch-solutions-text" id="solutions-text"></div>
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

    let subjects = inputSubjects.val().split(",");
    let tests = inputTests.val().split(",");
    let yearsFrom = inputYears.data().from;
    let yearsTo = inputYears.data().to;
    let diffFrom = inputDiff.data().from;
    let diffTo = inputDiff.data().to;

    let pages = [];
    let fullPages = [];

    let noSubjects = false;
    let noTests = false;

    if (!subjects[0] && !tests[0]) {
      noSubjects = true;
      noTests = true;
      return [pages, noSubjects, noTests];
    }
    if (!subjects[0]) {
      noSubjects = true;
      return [pages, noSubjects, noTests];
    }
    if (!tests[0]) {
      noTests = true;
      return [pages, noSubjects, noTests];
    }

    if (subjects.includes("(All Subjects)")) {
      for (let problem of allPages) {
        if (
          problem.includes("Problems/Problem") &&
          matchesOptions(problem, tests, yearsFrom, yearsTo, diffFrom, diffTo)
        )
          pages.push(problem);
      }
    } else {
      for (let subject of subjects) {
        if (categoryPages.some((e) => e.subject === subject)) {
          addPagesFromArray(
            categoryPages.find((e) => e.subject === subject).pages
          );
        } else {
          let apiEndpoint = "https://artofproblemsolving.com/wiki/api.php";
          let pagename = subject;
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
          categoryPages.push({ subject: subject, pages: fullPages });
        }
      }
    }
    return [pages, noSubjects, noTests];
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

    let problemTest = computeTest(problem);

    if (tests.includes("(AMC Tests)")) {
      tests.splice(
        tests.indexOf("(AMC Tests)"),
        1,
        "AJHSME",
        "AHSME",
        "AMC 8",
        "AMC 10",
        "AMC 12",
        "AIME",
        "USAMO",
        "IMO"
      );
    }
    if (!tests.includes("(All Tests)") && !tests.includes(problemTest))
      return false;

    let problemYear = computeYear(problem);
    if (problemYear < yearsFrom || yearsTo < problemYear) return false;

    let problemNumber = computeNumber(problem);
    let problemDiff = computeDifficulty(problemTest, problemNumber);
    if (problemDiff < diffFrom || diffTo < problemDiff) return false;

    return true;
  }

  const computeTest = (problem) =>
    problem
      .match(/(\d{4} )(.*)( Problems)/)[2]
      .replace(/AMC ((?:10)|(?:12))[AB]/, "AMC $1")
      .replace(/AIME I+/, "AIME");
  const computeYear = (problem) => problem.match(/^\d{4}/)[0];
  const computeNumber = (problem) => problem.match(/\d+$/)[0];

  function computeDifficulty(test, num) {
    let diff;
    switch (test) {
      case "AMC 8":
        diff = num < 13 ? 1 : num < 21 ? 1.5 : 2;
        break;
      case "AMC 10":
        diff =
          num < 4
            ? 1
            : num < 7
            ? 1.5
            : num < 13
            ? 2
            : num < 17
            ? 2.5
            : num < 21
            ? 3
            : num < 23
            ? 3.5
            : num < 25
            ? 4
            : 4.5;
        break;
      default:
        diff = 3;
        break;
    }
    return diff;
  }

  const sortProblems = (problems) => {
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
    console.log("Finished sorting problem index.");
    return sorted;
  };

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

  function addProblems(problems) {
    let problemIndex = 0;
    for (let problem of problems) {
      $("#batch-text").append(`<div class="article-problem">
        <h2 class="problem-heading">Problem ${problemIndex + 1}
          <span class="source-link">
            (<a href="https://artofproblemsolving.com/wiki/index.php/${
              problem.title
            }">${titleCleanup(problem.title)}</a>)
          </span>
        </h2>${problem.problem}
      </div>`);

      $("#solutions-text").append(`<div class="article-problem">
        <h2 class="problem-heading">
          Problem ${problemIndex + 1}
          <span class="source-link">
            (<a href="https://artofproblemsolving.com/wiki/index.php/${
              problem.title
            }">${titleCleanup(problem.title)}</a>)
          </span>
        </h2>${problem.solutions}
      </div>`);
      problemIndex++;
    }
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
    activeButton("single-problem");

    $(".button-container").after(
      `<div class="options-input-container">
        <div class="options-input" id="single-input">
          <label class="input-label" for="title">
            Choose a single problem:
          </label>
          <input class="input-field input-field-single input-singletest"
            type="text"
            id="input-singletest"
            placeholder="Test, e.g. AMC 10A"
            data-whitelist="AJHSME, AHSME, AMC 8, AMC 10, AMC 10A, AMC 10B,
            AMC 12, AMC 12A, AMC 12B, AIME, AIME I, AIME II, USAJMO, USAMO,
            Canadian MO, IMO">
          </input>
            <input class="input-field input-field-single"
            type="number"
            min="1974"
            max="2020"
            id="input-singleyear"
            placeholder="Year">
            </input>
            <input class="input-field input-field-single"
            type="number"
            min="1"
            max="30"
            id="input-singlenum"
            placeholder="#">
            </input>
          <button class="input-button" id="single-button">
            View Problem
          </button>
        </div>
        <div class="options-input" id="random-input">
          <label class="input-label" id="random-label">
            Choose subjects, tests, years,
            <a
              class="dark-link"
              href="https://artofproblemsolving.com/wiki/index.php/AoPS_Wiki:Competition_ratings"
              >difficulty</a
            >:
          </label>
          ${problemOptions}
          <div class="range-container checkbox-container bottom-container">
            <div class="checkbox-wrap">
              <input type="checkbox" checked class="input-check" id="input-serif"/>
              <label class="checkbox-label">
                Use a LaTeX-style serif font?
              </label>
            </div>
          </div>
          <button class="input-button" id="random-button">
            View Random
          </button>
        </div>
      </div>
      ${notes}`
    );
    collapseNotes();

    var inputSingleTest = document.querySelector("#input-singletest");
    new Tagify(inputSingleTest, {
      originalInputValueFormat: (values) => values.map((e) => e.value),
      dropdown: {
        enabled: 0,
        maxItems: 100,
      },
      maxTags: 1,
    });
    var inputSubjects = document.querySelector("#input-subjects");
    new Tagify(inputSubjects, {
      originalInputValueFormat: (values) => values.map((e) => e.value),
      dropdown: {
        enabled: 0,
        maxItems: 100,
      },
    });
    var inputTests = document.querySelector("#input-tests");
    new Tagify(inputTests, {
      originalInputValueFormat: (values) => values.map((e) => e.value),
      dropdown: {
        enabled: 0,
        maxItems: 100,
      },
    });

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
    activeButton("problem-batch");

    $(".button-container").after(
      `<div class="options-input-container">
      <div class="options-input" id="batchname-input">
        <input class="input-field" id="input-name" type="text"
          placeholder='Batch name (optional)'/>
        <div class="range-container checkbox-container top-checkbox-container">
          <div class="checkbox-wrap">
            <input type="checkbox" checked class="input-check" id="input-sort"/>
            <label class="checkbox-label">
              Sort questions by difficulty?
            </label>
          </div>
          <div class="checkbox-wrap">
            <input type="checkbox" checked class="input-check" id="input-hide"/>
            <label class="checkbox-label">
              Hide question sources when printed?
            </label>
          </div>
          <div class="checkbox-wrap">
            <input type="checkbox" checked class="input-check" id="input-serif"/>
            <label class="checkbox-label">
              Use a LaTeX-style serif font?
            </label>
          </div>
        </div>
      </div>
      <div class="options-input" id="batch-input">
        <label class="input-label" for="title">
          Choose a single test:
        </label>
        <input class="input-field input-field-single input-singletest"
          type="text"
          id="input-singletest"
          placeholder="Test, e.g. AMC 10A"
          data-whitelist="AJHSME, AHSME, AMC 8, AMC 10, AMC 10A, AMC 10B,
          AMC 12, AMC 12A, AMC 12B, AIME, AIME I, AIME II, USAJMO, USAMO,
          Canadian MO, IMO">
        </input>
          <input class="input-field input-field-single"
          type="number"
          min="1974"
          max="2020"
          id="input-singleyear"
          placeholder="Year">
          </input>
        <button class="input-button" id="batch-button">
          View Test
        </button>
      </div>
      <div class="options-input" id="problems-input">
        <label class="input-label" for="title">
          Choose batch problems:
        </label>
        <input class="input-field" id="input-problems" type="text"
        placeholder="e.g. 2018 AMC 12B #24"
        data-whitelist="${sortProblems(allProblems)
          .map((e) => titleCleanup(e))
          .toString()}">
        <button class="input-button" id="problems-button">
          View Problems
        </button>
      </div>
      <div class="options-input" id="ranbatch-input">
        <label class="input-label" id="ranbatch-label">
          Choose subjects, tests, years,
          <a
            class="dark-link"
            href="https://artofproblemsolving.com/wiki/index.php/AoPS_Wiki:Competition_ratings"
            >difficulty</a
          >, # of problems:
        </label>
        ${problemOptions}
        <div class="range-container">
          <input class="input-range" id="input-number"/>
        </div>
        <button class="input-button" id="ranbatch-button">
          Make Random
        </button>
      </div>
    </div>
    ${notes}`
    );
    allPagesWarnAC();
    collapseNotes();

    var inputSingleTest = document.querySelector("#input-singletest");
    new Tagify(inputSingleTest, {
      originalInputValueFormat: (values) => values.map((e) => e.value),
      dropdown: {
        enabled: 0,
        maxItems: 100,
      },
      maxTags: 1,
    });
    var inputProblems = document.querySelector("#input-problems");
    new Tagify(inputProblems, {
      originalInputValueFormat: (values) => values.map((e) => e.value),
      dropdown: {
        enabled: 0,
      },
      enforceWhitelist: true,
    });
    var inputSubjects = document.querySelector("#input-subjects");
    new Tagify(inputSubjects, {
      originalInputValueFormat: (values) => values.map((e) => e.value),
      dropdown: {
        enabled: 0,
        maxItems: 100,
      },
    });
    var inputTests = document.querySelector("#input-tests");
    new Tagify(inputTests, {
      originalInputValueFormat: (values) => values.map((e) => e.value),
      dropdown: {
        enabled: 0,
        maxItems: 100,
      },
    });

    $("#input-years").ionRangeSlider({
      type: "double",
      grid: true,
      min: 1974,
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
    activeButton("find-article");

    $(".button-container").after(
      `<div class="options-input options-input-container" id="find-input">
        <input class="input-field" id="input-find" type="text"
        placeholder="e.g. Heron's Formula"
        data-whitelist="${allPages.toString()}">
        <button class="input-button" id="find-button">
          View Article
        </button>
      </div>
      ${notes}`
    );
    allPagesWarnAC();
    collapseNotes();

    var inputFind = document.querySelector("#input-find");
    new Tagify(inputFind, {
      maxTags: 1,
      originalInputValueFormat: (values) => values.map((e) => e.value),
      dropdown: {
        enabled: 0,
        maxItems: 7,
      },
    });
  });

  $(".page-container").on("click", "#single-button", async () => {
    clearProblem();

    await addProblem(
      sanitize(
        `${$("#input-singleyear").val()} ${$(
          "#input-singletest"
        ).val()} Problems/Problem ${$("#input-singlenum").val()}`
      )
    );
    fixLinks();
    collapseSolutions();
    directLinks();
  });

  $(".page-container").on("click", "#random-button", async () => {
    allPagesWarn();
    clearProblem();

    let [pages, noSubjects, noTests] = await getPages();
    console.log(`${pages.length} total problems retrieved.`);

    if (noSubjects && noTests) {
      await addProblem("Error");
      $(".aops-link").remove();
      $("#solutions-section").remove();
      $(".article-text").html(
        `<p class="error">
          Please enter a subject and test.
        </p>`
      );
    } else if (noSubjects) {
      await addProblem("Error");
      $(".aops-link").remove();
      $("#solutions-section").remove();
      $(".article-text").html(
        `<p class="error">
          Please enter a subject.
        </p>`
      );
    } else if (noTests) {
      await addProblem("Error");
      $(".aops-link").remove();
      $("#solutions-section").remove();
      $(".article-text").html(
        `<p class="error">
          Please enter a test.
        </p>`
      );
    } else if (pages.length === 0) {
      await addProblem("Error");
      $(".aops-link").remove();
      $("#solutions-section").remove();
      $(".article-text").html(
        `<p class="error">
          No problems could be found meeting those requirements.
        </p>`
      );
    } else {
      let invalid = true;
      let response;
      let problemText;
      while (invalid) {
        clearProblem();
        allPagesWarn();

        let randomPage = pages[Math.floor(Math.random() * pages.length)];
        console.log(randomPage);
        [response, problemText] = await addProblem(randomPage);

        if (response < 0) {
          clearProblem();
          allPagesWarn();
          console.log("Redirect problem, going there instead...");

          let redirHref = $($.parseHTML(problemText))
            .find(".redirectText a")
            .attr("href");
          let redirPage = redirHref
            .replace("/wiki/index.php/", "")
            .replace(/_/g, " ");
          console.log(redirPage);

          await addProblem(redirPage);
        }

        invalid = !response;
      }
    }
    fakeTex();
    fixLinks();
    collapseSolutions();
    directLinks();
  });

  $(".page-container").on("click", "#batch-button", async () => {
    async function makeBatch() {
      let problems = [];
      let problemTitles = sortProblems(allProblems).filter((e) =>
        e.includes(
          sanitize(
            `${$("#input-singleyear").val()} ${$(
              "#input-singletest"
            ).val()} Problems/Problem`
          )
        )
      );
      let numProblems = problemTitles.length;

      let apiEndpoint = "https://artofproblemsolving.com/wiki/api.php";
      let params;
      let response;
      let json;

      $("#batch-header").after(
        `<div class="loading-notice">
          <div class="loading-text">Loading problems…</div>
          <div class="loading-bar-container">
            <div class="loading-bar"></div>
          </div>
        </div>`
      );

      for (let [problemIndex, currentProblem] of problemTitles.entries()) {
        if (clickedTimes !== clickedTimesThen) break;
        console.log(currentProblem);

        params = `action=parse&page=${currentProblem}&format=json`;
        response = await fetch(`${apiEndpoint}?${params}&origin=*`);
        json = await response.json();

        let problemText = json.parse.text["*"];
        let problemProblem = getProblem(problemText);
        let problemSolutions = getSolutions(problemText);

        if (
          problemProblem &&
          problemSolutions &&
          clickedTimes === clickedTimesThen
        ) {
          problems.push({
            title: currentProblem,
            difficulty: computeDifficulty(
              computeTest(currentProblem),
              computeNumber(currentProblem)
            ),
            problem: problemProblem,
            solutions: problemSolutions,
          });

          $(".loading-bar").css(
            "width",
            `${((problemIndex + 1) / numProblems) * 100}%`
          );
        } else if (problemText.includes("Redirect to")) {
          console.log("Redirect problem, going there instead...");

          let redirHref = $($.parseHTML(problemText))
            .find(".redirectText a")
            .attr("href");
          let redirPage = redirHref
            .replace("/wiki/index.php/", "")
            .replace(/_/g, " ");
          console.log(redirPage);

          params = `action=parse&page=${redirPage}&format=json`;
          response = await fetch(`${apiEndpoint}?${params}&origin=*`);
          json = await response.json();

          problemText = json.parse.text["*"];
          problemProblem = getProblem(problemText);
          problemSolutions = getSolutions(problemText);

          problems.push({
            title: redirPage,
            difficulty: computeDifficulty(
              computeTest(redirPage),
              computeNumber(redirPage)
            ),
            problem: problemProblem,
            solutions: problemSolutions,
          });

          $(".loading-bar").css(
            "width",
            `${((problemIndex + 1) / numProblems) * 100}%`
          );
        } else {
          console.log("Invalid problem, skipping...");
        }
      }

      if (clickedTimes === clickedTimesThen) {
        if ($("#input-sort").prop("checked")) {
          problems.sort((a, b) => (a.difficulty > b.difficulty ? 1 : -1));
        }
        console.log(problems);

        addProblems(problems);
      }
    }

    clickedTimes++;
    let clickedTimesThen = clickedTimes;
    clearProblem();

    addBatch();
    allPagesWarn();
    await makeBatch();

    if (clickedTimes === clickedTimesThen) $(".loading-notice").remove();
    fakeTex();
    changeName();
    fixLinks();
    collapseSolutions();
    directLinks();
    hideLinks();
  });

  $(".page-container").on("click", "#problems-button", async () => {
    async function makeBatch() {
      let problems = [];
      let inputProblems = $("#input-problems");
      let problemTitles = inputProblems
        .val()
        .split(",")
        .map((e) => e.replace("#", "Problems/Problem "));
      let numProblems = problemTitles.length;

      $("#batch-header").after(
        `<div class="loading-notice">
          <div class="loading-text">Loading problems…</div>
          <div class="loading-bar-container">
            <div class="loading-bar"></div>
          </div>
        </div>`
      );

      for (let [problemIndex, currentProblem] of problemTitles.entries()) {
        if (clickedTimes !== clickedTimesThen) break;
        console.log(currentProblem);

        let apiEndpoint = "https://artofproblemsolving.com/wiki/api.php";
        let params = `action=parse&page=${currentProblem}&format=json`;

        const response = await fetch(`${apiEndpoint}?${params}&origin=*`);
        const json = await response.json();

        var problemText = json.parse.text["*"];
        var problemProblem = getProblem(problemText);
        var problemSolutions = getSolutions(problemText);

        if (
          problemProblem &&
          problemSolutions &&
          clickedTimes === clickedTimesThen
        ) {
          problems.push({
            title: currentProblem,
            difficulty: computeDifficulty(
              computeTest(currentProblem),
              computeNumber(currentProblem)
            ),
            problem: problemProblem,
            solutions: problemSolutions,
          });

          $(".loading-bar").css(
            "width",
            `${((problemIndex + 1) / numProblems) * 100}%`
          );
        } else {
          console.log("Invalid problem, skipping...");
        }
      }

      if (clickedTimes === clickedTimesThen) {
        if ($("#input-sort").prop("checked")) {
          problems.sort((a, b) => (a.difficulty > b.difficulty ? 1 : -1));
        }
        console.log(problems);

        addProblems(problems);
      }
    }

    clickedTimes++;
    let clickedTimesThen = clickedTimes;
    clearProblem();

    addBatch();
    allPagesWarn();
    await makeBatch();

    if (clickedTimes === clickedTimesThen) $(".loading-notice").remove();
    fakeTex();
    changeName();
    fixLinks();
    collapseSolutions();
    directLinks();
    hideLinks();
  });

  $(".page-container").on("click", "#ranbatch-button", async () => {
    async function makeBatch() {
      let inputNumber = $("#input-number");
      let numProblems = Math.min(inputNumber.data().from, pages.length);
      let randomPage;
      let pageIndex;
      let problems = [];
      let getIndex = 0;

      let apiEndpoint = "https://artofproblemsolving.com/wiki/api.php";
      let params;
      let response;
      let json;

      $("#batch-header").after(
        `<div class="loading-notice">
          <div class="loading-text">Loading problems…</div>
          <div class="loading-bar-container">
            <div class="loading-bar"></div>
          </div>
        </div>`
      );

      while (
        getIndex < numProblems &&
        pages.length !== 0 &&
        clickedTimes === clickedTimesThen
      ) {
        pageIndex = Math.floor(Math.random() * pages.length);
        randomPage = pages[pageIndex];
        console.log(randomPage);

        params = `action=parse&page=${randomPage}&format=json`;
        response = await fetch(`${apiEndpoint}?${params}&origin=*`);
        json = await response.json();

        var problemText = json.parse.text["*"];
        var problemProblem = getProblem(problemText);
        var problemSolutions = getSolutions(problemText);

        if (
          problemProblem &&
          problemSolutions &&
          clickedTimes === clickedTimesThen
        ) {
          problems.push({
            title: randomPage,
            difficulty: computeDifficulty(
              computeTest(randomPage),
              computeNumber(randomPage)
            ),
            problem: problemProblem,
            solutions: problemSolutions,
          });

          pages.splice(pageIndex, 1);
          getIndex++;
          $(".loading-bar").css("width", `${(getIndex / numProblems) * 100}%`);
        } else if (problemText.includes("Redirect to")) {
          console.log("Redirect problem, going there instead...");

          let redirHref = $($.parseHTML(problemText))
            .find(".redirectText a")
            .attr("href");
          let redirPage = redirHref
            .replace("/wiki/index.php/", "")
            .replace(/_/g, " ");
          console.log(redirPage);

          params = `action=parse&page=${redirPage}&format=json`;
          response = await fetch(`${apiEndpoint}?${params}&origin=*`);
          json = await response.json();

          problemText = json.parse.text["*"];
          problemProblem = getProblem(problemText);
          problemSolutions = getSolutions(problemText);

          problems.push({
            title: redirPage,
            difficulty: computeDifficulty(
              computeTest(redirPage),
              computeNumber(redirPage)
            ),
            problem: problemProblem,
            solutions: problemSolutions,
          });

          pages.splice(pageIndex, 1);
          getIndex++;
          $(".loading-bar").css("width", `${(getIndex / numProblems) * 100}%`);
        } else {
          console.log("Invalid problem, skipping...");
        }
      }

      if (clickedTimes === clickedTimesThen) {
        if ($("#input-sort").prop("checked")) {
          problems.sort((a, b) => (a.difficulty > b.difficulty ? 1 : -1));
        }
        console.log(problems);

        addProblems(problems);
      }
    }

    clickedTimes++;
    let clickedTimesThen = clickedTimes;
    clearProblem();

    addBatch();
    allPagesWarn();

    let [pages, noSubjects, noTests] = await getPages();
    console.log(`${pages.length} total problems retrieved.`);
    if (noSubjects && noTests) {
      $(".article-text").html(
        `<p class="error">
          Please enter a subject and test.
        </p>`
      );
      $("#batch-header").html("Error");
    } else if (noSubjects) {
      $(".article-text").html(
        `<p class="error">
          Please enter a subject.
        </p>`
      );
      $("#batch-header").html("Error");
    } else if (noTests) {
      $(".article-text").html(
        `<p class="error">
          Please enter a test.
        </p>`
      );
      $("#batch-header").html("Error");
    } else if (pages.length === 0) {
      $(".article-text").html(
        `<p class="error">
          No problems could be found meeting those requirements.
        </p>`
      );
      $("#batch-header").html("Error");
    } else {
      await makeBatch();
    }

    $(".loading-notice").remove();
    fakeTex();
    changeName();
    fixLinks();
    collapseSolutions();
    directLinks();
    hideLinks();
  });

  $(".page-container").on("click", "#find-button", async () => {
    clearProblem();

    await addArticle(sanitize($("#input-find").val()));
    fixLinks();
    directLinks();
  });

  function clearProblem() {
    $(".problem-section").remove();
  }

  function clearAll() {
    $(".options-input-container").remove();
    $(".error").remove();
    $(".notes").remove();
    $(".problem-section").remove();
  }

  function activeButton(buttonName) {
    $(".button").removeClass("button-active");
    $(`#${buttonName}`).addClass("button-active");
  }

  function collapseNotes() {
    $("#notes-header").click(() => {
      $(".notes").toggleClass("notes-collapsed");
    });
  }

  function allPagesWarn() {
    if (!allPagesLoaded && $("#allpages-error").length === 0) {
      $(".notes").after(`<p class="error" id="allpages-error">
          Page index not done loading, please try again in ${allPagesLoadWait()}
          seconds to get newer problems.
        </p>`);
    } else if (allPagesLoaded) {
      $("#allpages-error").remove();
    }
  }

  function allPagesWarnAC() {
    if (!allPagesLoaded && $("#allpages-ac-error").length === 0) {
      $(".button-container").after(`<p class="error" id="allpages-ac-error">
          Page index not done loading, please reclick this section in
          ${allPagesLoadWait()} seconds to refresh the autocomplete suggestions.
        </p>`);
    } else if (allPagesLoaded) {
      $("#allpages-ac-error").remove();
    }
  }

  function fakeTex() {
    if ($("#input-serif").prop("checked")) {
      $(".article-text").addClass("serif-text");
    }
  }

  function changeName() {
    name = $("#input-name").val();
    if (name) $("#batch-header").html(name);
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
      let href = $(this).attr("href");
      if (href.includes("artofproblemsolving.com/wiki/")) {
        event.preventDefault();
        let pagename = href.replace(
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

  function hideLinks() {
    if ($("#input-hide").prop("checked")) {
      $(".source-link").addClass("noprint");
    }
  }

  function collapseSolutions() {
    $("#solutions-header").click(() => {
      $("#solutions-section").toggleClass("section-collapsed");
    });
  }
})();
