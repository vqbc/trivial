/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import { useEffect } from "react";

export default function About() {
  useEffect(() => {
    document.title = "About - Trivial Math Practice";
    return () => {
      document.title = "Trivial Math Practice";
    };
  }, []);

  return (
    <div className="problem-section" id="about-section">
      <h2 className="section-header" id="about-header">
        About Us
      </h2>
      <div className="article-text" id="about-text">
        <p>
          Trivial is a site for unlimited problem practice and other learning
          features, based on the vast database of the{" "}
          <a href="https://artofproblemsolving.com/wiki/index.php?title=Main_Page">
            Art of Problem Solving Wiki
          </a>
          . We started it in 2020, after frustration at how inconvenient and
          expensive preparing for exams like the AMC could be.
        </p>
        <p>
          At its core, Trivial provides tools to efficiently get and practice
          solving problems, either one-by-one or in sets. In addition to the
          many options for filtering and finding problems, there are also
          various helpful features loosely inspired by resources like Alcumus
          and IXL, including answer checking and problem streaks. For both
          problems and articles we have full search and history functionality,
          plus a print-friendly layout.
        </p>
        <p>
          People use Trivial for various purposes, whether it’s preparing for
          large upcoming competitions like the AMC or sharpening math skills
          over the summer. Tens of thousands of learners from over a hundred
          countries have used Trivial — we hope you’ll find it essential in
          your own studies!
        </p>
        <h3>Acknowledgements</h3>
        <p>
          This site is designed and maintained by{" "}
          <a href="https://github.com/vqbc">Andi Chang</a> with help from the
          Trivial team of volunteers on{" "}
          <a href="https://github.com/vqbc/trivial">Github</a> and{" "}
          <a href="https://discord.gg/VExpSZfkAE">Discord</a>, and built using{" "}
          <a href="https://react.dev/">React</a>,{" "}
          <a href="https://vitejs.dev/">Vite</a>,{" "}
          <a href="https://katex.org/">KaTeX</a>,{" "}
          <a href="https://github.com/react-component/slider">rc-slider</a>, &{" "}
          <a href="https://vega.github.io/vega/">Vega</a>, with icons from{" "}
          <a href="http://www.entypo.com/">Entypo</a>. Please{" "}
          <a href="https://forms.gle/3ofW7BQ5g5UBmknH9">contact us</a> for any
          further inquiries.
        </p>
        <p>
          Article and problem text obtained from the{" "}
          <a href="https://artofproblemsolving.com/wiki/index.php?title=Main_Page">
            Art of Problem Solving Wiki
          </a>
          .
        </p>
        <p>
          AMC problems are copyrighted by the{" "}
          <a href="https://www.maa.org/">Mathematical Association of America</a>
          .
        </p>
      </div>
    </div>
  );
}
