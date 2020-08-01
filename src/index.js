/* eslint-disable no-undef */
(() => {
  var allPages = [];
  var categoryPages = [];
  (async function() {
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

    if (typeof json.continue === "undefined") {
      console.log("Finished loading Special:AllPages.");
    }
  })();

  function clearProblem() {
    $(".problem-section").remove();
    $(".attribution").remove();
  }

  function clearAll() {
    $(".options-input-container").remove();
    $(".problem-section").remove();
    $(".attribution").remove();
  }

  function fixLinks() {
    $(".article-text a").each(function() {
      let href = $(this).attr("href");
      if (typeof href !== "undefined" && href.charAt(0) === "/")
        $(this).attr("href", `https://artofproblemsolving.com${href}`);
    });
  }

  async function directLinks() {
    $(".article-text a").click(async function(event) {
      let pagename = $(this).attr("href");
      if (pagename.includes("artofproblemsolving.com/wiki/")) {
        event.preventDefault();
        pagename = pagename
          .replace("https://artofproblemsolving.com/wiki/index.php/", "")
          .replace("_", " ");
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

  async function addArticle(pagename) {
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
    var params = `action=parse&page=${pagename}&format=json`;

    const response = await fetch(`${apiEndpoint}?${params}&origin=*`);
    const json = await response.json();

    if (typeof json.parse !== "undefined") {
      var problemText = json.parse.text["*"];
      $(".article-text").html(problemText);
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

  async function addProblem(pagename) {
    function getProblem(htmlString) {
      console.log(htmlString);
      let htmlParsed = $.parseHTML(htmlString);
      if (
        $(htmlParsed)
          .children()
          .filter("h2:contains('Problem'), h3:contains('Problem')").length
      ) {
        let before = $(htmlParsed)
          .children()
          .filter("h2:contains('Problem'), h3:contains('Problem')")
          .nextUntil("h2, h3");
        let beforeHTML = "";

        before.each(function() {
          beforeHTML += this.outerHTML;
        });
        return beforeHTML;
      } else {
        return htmlString;
      }
    }

    function getSolutions(htmlString) {
      let htmlParsed = $.parseHTML(htmlString);
      let after = $(htmlParsed)
        .children()
        .filter("h2:contains('Solution'), h3:contains('Solution')")
        .nextUntil("h2, h3, table")
        .addBack(
          `h2:contains('Solution '), h3:contains('Solution '),
          h2:contains(' Solution'), h3:contains(' Solution')`
        );
      let afterHTML = "";

      after.each(function() {
        afterHTML += this.outerHTML;
      });
      return afterHTML;
    }

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
    var params = `action=parse&page=${pagename}&format=json`;

    const response = await fetch(`${apiEndpoint}?${params}&origin=*`);
    const json = await response.json();

    if (typeof json.parse !== "undefined") {
      var problemText = json.parse.text["*"];
      $("#problem-text").html(getProblem(problemText));
      $("#solutions-text").html(getSolutions(problemText));
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

    if (subjects.some(e => e.value === "(All Subjects)")) {
      for (let problem of allPages) {
        if (
          problem.includes("Problems/Problem") &&
          matchesOptions(problem, tests, yearsFrom, yearsTo, diffFrom, diffTo)
        )
          pages.push(problem);
      }
    } else {
      for (let subject of subjects) {
        if (categoryPages.some(e => e.subject === subject.value)) {
          addPagesFromArray(
            categoryPages.find(e => e.subject === subject.value).pages
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
        problemDiff = 3;
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
      <p>
      *Difficulty levels will likely be more inaccurate for earlier years,
      because of changes in competition difficulty and problem design over time.
      </p>
      <p>
      **The script preloads a list of all pages in alphabetical order when the
      site is loaded, for use when a random page is selected from all subjects.
      Because it takes around 10 seconds to fully load, trying to get a
      problem before then will only give older problems early in alphabetical
      order.
      </p>
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

  $("#problem-batch").click(function() {
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

    await addArticle(
      $("#find-input .input-field")
        .val()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
    );
    fixLinks();
    directLinks();
  });

  $(".page-container").on("click", "#single-button", async function() {
    clearProblem();

    await addProblem(
      $("#single-input .input-field")
        .val()
        .replace("Problem", "Problems/Problem")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
    );
    fixLinks();
    collapseSolutions();
    directLinks();
  });

  $(".page-container").on("click", "#random-button", async function() {
    clearProblem();

    let pages = [];
    pages = await getPages();
    console.log(`${pages.length} total problems retrieved.`);
    let randomPage = pages[Math.floor(Math.random() * pages.length)];
    console.log(randomPage);

    addProblem(randomPage);
    if (pages.length === 0) {
      $("#solution-section").hide();
      $(".article-text").html(
        `<p class="error">No problems could be found meeting those requirements.</p>`
      );
    }
    fixLinks();
    collapseSolutions();
    directLinks();
  });
})();
