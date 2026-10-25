// Loaded in <head> (no defer) so the theme is set before the page paints, which avoids a flash.
const root = document.documentElement;
let saved = null;
try {
  saved = localStorage.getItem("theme");
} catch (e) {} // storage can be blocked (private mode); fall back to the system setting
const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
root.dataset.theme = saved || (prefersDark ? "dark" : "light");

document.addEventListener("DOMContentLoaded", () => {
  // Theme toggle
  const toggle = document.querySelector(".theme-toggle");
  const sync = () => toggle.setAttribute("aria-pressed", root.dataset.theme === "dark");
  sync();
  toggle.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("theme", root.dataset.theme);
    } catch (e) {}
    sync();
  });

  // Home page background: the <ascii-art> element from ascii-magic.com, with a pause button.
  const scene = document.querySelector(".scene");
  if (scene) {
    const pauseButton = document.querySelector(".wave-toggle");
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let paused = reducedMotion; // the element ignores "reduce motion" by itself, so we start it frozen
    pauseButton.hidden = reducedMotion; // nothing to pause when it is already still

    // Every change builds a brand new element instead of editing the old one. The ascii-magic script has a
    // bug: changing an element's attributes while it is loading starts several animations at once, and only
    // the last one can be stopped, so "pause" would never fully work.
    const mount = () => {
      const art = document.createElement("ascii-art");
      art.setAttribute("piece", "moonlit-sea");
      art.setAttribute("look", "ascii");
      // The piece has a fixed shape (about 96 characters wide and 33 tall), so pick the text size that makes it
      // cover the screen. 57.6 and 35.8 are its width and height in pixels at size 1.
      art.setAttribute("size", Math.ceil(Math.max(innerWidth / 57.6, innerHeight / 35.8)));
      art.toggleAttribute("still", paused); // "still" shows one frame and stops the animation
      scene.replaceChildren(art);
    };

    // Wait for the ascii-magic script. If that site is down this never runs and the page just has no background.
    customElements.whenDefined("ascii-art").then(() => {
      mount();
      let timer;
      addEventListener("resize", () => {
        clearTimeout(timer);
        timer = setTimeout(mount, 200); // wait until the window has stopped changing size
      });
    });

    pauseButton.addEventListener("click", () => {
      paused = !paused;
      pauseButton.setAttribute("aria-pressed", paused);
      if (customElements.get("ascii-art")) mount();
    });
  }

  // Home page GitHub activity: one square per day for the last 26 weeks, from a free public API (no key needed).
  const contrib = document.querySelector("#contrib");
  if (contrib) {
    fetch("https://github-contributions-api.jogruber.de/v4/hhutso?y=last")
      .then((res) => res.json())
      .then((data) => {
        const days = data.contributions.slice(-182); // 26 weeks x 7 days
        const grid = contrib.querySelector(".contrib");
        // Start the first column on a Sunday by leaving empty cells before the first day
        const pad = new Date(days[0].date + "T00:00:00").getDay();
        grid.style.setProperty("--weeks", Math.ceil((pad + days.length) / 7));
        for (let i = 0; i < pad; i++) grid.append(document.createElement("span"));
        let total = 0;
        days.forEach((day) => {
          const cell = document.createElement("span");
          cell.dataset.level = day.level; // 0 (none) to 4 (most), which the CSS turns into a color
          cell.title = `${day.count} contributions on ${day.date}`;
          grid.append(cell);
          total += day.count;
        });
        // The squares are decoration, so this sentence is what screen readers get
        contrib.querySelector("p").textContent = `${total} contributions in the last six months`;
        contrib.hidden = false;
      })
      .catch(() => {}); // if the API is down or blocked, the section just stays hidden
  }

  // Case study sidebar: mark the link for the section currently on screen
  const links = document.querySelectorAll(".case-nav a");
  if (!links.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) =>
          a.toggleAttribute("aria-current", a.getAttribute("href") === "#" + entry.target.id)
        );
      });
    },
    { rootMargin: "-20% 0px -70% 0px" } // a section counts as "current" near the top of the screen
  );
  links.forEach((a) => observer.observe(document.querySelector(a.getAttribute("href"))));
});
