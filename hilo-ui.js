// Hi-Lo UI: rendering and interactions
(function () {
    if (!window.HiLo) return;
    const { bets, rules, roll, evaluateSelected, computeReturn } = window.HiLo;

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

    const betsMap = new Map(); // key -> amount
    let balance = 1000;
    let chip = 10;

    function keyOf(r, c) { return `${r},${c}`; }
    function getCell(r, c) { return document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`); }
    function updateBalance() { document.getElementById('balance').textContent = String(Math.max(0, Math.floor(balance))); }
    function placeBet(r, c) {
        const key = keyOf(r, c);
        if (balance < chip) return; // insufficient
        balance -= chip;
        const cur = betsMap.get(key) || 0;
        const next = cur + chip;
        betsMap.set(key, next);
        updateAmtBadge(r, c, next);
        updateBalance();
    }
    function refundAll() {
        let refund = 0;
        betsMap.forEach((amt) => { refund += amt; });
        betsMap.clear();
        document.querySelectorAll('.amt').forEach(el => el.remove());
        if (refund > 0) {
            balance += refund;
            updateBalance();
        }
    }
    function updateAmtBadge(r, c, amt) {
        const cell = getCell(r, c);
        if (!cell) return;
        let tag = cell.querySelector('.amt');
        if (!tag) {
            tag = document.createElement('span');
            tag.className = 'amt';
            cell.appendChild(tag);
        }
        tag.textContent = `$${amt}`;
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
                cell.addEventListener("click", () => placeBet(r, c));
                grid.appendChild(cell);
            });
        });

        const rollBtn = document.getElementById('rollBtn');
        const rolled = document.getElementById('rolled');
        const status = document.getElementById('status');
        const chipsEl = document.getElementById('chips');
        const refundBtn = document.getElementById('refundBtn');
        const resetBtn = document.getElementById('resetBtn');
        updateBalance();

        function setupChips() {
            const values = [1,5,10,25,50,100];
            chipsEl.innerHTML = '';
            values.forEach(v => {
                const b = document.createElement('button');
                b.className = 'chip' + (v === chip ? ' active' : '');
                b.textContent = `$${v}`;
                b.addEventListener('click', () => {
                    chip = v;
                    Array.from(chipsEl.children).forEach(el => el.classList.remove('active'));
                    b.classList.add('active');
                });
                chipsEl.appendChild(b);
            });
        }
        setupChips();
        refundBtn.addEventListener('click', refundAll);
        resetBtn.addEventListener('click', () => { refundAll(); balance = 1000; updateBalance(); rolled.innerHTML=''; status.textContent='Add bets and roll.'; });

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
                let returnsTotal = 0;
                let totalBets = 0;
                betsMap.forEach((amt, key) => {
                    totalBets += amt;
                    const [r, c] = key.split(',').map((n) => parseInt(n, 10));
                    const rule = rules[r]?.[c];
                    const ret = computeReturn(rule, dice, amt);
                    if (ret > 0) {
                        returnsTotal += ret;
                        getCell(r, c)?.classList.add('win');
                    } else {
                        getCell(r, c)?.classList.add('lose');
                    }
                });
                if (returnsTotal > 0) balance += returnsTotal;
                updateBalance();
                status.textContent = `Sum ${dice[0]+dice[1]+dice[2]} — Bets $${totalBets}, Returned $${returnsTotal}`;
                // Clear all bets after resolution
                betsMap.clear();
                document.querySelectorAll('.amt').forEach(el => el.remove());
                rollBtn.disabled = false;
            }, duration);
        }

        rollBtn.addEventListener('click', doRoll);
    }

    document.addEventListener("DOMContentLoaded", bootstrap);
})();
