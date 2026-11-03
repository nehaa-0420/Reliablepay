# ReliablePay — Demo Preset Benchmark Results (3 Replications)

- **Date**: 2026-11-03T18:14:14.101Z
- **Machine**: Windows_NT 10.0.26300 (x64), Node v24.19.0
- **Configuration**: `count=60, concurrency=10, duplicateSubmitRate=0.2, timeoutRate=0.3, errorRate=0.1, latencyMs=500`
- **Replications**: 3 consecutive runs with database reset between runs
- **Safety Invariant**: PROTECTED mode produced **0** duplicate debits across all runs (Zero Financial Loss).

## 1. Summary Statistics Table

| Metric | NAIVE (Mean) | NAIVE (Min - Max) | PROTECTED (Mean) | PROTECTED (Min - Max) | Delta / Improvement |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Duplicate Orders Count** | 18.33 | 17 - 19 | **0.00** | **0 - 0** | 100% Elimination (18.3 -> 0) |
| **Overcharged Amount (INR)** | ₹2300.00 | ₹1900.00 - ₹2600.00 | **₹0.00** | **₹0.00 - ₹0.00** | ₹2300.00 Protected |
| **Retry Success Rate (%)** | 89.7% | 88.0% - 90.9% | **100.0%** | **100.0% - 100.0%** | +10.3% |
| **Avg Recovery Time (ms)** | 21803.74 | 20719.201636363636 - 23497.039321428572 | **22361.11** | **21492.788533333332 - 23117.102466666667** | Reconciliation trade-off |
| **Avg Latency (ms)** | 594.83 | 571.5871559633027 - 608.4862385321101 | **694.32** | **573.797619047619 - 771.7948717948718** | Reconciliation trade-off |
| **P95 Latency (ms)** | 2005.33 | 2005 - 2006 | **2005.00** | **2004 - 2006** | Reconciliation trade-off |

## 2. Individual Run Details

| Run | Experiment ID | NAIVE Dups (Loss) | PROTECTED Dups (Loss) | NAIVE P95 Latency | PROTECTED P95 Latency | Duration |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| Run 1 | `7cf1dcce-994e-48e6-b326-930880df4273` | 19 (₹2400.00) | **0 (₹0.00)** | 2006 ms | 2006 ms | 61.1s |
| Run 2 | `ed7918c9-986f-44c3-b918-ead0da98d6c1` | 19 (₹2600.00) | **0 (₹0.00)** | 2005 ms | 2004 ms | 70.1s |
| Run 3 | `7d630922-baa0-4a06-b422-f1a8485db5cc` | 17 (₹1900.00) | **0 (₹0.00)** | 2005 ms | 2005 ms | 71.9s |

## 3. Raw Data Files
- [demo_run_1.json](demo_run_1.json)
- [demo_run_2.json](demo_run_2.json)
- [demo_run_3.json](demo_run_3.json)
- [results_summary.csv](results_summary.csv)
