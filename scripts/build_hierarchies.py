"""Write the hierarchy files the app loads into its database from the converted EXIOBASE dataset.

Usage
    python scripts/build_hierarchies.py <dataset folder>/dataset_v5.json

Writes, in python_ini/data/
    mod_indicators.csv                                    indicator list (row i of B is global_id i + 1)
    mod_final_productTree_exiovisuals.csv                 Total > section > group > industry (selection trees)
    modelling_mod_final_productTree_exiovisuals.csv       the same industries for the scenario page
and checks that the existing country tree still matches the 49 regions of the dataset.
The grouping of the industries lives in scripts/exiobase_spec.py. Afterwards load the files with
    python manage.py populateHierarchies   (on an empty database)
"""
import csv
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import exiobase_spec as spec  # noqa: E402

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "python_ini", "data")
PRODUCT_HEADER = ["name", "code", "global_id", "parent_id", "local_id", "level", "identifier",
                  "leaf_children_global", "leaf_children_local"]


def write(name, header, rows):
    path = os.path.join(DATA, name)
    with open(path, "w", newline="") as fh:
        w = csv.writer(fh, delimiter="\t", lineterminator="\n")
        w.writerow(header)
        w.writerows(rows)
    print(f"wrote {path} ({len(rows)} rows)")


def join(values):
    return "#".join(str(v) for v in values)


def product_rows(industries, modelling):
    """Rows of a selection tree (modelling=False) or of the scenario tree (modelling=True).

    Selection tree: Total (global 1), sections, groups, industries; industries are numbered after all groups.
    Scenario tree: no Total row, sections at the top, and a final 'Y: Final Consumption' node.
    """
    prefix = "S: " if modelling else ""
    n_sec = len(spec.SECTIONS)
    n_grp = sum(len(g) for _, _, g in spec.SECTIONS)
    offset = 0 if modelling else 1                     # the Total row takes global id 1
    sec_id = {code: offset + i + 1 for i, (code, _, _) in enumerate(spec.SECTIONS)}
    grp_id, grp_parent, k = {}, {}, offset + n_sec
    for scode, _, groups in spec.SECTIONS:
        for gcode, _, _, _ in groups:
            k += 1
            grp_id[gcode], grp_parent[gcode] = k, sec_id[scode]
    leaf_base = offset + n_sec + n_grp                 # global id of industry j is leaf_base + j + 1
    n = len(industries)
    level0 = 2
    rows = []
    if modelling:
        rows.append(["Y: Final Consumption", "final_consumption", leaf_base + n + 1, 0, 1, 2,
                     "FINALCONSUMPTION", "None", "None"])
    else:
        rows.append(["Total", "total", 1, 0, 1, 1, "TOTAL",
                     join(leaf_base + j + 1 for j in range(n)), join(range(n))])
    for i, (scode, sname, groups) in enumerate(spec.SECTIONS):
        first, last = groups[0][2], groups[-1][3]
        rows.append([prefix + sname, scode, sec_id[scode], 0 if modelling else 1, i + 1, level0, "AGG",
                     join(leaf_base + j + 1 for j in range(first, last + 1)), join(range(first, last + 1))])
    local = 0
    for scode, _, groups in spec.SECTIONS:
        for gcode, gname, first, last in groups:
            local += 1
            rows.append([prefix + gname, gcode, grp_id[gcode], grp_parent[gcode], local, level0 + 1, "AGG",
                         join(leaf_base + j + 1 for j in range(first, last + 1)), join(range(first, last + 1))])
    for scode, _, groups in spec.SECTIONS:
        for gcode, _, first, last in groups:
            for j in range(first, last + 1):
                rows.append([prefix + industries[j], f"i{j + 1:03d}", leaf_base + j + 1, grp_id[gcode], j + 1,
                             level0 + 2, "LEAF", "None", "None"])
    ids = [r[2] for r in rows]
    assert len(set(ids)) == len(ids), "global ids are not unique"
    return rows


def main():
    meta = json.load(open(sys.argv[1]))
    industries, regions = meta["industries"], meta["regions"]
    assert len(industries) == spec.N_INDUSTRIES and len(regions) == spec.N_REGIONS

    # country tree: unchanged, but it must describe the same 49 regions in the same order
    with open(os.path.join(DATA, "mod_final_countryTree_exiovisuals.csv")) as fh:
        tree = [r for r in csv.DictReader(fh, delimiter="\t") if r["identifier"] == "LEAF"]
    assert [r["code"] for r in sorted(tree, key=lambda r: int(r["local_id"]))] == regions, \
        "country tree and dataset regions differ"
    print("country tree matches the dataset regions")

    write("mod_final_productTree_exiovisuals.csv", PRODUCT_HEADER, product_rows(industries, False))
    write("modelling_mod_final_productTree_exiovisuals.csv", PRODUCT_HEADER, product_rows(industries, True))

    table = meta["indicators"]
    level1 = [r for r in table if r["level"] == 1]
    rows = []
    for r in table:
        parent = 0 if r["parent"] is None else r["parent"] + 1
        same = [q for q in table if q["level"] == r["level"]]
        rows.append([r["name"], r["unit"], r["index"] + 1, parent, same.index(r) + 1, r["level"]])
    write("mod_indicators.csv", ["name", "unit", "global_id", "parent_id", "local_id", "level"], rows)
    print(f"{len(level1)} top-level indicators, {len(table) - len(level1)} sub-indicators")


if __name__ == "__main__":
    main()
