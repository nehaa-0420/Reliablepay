const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('scripts/sweep_results.json', 'utf8'));

console.log('| Parameter Configuration | NAIVE Dup Orders | PROTECTED Dup Orders | NAIVE Overcharged (₹) | PROTECTED Overcharged (₹) | PROTECTED Recovery (ms) | P95 Latency (ms) |');
console.log('|:---|:---:|:---:|:---:|:---:|:---:|:---:|');

raw.forEach(item => {
    const nDup = `${item.naive.duplicateOrders.mean.toFixed(1)} [${item.naive.duplicateOrders.min}-${item.naive.duplicateOrders.max}]`;
    const pDup = `**${item.protected.duplicateOrders.mean.toFixed(0)}** [${item.protected.duplicateOrders.min}-${item.protected.duplicateOrders.max}]`;
    const nOver = `₹${item.naive.overcharged.mean.toFixed(2)}`;
    const pOver = `**₹${item.protected.overcharged.mean.toFixed(2)}**`;
    const pRec = `${item.protected.recoveryMs.mean.toFixed(0)} ms [${item.protected.recoveryMs.min.toFixed(0)}-${item.protected.recoveryMs.max.toFixed(0)}]`;
    const pP95 = `${item.protected.p95LatencyMs.mean.toFixed(1)} ms`;
    console.log(`| ${item.label} | ${nDup} | ${pDup} | ${nOver} | ${pOver} | ${pRec} | ${pP95} |`);
});
