document.getElementById("year").textContent = String(new Date().getFullYear());

const portrait = document.getElementById("portrait");
if (portrait) {
  const block = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  portrait.addEventListener("contextmenu", block);
  portrait.addEventListener("dragstart", block);
}
