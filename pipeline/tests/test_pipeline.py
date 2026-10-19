import tempfile
import unittest
from pathlib import Path

import pandas as pd

from pipeline.run import ROOT, aggregate, clean, generate_raw, metrics, run

CACHE = ROOT / '.cache'
CACHE.mkdir(exist_ok=True)


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.row = {"id": "TX-000001", "date": "2025-01-01", "type": "receita", "category": "loja",
                    "amount_cents": 10000, "description": "Venda", "counterparty": "Fictício"}

    def test_known_metrics(self):
        df = pd.DataFrame([self.row, {**self.row, "id": "TX-000002", "type": "despesa", "category": "insumos", "amount_cents": 4000}])
        m = metrics(df)
        self.assertEqual((m["result_cents"], m["margin"], m["ticket_cents"]), (6000, .6, 10000))

    def test_missing_values_duplicates_and_aliases(self):
        row = {**self.row, "type": "despesa", "category": " MATÉRIA PRIMA ", "description": None}
        df, rejected, quality = clean(pd.DataFrame([row, row, {**self.row, "id": "TX-000002", "amount_cents": None}]))
        self.assertEqual(len(df), 1)
        self.assertEqual(df.iloc[0]["category"], "insumos")
        self.assertEqual(df.iloc[0]["description"], "Sem descrição")
        self.assertEqual((len(rejected), quality["duplicate_rows"]), (1, 1))

    def test_invalid_records_quarantined(self):
        for changes in [{"date": "2025-02-30"}, {"amount_cents": -1}, {"amount_cents": 1.5},
                        {"category": "desconhecida"}, {"type": "despesa"}, {"id": None}]:
            with self.subTest(changes=changes):
                df, bad, _ = clean(pd.DataFrame([{**self.row, **changes}]))
                self.assertTrue(df.empty)
                self.assertEqual(len(bad), 1)

    def test_conflicting_ids_fail(self):
        with self.assertRaises(ValueError):
            clean(pd.DataFrame([self.row, {**self.row, "amount_cents": 500}]))

    def test_missing_column_fails(self):
        with self.assertRaises(ValueError):
            clean(pd.DataFrame([{"id": 1}]))

    def test_zero_revenue(self):
        m = metrics(pd.DataFrame([self.row]).iloc[:0])
        self.assertIsNone(m["margin"])
        self.assertIsNone(m["ticket_cents"])

    def test_reproducible_generator(self):
        with tempfile.TemporaryDirectory(dir=CACHE) as tmp:
            p = Path(tmp) / "raw.csv"
            generate_raw(p)
            first = p.read_bytes()
            generate_raw(p)
            self.assertEqual(first, p.read_bytes())

    def test_full_pipeline_reconciliation(self):
        with tempfile.TemporaryDirectory(dir=CACHE) as tmp:
            p = run(Path(tmp))
            df = pd.DataFrame(p["transactions"])
            self.assertEqual(len(p["monthly"]), 24)
            self.assertTrue(df.id.is_unique)
            self.assertEqual(sum(m["revenue_cents"] for m in aggregate(df)), p["totals"]["revenue_cents"])
            self.assertEqual(sum(m["result_cents"] for m in p["monthly"]), p["totals"]["result_cents"])
            q = p["quality"]
            self.assertEqual(q["input_rows"], q["output_rows"] + q["rejected_rows"] + q["duplicate_rows"])
            self.assertEqual((q["rejected_rows"], q["duplicate_rows"]), (1, 2))


if __name__ == "__main__":
    unittest.main()
