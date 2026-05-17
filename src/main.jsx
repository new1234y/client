import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import "./index.css";

// Global click particle burst for buttons
function spawnClickParticles(e) {
  const target = e.target.closest("button, [role='button'], a");
  if (!target) return;

  const rect = target.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const colors = ["#5B7FA5", "#E2C96D", "#C45454"];
  const shapes = ["square", "circle", "cushion"];
  const count = 5 + Math.floor(Math.random() * 4);

  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "click-particle";

    const color = colors[Math.floor(Math.random() * colors.length)];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const size = 4 + Math.random() * 7;
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const dist = 12 + Math.random() * 16;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;

    el.style.left = cx + "px";
    el.style.top = cy + "px";
    el.style.width = size + "px";
    el.style.height = size + "px";
    el.style.background = color;
    el.style.setProperty("--dx", dx + "px");
    el.style.setProperty("--dy", dy + "px");

    if (shape === "circle") {
      el.style.borderRadius = "50%";
    } else if (shape === "cushion") {
      el.style.borderRadius = "3px";
    } else {
      el.style.borderRadius = "1px";
    }

    document.body.appendChild(el);
    setTimeout(() => el.remove(), 500);
  }
}

document.addEventListener("click", spawnClickParticles, true);

ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
