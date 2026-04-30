const themeSelect = document.getElementById("theme-select");
const savedTheme = window.localStorage.getItem("slop-shop-theme");

function applyTheme(theme) {
  const validThemes = ["cat", "purple"];
  const nextTheme = validThemes.includes(theme) ? theme : "cat";
  document.body.dataset.theme = nextTheme;

  if (themeSelect) {
    themeSelect.value = nextTheme;
  }

  window.localStorage.setItem("slop-shop-theme", nextTheme);
}

applyTheme(savedTheme || document.body.dataset.theme || "cat");

if (themeSelect) {
  themeSelect.addEventListener("change", (event) => {
    applyTheme(event.target.value);
  });
}
