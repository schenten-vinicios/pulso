"""Execute com python -m pipeline.run. Valores monetários em centavos inteiros."""
from __future__ import annotations

import calendar
import hashlib
import json
import random
import unicodedata
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
SEED = 42
CATEGORIES = {
    "loja": ("Loja física", "receita"), "online": ("Loja online", "receita"),
    "corporativo": ("Encomendas corporativas", "receita"),
    "insumos": ("Insumos", "despesa"), "pessoal": ("Pessoal", "despesa"),
    "ocupacao": ("Ocupação", "despesa"), "marketing": ("Marketing", "despesa"),
    "operacao": ("Operação", "despesa"), "impostos": ("Impostos e taxas", "despesa"),
}
ALIASES = {"materia prima": "insumos", "folha": "pessoal", "aluguel": "ocupacao", "e-commerce": "online"}


def generate_raw(path: Path) -> pd.DataFrame:
    rng = random.Random(SEED)
    rows = []

    def add(date, category, cents, description, party):
        rows.append({"id": f"TX-{len(rows)+1:06}", "date": date, "type": CATEGORIES[category][1],
                     "category": category, "amount_cents": cents, "description": description, "counterparty": party})

    for i in range(24):
        year, month = 2024 + i // 12, i % 12 + 1
        days = calendar.monthrange(year, month)[1]
        seasonal = {1: .81, 2: .87, 6: 1.12, 7: 1.06, 11: 1.23, 12: 1.45}.get(month, 1)
        trend = (1 + i * .016) * (.86 if i in (15, 16, 17) else 1)
        month_revenue = 0
        for day in range(1, days + 1):
            date = f"{year}-{month:02}-{day:02}"
            weekend = pd.Timestamp(date).dayofweek >= 5
            count = round(rng.randint(10, 18) * seasonal * trend * (1.25 if weekend else 1))
            for _ in range(count):
                category = rng.choices(["loja", "online", "corporativo"], [76, 21, 3])[0]
                cents = round(rng.triangular(1800, 16500, 4800) * (4.4 if category == "corporativo" else 1))
                add(date, category, cents, {"loja": "Venda no balcão", "online": "Pedido na loja online", "corporativo": "Coffee break corporativo"}[category], "Cliente fictício")
                month_revenue += cents
            if day in (3, 10, 17, 24):
                add(date, "insumos", round(month_revenue * rng.uniform(.27, .34)), "Compra de café, alimentos e embalagens", "Fornecedor de insumos (fictício)")
                month_revenue = 0
        revenue = sum(r["amount_cents"] for r in rows if r["date"].startswith(f"{year}-{month:02}") and r["type"] == "receita")
        for cat, cents, day, desc in [
            ("pessoal", round(1260000 * (1 + i * .009)), 5, "Folha e encargos"),
            ("ocupacao", 420000 + (25000 if i >= 12 else 0), 10, "Aluguel e condomínio"),
            ("marketing", round(revenue * (.055 if month in (11, 12) else .035)), 15, "Campanhas e divulgação"),
            ("operacao", rng.randint(170000, 240000), 20, "Energia, internet e manutenção"),
            ("impostos", round(revenue * .075), 25, "Tributos e taxas de pagamento"),
        ]:
            add(f"{year}-{month:02}-{day:02}", cat, cents, desc, "Prestador fictício")
    df = pd.DataFrame(rows)
    # Problemas controlados para demonstrar limpeza, sem inventar valores financeiros.
    df.loc[0, "description"] = None
    df.loc[1, "counterparty"] = None
    df.loc[df["category"] == "insumos", "category"] = " Matéria prima "
    df.loc[df["category"] == "online", "category"] = "E-COMMERCE"
    invalid = df.iloc[[2]].copy()
    invalid["id"] = "TX-INVALID"
    invalid["amount_cents"] = None
    df = pd.concat([df, df.iloc[[10, 20]], invalid], ignore_index=True)
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    return df


def normalize(value) -> str:
    value = str(value).strip().lower()
    return "".join(c for c in unicodedata.normalize("NFKD", value) if not unicodedata.combining(c))


