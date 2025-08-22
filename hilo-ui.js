// Hi-Lo UI: rendering and interactions
(function () {
    if (!window.HiLo) return;
    const { bets, rules, roll, evaluateSelected, computeReturn } = window.HiLo;

    function createDieSVG(value, color = "#000", withBorder = false) {
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
        const rect = withBorder ? `<rect x="0.5" y="0.5" width="35" height="35" rx="6" ry="6" fill="#fff" stroke="#000" />` : "";
        return `
            <span class="die" aria-label="die-${value}">
                <svg viewBox="0 0 36 36" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
                    ${rect}${circles}
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
    let reloads = 0;
    let chip = 10;

    const STORAGE_KEYS = {
        balance: 'hilo.balance',
        reloads: 'hilo.reloads',
        chip: 'hilo.chip',
    };

    function loadState() {
        try {
            const b = localStorage.getItem(STORAGE_KEYS.balance);
            const r = localStorage.getItem(STORAGE_KEYS.reloads);
            const c = localStorage.getItem(STORAGE_KEYS.chip);
            if (b !== null) balance = Number(b) || balance;
            if (r !== null) reloads = Number(r) || reloads;
            if (c !== null) chip = Number(c) || chip;
        } catch (_) {}
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEYS.balance, String(Math.floor(balance)));
            localStorage.setItem(STORAGE_KEYS.reloads, String(Math.floor(reloads)));
            localStorage.setItem(STORAGE_KEYS.chip, String(Math.floor(chip)));
        } catch (_) {}
    }

    function keyOf(r, c) { return `${r},${c}`; }
    function getCell(r, c) { return document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`); }
    function updateBalance() { document.getElementById('balance').textContent = String(Math.max(0, Math.floor(balance))); }
    function updateReloads() { const el = document.getElementById('reloads'); if (el) el.textContent = String(Math.max(0, Math.floor(reloads))); }
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
        tag.textContent = `฿${amt}`;
    }

    function bootstrap() {
        const grid = document.getElementById("grid");
        const bannerEl = document.querySelector('.banner');
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

        const rolled = document.getElementById('rolled');
        const status = document.getElementById('status');
        const chipsEl = document.getElementById('chips');
        const refundBtn = document.getElementById('refundBtn');
        const redeemBtn = document.getElementById('redeemBtn');

        // Load persisted state (local-only)
        loadState();
        updateBalance();

        function setupChips() {
            const values = [1,5,10,25,50,100];
            chipsEl.innerHTML = '';
            values.forEach(v => {
                const b = document.createElement('button');
                b.className = 'chip' + (v === chip ? ' active' : '');
                b.dataset.val = String(v);
                b.dataset.label = `฿${v}`;
                b.addEventListener('click', () => {
                    chip = v;
                    Array.from(chipsEl.children).forEach(el => el.classList.remove('active'));
                    b.classList.add('active');
                    saveState();
                });
                chipsEl.appendChild(b);
            });
        }
        setupChips();
        refundBtn.addEventListener('click', () => { refundAll(); saveState(); });

        // Simple redeem system (word-only, no suffix)
        // Rule: When reloads = r, the only valid code is WORDS[r]. On success:
        // balance += 1000; reloads += 1. After the last word, no more codes are valid.
        const WORDS = ['ELEPHANT','MANGO','LOTUS','SIAM','TUKTUK','COCONUT','TEMPLE','CURRY','DURIAN','COBRA'];
        function expectedCode() {
            if (reloads >= WORDS.length) return null; // no more codes
            return WORDS[reloads];
        }
        function redeem() {
            const input = (window.prompt('Enter redeem code for ฿1000') || '').trim().toUpperCase();
            if (!input) return;
            const code = expectedCode();
            if (code === null) {
                status.textContent = 'No more redeem codes available.';
                return;
            }
            if (input === code) {
                balance += 1000;
                reloads += 1;
                updateBalance();
                updateReloads();
                saveState();
                status.textContent = `Redeemed ฿1000 (reload ${reloads}).`;
            } else {
                status.textContent = 'Invalid code.';
            }
        }
        redeemBtn.addEventListener('click', redeem);

        function renderRolled(d1, d2, d3) {
            const pip = (n) => createDieSVG(n, (n === 1 || n === 4) ? '#c21807' : '#000', true);
            rolled.innerHTML = `${pip(d1)}${pip(d2)}${pip(d3)}`;
        }

        function clearWinLose() {
            document.querySelectorAll('.cell.win, .cell.lose').forEach(el => {
                el.classList.remove('win', 'lose');
            });
        }

        let rolling = false;
        function doRoll() {
            if (rolling) return;
            rolling = true;
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
                status.textContent = `Sum ${dice[0]+dice[1]+dice[2]} — Bets ฿${totalBets}, Returned ฿${returnsTotal}`;
                // Clear all bets after resolution
                betsMap.clear();
                document.querySelectorAll('.amt').forEach(el => el.remove());
                rolling = false;
                saveState();
            }, duration);
        }

        // show dice initially
        renderRolled(1,2,3);
        rolled.addEventListener('click', doRoll);
        updateBalance();
        updateReloads();
        saveState();

        // Adjust bottom spacing based on bet panel height to avoid scrollbars when not needed
        const panel = document.querySelector('.bottomControls');
        function setPanelHeightVar() {
            if (!panel) return;
            const h = panel.offsetHeight || 0;
            document.documentElement.style.setProperty('--panel-h', h + 'px');
        }
        setPanelHeightVar();
        window.addEventListener('resize', setPanelHeightVar);
        // Recompute after chips render/changes
        setTimeout(setPanelHeightVar, 0);

        // Toggle banner underlay only when side gaps exist (w/h > image AR)
        function adjustBannerUnderlay() {
            if (!bannerEl) return;
            const rect = bannerEl.getBoundingClientRect();
            const boxAR = rect.width / rect.height;
            const imgAR = 1280 / 524; // banner.png aspect ratio
            if (boxAR > imgAR + 0.01) bannerEl.classList.add('wide');
            else bannerEl.classList.remove('wide');
        }
        adjustBannerUnderlay();
        window.addEventListener('resize', adjustBannerUnderlay);
        // Also run after image load
        const bannerImg = bannerEl ? bannerEl.querySelector('img') : null;
        if (bannerImg) bannerImg.addEventListener('load', adjustBannerUnderlay, { once: true });
    }

    document.addEventListener("DOMContentLoaded", bootstrap);
})();
