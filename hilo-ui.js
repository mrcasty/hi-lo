// Hi-Lo UI: rendering and interactions
(function () {
    if (!window.HiLo) return;
    const { bets, roll, evaluateSelected } = window.HiLo;

    function createDieSVG(value, color = "#000") {
        const L = 6, C = 18, R = 30, T = 6, M = 18, B = 30;
        const p = ({
            1: [[C, M]],
            2: [[L, T], [R, B]],
            3: [[L, T], [C, M], [R, B]],
            4: [[L, T], [L, B], [R, T], [R, B]],
            5: [[L, T], [L, B], [R, T], [R, B], [C, M]],
            6: [[L, T], [L, M], [L, B], [R, T], [R, M], [R, B]],
        })[value] || [];
        const r = 5;
        const circles = p
            .map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" />`)
            .join("");
        return `
            <span class="die" aria-label="die-${value}">
                <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
                    ${circles}
                </svg>
            </span>
        `;
    }

    function renderToken(token) {
        if (/^_([1-6])$/.test(token)) {
            const n = Number(token.slice(1));
            const pipColor = (n === 1 || n === 4) ? "#c21807" : "#000";
            return createDieSVG(n, pipColor);
        }
        if (token === "ต่ำ" || token === "สูง" || token === "ไฮโล") {
            const cls = token === "ไฮโล" ? "token thai red" : "token thai";
            return `<span class="${cls}">${token}</span>`;
        }
        if (/^\d+$/.test(token)) {
            const isRed = token === "11" || token === "1" || token === "4";
            return `<span class="token${isRed ? " red" : ""}">${token}</span>`;
        }
        return `<span class="token">${token}</span>`;
    }

    function renderCellLabel(label, r, c) {
        if (label.trim() === "ต่ำ" && r === 1 && c === 2) {
            return `<div class="content"><span class="token thai red">ต่ำ</span></div>`;
        }
        const parts = label.split(/\s+/).filter(Boolean);
        const html = parts.map((part) => {
            if (/^_([1-6])$/.test(part)) {
                const n = Number(part.slice(1));
                const pipColor = (n === 1 || n === 4) ? "#c21807" : "#000";
                return createDieSVG(n, pipColor);
            }
            if (part === "ต่ำ" || part === "สูง" || part === "ไฮโล") {
                const cls = part === "ไฮโล" ? "token thai red" : "token thai";
                return `<span class="${cls}">${part}</span>`;
            }
            if (/^\d+$/.test(part)) {
                const isRed = part === "11" || part === "1" || part === "4";
                return `<span class="token${isRed ? " red" : ""}">${part}</span>`;
            }
            return renderToken(part);
        }).join(" ");
        return `<div class="content">${html}</div>`;
    }

    const selected = new Set(); // keys "r,c"

    function keyOf(r, c) { return `${r},${c}`; }
    function getCell(r, c) { return document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`); }
    function toggleSelection(r, c) {
        const key = keyOf(r, c);
        const cell = getCell(r, c);
        if (!cell) return;
        if (selected.has(key)) {
            selected.delete(key);
            cell.classList.remove('selected');
        } else {
            selected.add(key);
            cell.classList.add('selected');
        }
    }

    function bootstrap() {
        const grid = document.getElementById("grid");
        bets.forEach((row, r) => {
            row.forEach((label, c) => {
                const cell = document.createElement("div");
                cell.className = "cell";
                cell.dataset.row = String(r);
                cell.dataset.col = String(c);
                cell.innerHTML = renderCellLabel(label, r, c);
                cell.addEventListener("click", () => toggleSelection(r, c));
                grid.appendChild(cell);
            });
        });

        const rollBtn = document.getElementById('rollBtn');
        const rolled = document.getElementById('rolled');
        const status = document.getElementById('status');

        function renderRolled(d1, d2, d3) {
            const pip = (n) => createDieSVG(n, (n === 1 || n === 4) ? '#c21807' : '#000');
            rolled.innerHTML = `${pip(d1)}${pip(d2)}${pip(d3)}`;
        }

        function clearWinLose() {
            document.querySelectorAll('.cell.win, .cell.lose').forEach(el => {
                el.classList.remove('win', 'lose');
            });
        }

        function doRoll() {
            rollBtn.disabled = true;
            status.textContent = 'Rolling...';
            // simple animation
            const anim = setInterval(() => {
                const [a, b, c] = [
                    Math.floor(Math.random() * 6) + 1,
                    Math.floor(Math.random() * 6) + 1,
                    Math.floor(Math.random() * 6) + 1,
                ];
                renderRolled(a, b, c);
            }, 80);
            const duration = 1000 + Math.floor(Math.random() * 600);
            setTimeout(() => {
                clearInterval(anim);
                const dice = roll();
                renderRolled(...dice);
                clearWinLose();
                const results = evaluateSelected(selected, dice);
                let wins = 0, total = 0;
                Object.entries(results).forEach(([key, win]) => {
                    total++;
                    const [r, c] = key.split(',').map((n) => parseInt(n, 10));
                    const cell = getCell(r, c);
                    if (!cell) return;
                    cell.classList.add(win ? 'win' : 'lose');
                    if (win) wins++;
                });
                status.textContent = `Sum ${dice[0]+dice[1]+dice[2]} — Selected: ${total}, Wins: ${wins}`;
                rollBtn.disabled = false;
            }, duration);
        }

        rollBtn.addEventListener('click', doRoll);
    }

    document.addEventListener("DOMContentLoaded", bootstrap);
})();
