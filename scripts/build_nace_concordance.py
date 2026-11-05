"""NACE Rev. 2 -> EXIOBASE 3.11 industry concordance for the NUTS2 regionalization.

The CircuMAT record (Zenodo 15789999, SBS_MATCH.xlsx) maps NACE to the 200 products of EXIOBASE 3.3, but several of
its rows do not match the NACE definitions (checked against the file: J58/J59/J60 publishing and film point to
financial intermediation, J61 telecommunications to insurance, M69/M74/N78 legal, business and employment services
to health, C20 chemicals to biofuels and rubber, C21 pharmaceuticals to rubber). They are not carried over.
This table is written from the NACE Rev. 2 definitions and the names of the 163 industries. The employment of a
NACE row is spread evenly over the industries listed for it. Industries not listed here (agriculture, forestry,
fishing, public administration, education, health, membership organisations, households, extraterritorial bodies)
have no sector employment in Eurostat's SBS data; the regionalization uses the household-income share for them,
as the paper does for agriculture.

    python3 scripts/build_nace_concordance.py
writes python_ini/data/nace_to_industries.csv (nace, industry local id 1..163, weight) and
python_ini/data/nace_concordance_review.txt.
"""
from pathlib import Path

import pandas as pd

OUT = Path(__file__).resolve().parent.parent / "python_ini" / "data"
R = lambda a, b: list(range(a, b + 1))  # noqa: E731

NACE_TO_INDUSTRIES = {
    "B05": [20], "B06": [21, 22, 23], "B07": R(24, 31), "B08": [32, 33, 34], "B09": [21, 22, 23],
    "C10": R(35, 43) + [45], "C11": [44], "C12": [46], "C13": [47], "C14": [48], "C15": [49],
    "C16": [50, 51], "C17": [52, 53, 54], "C18": [55], "C19": [56, 57, 58],
    "C20": R(59, 63), "C21": [63], "C22": [64], "C23": R(65, 71), "C24": R(72, 84), "C25": [85],
    "C26": [87, 89, 90], "C27": [88], "C28": [86], "C29": [91], "C30": [92], "C31": [93], "C32": [90, 93],
    "C33": [85, 86],
    "D35": R(96, 111), "E36": [112], "E37": [151, 152], "E38": [94, 95] + R(139, 150) + R(153, 158), "E39": [94],
    "F41": [113], "F42": [113], "F43": [113],
    "G45": [115], "G46": [117], "G47": [116, 118],
    "H49": [120, 121, 122], "H50": [123, 124], "H51": [125], "H52": [126], "H53": [127],
    "I55": [119], "I56": [119],
    "J58": [55], "J59": [160], "J60": [160], "J61": [127], "J62": [133], "J63": [133],
    "L68": [131],
    "M69": [135], "M70": [135], "M71": [135], "M72": [134], "M73": [135], "M74": [135], "M75": [135],
    "N77": [132], "N78": [135], "N79": [126], "N80": [135], "N81": [135], "N82": [135],
    "S95": [161],
}


def main():
    rows = [(n, i, 1 / len(inds)) for n, inds in NACE_TO_INDUSTRIES.items() for i in inds]
    df = pd.DataFrame(rows, columns=["nace", "industry", "weight"])
    df.to_csv(OUT / "nace_to_industries.csv", index=False, float_format="%.10g")
    fed = set(df.industry)
    lines = ["Industries with no employment proxy (regional split by household income):",
             str(sorted(set(range(1, 164)) - fed)), "",
             "Industries fed by more than one NACE row:"]
    for i in sorted(fed):
        src = sorted(df[df.industry == i].nace)
        if len(src) > 1:
            lines.append(f"  {i}: {', '.join(src)}")
    lines += ["", "Judgement calls to review: C21 (pharmaceuticals) -> Chemicals nec; C33 (repair of machinery) -> "
              "fabricated metal and machinery; J59/J60 (film, broadcasting) -> Recreational, cultural; "
              "E38 waste collection and treatment -> recycling and all incineration, biogas, compost, landfill "
              "industries; D35 electricity, gas and steam -> all generation, transmission, distribution, gas, steam."]
    (OUT / "nace_concordance_review.txt").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
