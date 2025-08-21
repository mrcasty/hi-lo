// Sic Bo game logic (externalized)
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

const state = {
    balance: 1000,
    chip: 10,
    bets: new Map(),
};

const DICE_UNICODE = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const balanceEl = $('#balance');
const chipsEl = $('#chips');
const tableEl = $('#table');
const diceEl = $('#dice');
const rollBtn = $('#roll');
const resultEl = $('#result');
const logEl = $('#log');

function fmt(n) {
    return Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function renderBalance() {
    balanceEl.textContent = fmt(state.balance);
}

function addLog(lines) {
    const now = new Date().toLocaleTimeString();
    const out = Array.isArray(lines) ? lines.join('\n') : String(lines || '');
    logEl.textContent = `[${now}]\n${out}\n\n` + logEl.textContent;
}

function setupChips() {
    const values = [1, 5, 10, 25, 50, 100];
    chipsEl.innerHTML = '';
    values.forEach((v) => {
        const b = document.createElement('button');
        b.className = 'chip' + (v === state.chip ? ' active' : '');
        b.textContent = `$${v}`;
        b.dataset.value = String(v);
        b.addEventListener('click', () => {
            state.chip = v;
            $$('.chip', chipsEl).forEach((el) => el.classList.toggle('active', el === b));
        });
        chipsEl.appendChild(b);
    });
}

function updateBetBadge(cell, amount) {
    const tag = $('.amount', cell);
    if (!tag) return;
    if (amount > 0) {
        tag.textContent = `$${fmt(amount)}`;
        tag.hidden = false;
    } else {
        tag.hidden = true;
    }
}

function placeBet(key, cell) {
    const amt = state.chip;
    if (state.balance < amt) {
        resultEl.innerHTML = `<span class="bad">Insufficient balance for $${fmt(amt)} chip.</span>`;
        return;
    }
    state.balance -= amt;
    const cur = state.bets.get(key) || 0;
    const next = cur + amt;
    state.bets.set(key, next);
    updateBetBadge(cell, next);
    renderBalance();
}

function refundBets() {
    let refunded = 0;
    state.bets.forEach((v) => (refunded += v));
    if (refunded > 0) {
        state.balance += refunded;
        renderBalance();
        addLog([`Refunded $${fmt(refunded)} in bets.`]);
    }
    state.bets.clear();
    $$('.bet', tableEl).forEach((cell) => updateBetBadge(cell, 0));
    resultEl.textContent = 'Bets cleared.';
}

function rollDie() {
    return Math.floor(Math.random() * 6) + 1;
}

function evaluate(d1, d2, d3) {
    const sum = d1 + d2 + d3;
    const isTriple = d1 === d2 && d2 === d3;
    const counts = [0, 0, 0, 0, 0, 0, 0];
    counts[d1]++;
    counts[d2]++;
    counts[d3]++;

    let returns = 0;
    const detail = [];

    state.bets.forEach((betAmt, key) => {
        let ret = 0; // total return (stake + winnings)
        if (key === 'big') {
            const win = !isTriple && sum >= 11 && sum <= 17;
            if (win) ret = betAmt * 2; // 1:1 + stake
        } else if (key === 'small') {
            const win = !isTriple && sum >= 4 && sum <= 10;
            if (win) ret = betAmt * 2;
        } else if (key === 'anyTriple') {
            if (isTriple) ret = betAmt * 31; // 30:1 + stake
        } else if (key.startsWith('single-')) {
            const n = Number(key.split('-')[1]);
            const hit = counts[n];
            if (hit > 0) ret = betAmt * (1 + hit); // 1/2/3 : 1 + stake
        }

        if (ret > 0) {
            returns += ret;
            const profit = ret - betAmt;
            detail.push(`WIN ${key}: +$${fmt(profit)} (return $${fmt(ret)})`);
        } else {
            detail.push(`LOSE ${key}: -$${fmt(betAmt)}`);
        }
    });

    state.balance += returns;
    renderBalance();

    // Clear bets after resolution
    state.bets.clear();
    $$('.bet', tableEl).forEach((cell) => updateBetBadge(cell, 0));

    const sumInfo = `Dice ${d1}, ${d2}, ${d3} (sum ${sum})${isTriple ? ' — TRIPLE!' : ''}`;
    const won = detail.some((line) => line.startsWith('WIN'));
    resultEl.innerHTML = won
        ? `<span class="good">${sumInfo}</span>`
        : `<span class="bad">${sumInfo}</span>`;
    addLog([sumInfo, ...detail]);
}

function renderDice(d1, d2, d3) {
    diceEl.innerHTML = `
        <span class="die">${DICE_UNICODE[d1 - 1]}</span>
        <span class="die">${DICE_UNICODE[d2 - 1]}</span>
        <span class="die">${DICE_UNICODE[d3 - 1]}</span>
    `.trim();
}

function animateRollThenResolve() {
    diceEl.classList.add('rolling');
    rollBtn.disabled = true;
    const interval = setInterval(() => {
        const r1 = rollDie();
        const r2 = rollDie();
        const r3 = rollDie();
        renderDice(r1, r2, r3);
    }, 80);

    const duration = 1000 + Math.floor(Math.random() * 600);
    setTimeout(() => {
        clearInterval(interval);
        const d1 = rollDie();
        const d2 = rollDie();
        const d3 = rollDie();
        renderDice(d1, d2, d3);
        diceEl.classList.remove('rolling');
        evaluate(d1, d2, d3);
        rollBtn.disabled = false;
    }, duration);
}

function handleRoll() {
    if (state.bets.size === 0) {
        resultEl.innerHTML = '<span class="bad">Place at least one bet.</span>';
        return;
    }
    animateRollThenResolve();
}

function bindTable() {
    $$('.bet', tableEl).forEach((cell) => {
        const key = cell.dataset.bet;
        cell.addEventListener('click', () => placeBet(key, cell));
    });
}

function resetGame() {
    refundBets();
    state.balance = 1000;
    renderBalance();
    logEl.textContent = '';
    resultEl.textContent = 'New game. Place your bets.';
    renderDice(1, 2, 3);
}

// Init after DOM is parsed (script loaded with defer)
renderBalance();
setupChips();
bindTable();
renderDice(1, 2, 3);
rollBtn.addEventListener('click', handleRoll);
$('#refund').addEventListener('click', refundBets);
$('#reset').addEventListener('click', resetGame);