def clean(raw: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, dict]:
    required = ["id", "date", "type", "category", "amount_cents", "description", "counterparty"]
    if missing := set(required) - set(raw.columns):
        raise ValueError(f"Campos ausentes: {sorted(missing)}")
    df = raw[required].copy()
    df["category"] = df["category"].map(normalize).replace(ALIASES)
    df["type"] = df["type"].map(normalize)
    dates = pd.to_datetime(df["date"], format="%Y-%m-%d", errors="coerce")
    amounts = pd.to_numeric(df["amount_cents"], errors="coerce")
    valid = (df["id"].notna() & df["id"].astype(str).str.fullmatch(r"TX-\d{6}") & dates.notna()
             & amounts.notna() & amounts.gt(0) & amounts.mod(1).eq(0) & amounts.le(10**12)
             & df["category"].isin(CATEGORIES) & df["type"].isin(["receita", "despesa"]))
    expected_type = df["category"].map(lambda c: CATEGORIES.get(c, (None, None))[1])
    valid &= df["type"].eq(expected_type)
    rejected = df.loc[~valid].copy()
    df = df.loc[valid].copy()
    df["date"] = dates.loc[valid].dt.strftime("%Y-%m-%d")
    df["amount_cents"] = amounts.loc[valid].astype("int64")
    filled = 0
    for col, fallback in [("description", "Sem descrição"), ("counterparty", "Não informado")]:
        absent = df[col].isna() | df[col].astype(str).str.strip().eq("")
        filled += int(absent.sum())
        df.loc[absent, col] = fallback
    duplicates = int(df.duplicated().sum())
    df = df.drop_duplicates()
    if df["id"].duplicated().any():
        raise ValueError("IDs duplicados com conteúdos conflitantes")
    df = df.sort_values(["date", "id"]).reset_index(drop=True)
    report = {"input_rows": len(raw), "output_rows": len(df), "rejected_rows": len(rejected),
              "duplicate_rows": duplicates, "filled_optional_fields": filled}
    return df, rejected, report


def metrics(df: pd.DataFrame) -> dict:
    revenue = int(df.loc[df.type == "receita", "amount_cents"].sum())
    expenses = int(df.loc[df.type == "despesa", "amount_cents"].sum())
    sales = int(df.type.eq("receita").sum())
    return {"revenue_cents": revenue, "expenses_cents": expenses, "result_cents": revenue - expenses,
            "margin": (revenue - expenses) / revenue if revenue else None,
            "ticket_cents": revenue / sales if sales else None, "sales": sales}


def aggregate(df: pd.DataFrame) -> list[dict]:
    return [{"month": month, **metrics(group)} for month, group in df.groupby(df.date.str[:7], sort=True)]


def run(root: Path = ROOT) -> dict:
    raw_path = root / "data/raw/transactions.csv"
    generate_raw(raw_path)
    # A leitura é uma etapa explícita: o pipeline consome o CSV bruto.
    raw = pd.read_csv(raw_path, dtype={"id": "string"})
    df, rejected, quality = clean(raw)
    processed = root / "data/processed"
    processed.mkdir(parents=True, exist_ok=True)
    df.to_csv(processed / "transactions.csv", index=False)
    rejected.to_csv(processed / "rejected.csv", index=False)
    payload = {"schema_version": 1, "fictional": True, "seed": SEED,
               "business": "Casa Grão", "business_description": "Cafeteria e empório · empresa fictícia",
               "start": df.date.min(), "end": df.date.max(),
               "categories": [{"id": k, "label": v[0], "type": v[1]} for k, v in CATEGORIES.items()],
               "quality": quality, "totals": metrics(df), "monthly": aggregate(df),
               "transactions": df.to_dict(orient="records"),
               "source_sha256": hashlib.sha256(raw_path.read_bytes()).hexdigest()}
    target = root / "public/data/dashboard.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (processed / "quality.json").write_text(json.dumps(quality, indent=2), encoding="utf-8")
    pd.DataFrame(payload["monthly"]).to_csv(processed / "monthly.csv", index=False)
    print(json.dumps({"quality": quality, "totals": payload["totals"], "output": str(target)}, indent=2))
    return payload


if __name__ == "__main__":
    run()
