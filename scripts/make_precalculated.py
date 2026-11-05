"""Write the precalculated analysis that the web page shows when it opens.

The file holds the same result shapes the API returns for the default selection, so the page can
display it at once, before anyone runs a calculation. Run it again after the data or the default
selection changes:

    DJANGO_SETTINGS_MODULE=ramasceneMasterProject.config.dev DATASETS_DIR=... DATASETS_VERSION=... \\
        python scripts/make_precalculated.py

Arguments (all optional): --sector, --country, --indicator, --year, --out
"""
import argparse
import datetime
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import django  # noqa: E402

django.setup()

from django.conf import settings  # noqa: E402

from ramascene import dataset, dimensions, querymanagement  # noqa: E402
from ramascene.analyze import Analyze  # noqa: E402
from ramascene.models import Country, Indicator, Product  # noqa: E402

PRODUCTS = dimensions.n_products()
TREND_POINTS = 5


def load(year, name, mmap=False):
    path = os.path.join(settings.DATASET_DIR, str(year), f"{name}_{settings.DATASET_VERSION}.npy")
    return np.load(path, mmap_mode="r" if mmap else None)


def trend_years(years, selected):
    years = sorted(years)
    picked = {selected}
    for i in range(TREND_POINTS):
        picked.add(years[round(i * (len(years) - 1) / (TREND_POINTS - 1))])
    return sorted(picked)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sector", default="Production of electricity by coal")
    parser.add_argument("--country", default="Netherlands")
    parser.add_argument("--indicator", default="GHG emissions: Total")
    parser.add_argument("--year", type=int, default=2023)
    parser.add_argument("--out", default="frontend/public/precalculated.json")
    args = parser.parse_args()

    sector = Product.objects.get(name=args.sector, identifier="LEAF")
    country = Country.objects.get(name=args.country, identifier="LEAF")
    indicator = Indicator.objects.get(name=args.indicator)
    s_idx = int(sector.local_id) - 1
    c_idx = int(country.local_id) - 1
    i_idx = int(indicator.global_id) - 1
    unit = {indicator.name: indicator.unit}
    country_names = querymanagement.get_leaf_country_names()
    n_countries = len(country_names)
    sector_rows = np.arange(n_countries) * PRODUCTS + s_idx

    years = dataset.years() or sorted(int(y) for y in os.listdir(settings.DATASET_DIR) if y.isdigit())
    chosen = trend_years(years, args.year)

    def envelope(values):
        return {"unit": unit, "rawResultData": values}

    trend = {}
    for year in chosen:
        L = load(year, "L", mmap=True)
        B = load(year, "B")
        Y = load(year, "Y")
        b = np.asarray(B[i_idx, :])
        # footprint of the consuming country from its consumption of the sector, wherever it is made
        trend[year] = float(b @ (np.asarray(L[:, sector_rows]) @ np.asarray(Y[sector_rows, c_idx])))
        print("trend", year, trend[year])

    L = load(args.year, "L", mmap=True)
    B = load(args.year, "B")
    Y = load(args.year, "Y")
    b = np.asarray(B[i_idx, :])
    bL = b @ L  # footprint per unit of final demand, for every product in every country
    footprint_all = {country_names[c]: float(bL[sector_rows] @ Y[sector_rows, c]) for c in range(n_countries)}
    footprint_regions = {country_names[c]: float(bL @ Y[:, c]) for c in range(n_countries)}
    x = np.asarray(L @ Y.sum(axis=1))
    direct = {country_names[c]: float(b[c * PRODUCTS + s_idx] * x[c * PRODUCTS + s_idx]) for c in range(n_countries)}

    def route_one(products, countries):
        analysis = Analyze(np.array(products), np.array(countries), np.array([i_idx]), {}, unit,
                           "precalculated", 0, np.arange(n_countries), Y, B, L)
        return json.loads(analysis.route_one())

    contributions = route_one([s_idx], [c_idx])
    produced = route_one([s_idx], list(range(n_countries)))
    everything = route_one(list(range(PRODUCTS)), list(range(n_countries)))

    # The views of the same footprint must agree; consumption and production side add up to one global total
    assert abs(sum(produced["origins"].values()) - sum(footprint_all.values())) <= 1e-9 * abs(sum(footprint_all.values())), "production side differs"
    total_sector = sum(footprint_all.values())
    assert abs(everything["consumed"][args.sector] - total_sector) <= 1e-9 * abs(total_sector), "sector totals differ"
    assert abs(sum(footprint_regions.values()) - sum(everything["consumed"].values())) <= 1e-9 * abs(total_sector * 1e3 + 1)
    assert abs(sum(contributions["rawResultData"].values()) - footprint_all[args.country]) <= 1e-9 * abs(footprint_all[args.country]), "country totals differ"

    result = {
        "context": {
            "sector": args.sector, "country": args.country, "indicator": args.indicator,
            "year": args.year, "years": chosen,
            "generated": datetime.date.today().isoformat(),
        },
        "results": {
            "footprintCountry": envelope({args.country: footprint_all[args.country]}),
            "footprintAll": envelope(footprint_all),
            "produced": {"unit": unit, "rawResultData": produced["rawResultData"], "origins": produced["origins"]},
            "direct": envelope(direct),
            "contributions": {"unit": unit, "rawResultData": contributions["rawResultData"],
                              "consumed": contributions["consumed"], "supply": contributions["supply"]},
            "topSectors": {"unit": unit, "rawResultData": {}, "consumed": everything["consumed"]},
            "topRegions": envelope(footprint_regions),
            "trend": {str(year): value for year, value in trend.items()},
        },
    }
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w") as handle:
        json.dump(result, handle, separators=(",", ":"))
    print("wrote", args.out, os.path.getsize(args.out), "bytes")


if __name__ == "__main__":
    main()
