// Hi-Lo logic: rules and predicates
(function (global) {
    const bets = [
        ["1 5", "5 ต่ำ", "11", "ไฮโล", "6 ต่ำ", "6 2"],
        ["1 6", "_1", "ต่ำ", "สูง", "_6", "6 1"],
        ["2 5", "_2", "_3", "_4", "_5", "5 2"],
        ["1 2 3", "3 6", "2 4", "3 5", "4 1", "4 5 6"],
    ];

    const rules = [
        [
            { type: 'pair', nums: [1, 5] },
            { type: 'sum', value: 5 },
            { type: 'sum', value: 11 },
            { type: 'sum', value: 11 },
            { type: 'sum', value: 6 },
            { type: 'pair', nums: [6, 2] },
        ],
        [
            { type: 'pair', nums: [1, 6] },
            { type: 'single', num: 1 },
            { type: 'low' },
            { type: 'high' },
            { type: 'single', num: 6 },
            { type: 'pair', nums: [6, 1] },
        ],
        [
            { type: 'pair', nums: [2, 5] },
            { type: 'single', num: 2 },
            { type: 'single', num: 3 },
            { type: 'single', num: 4 },
            { type: 'single', num: 5 },
            { type: 'pair', nums: [5, 2] },
        ],
        [
            { type: 'combo3', nums: [1, 2, 3] },
            { type: 'pair', nums: [3, 6] },
            { type: 'pair', nums: [2, 4] },
            { type: 'pair', nums: [3, 5] },
            { type: 'pair', nums: [4, 1] },
            { type: 'combo3', nums: [4, 5, 6] },
        ],
    ];

    function sum(d1, d2, d3) { return d1 + d2 + d3; }
    function counts(d1, d2, d3) {
        const c = [0, 0, 0, 0, 0, 0, 0];
        c[d1]++; c[d2]++; c[d3]++;
        return c;
    }
    function isTriple(d1, d2, d3) { return d1 === d2 && d2 === d3; }

    function makePredicate(rule) {
        if (!rule) return () => false;
        switch (rule.type) {
            case 'sum':
                return (d1, d2, d3) => sum(d1, d2, d3) === rule.value;
            case 'low':
                return (d1, d2, d3) => !isTriple(d1, d2, d3) && sum(d1, d2, d3) >= 4 && sum(d1, d2, d3) <= 10;
            case 'high':
                return (d1, d2, d3) => !isTriple(d1, d2, d3) && sum(d1, d2, d3) >= 11 && sum(d1, d2, d3) <= 17;
            case 'single':
                return (d1, d2, d3) => counts(d1, d2, d3)[rule.num] > 0;
            case 'pair':
                return (d1, d2, d3) => {
                    const c = counts(d1, d2, d3);
                    return c[rule.nums[0]] > 0 && c[rule.nums[1]] > 0;
                };
            case 'combo3':
                return (d1, d2, d3) => {
                    const c = counts(d1, d2, d3);
                    return rule.nums.every((n) => c[n] > 0);
                };
            default:
                return () => false;
        }
    }

    function check(rule, dice) {
        const [d1, d2, d3] = dice;
        return makePredicate(rule)(d1, d2, d3);
    }

    function roll() {
        const die = () => Math.floor(Math.random() * 6) + 1;
        return [die(), die(), die()];
    }

    function isWinAt(row, col, dice) {
        const rule = rules[row]?.[col];
        if (!rule) return false;
        return check(rule, dice);
    }

    function evaluateSelected(selected, dice) {
        // selected: Set of keys "r,c"
        const results = {};
        selected.forEach((key) => {
            const [r, c] = key.split(',').map((n) => parseInt(n, 10));
            results[key] = isWinAt(r, c, dice);
        });
        return results;
    }

    global.HiLo = { bets, rules, sum, counts, isTriple, makePredicate, check, roll, isWinAt, evaluateSelected };
})(window);
