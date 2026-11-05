"""Write the hierarchy files the app loads into its database from the converted EXIOBASE dataset.

Usage
    python scripts/build_hierarchies.py <dataset folder>/dataset_v5.json

Writes, in python_ini/data/
    mod_indicators.csv                                    indicator list (row i of B is global_id i + 1)
    mod_final_productTree_exiovisuals.csv                 Total > theme > group > industry (selection trees)
    modelling_mod_final_productTree_exiovisuals.csv       the same industries for the scenario page
and checks that the existing country tree still matches the 49 regions of the dataset.
The grouping of the industries (themes > groups > industries) lives in scripts/exiobase_spec.py. Afterwards load the files with
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

    Selection tree: Total (global 1), themes, groups, industries; industries are numbered after all groups.
    Scenario tree: no Total row, themes at the top, and a final 'Y: Final Consumption' node.
    Industries keep their EXIOBASE position: industry j has local id j + 1 and global id leaf_base + j + 1,
    whatever the order of the rows in the file.
    """
    prefix = "S: " if modelling else ""
    n_theme = len(spec.THEMES)
    n_group = sum(len(g) for _, _, g in spec.THEMES)
    offset = 0 if modelling else 1                     # the Total row takes global id 1
    theme_id = {code: offset + i + 1 for i, (code, _, _) in enumerate(spec.THEMES)}
    group_id, group_parent, k = {}, {}, offset + n_theme
    for tcode, _, groups in spec.THEMES:
        for gcode, _, _ in groups:
            k += 1
            group_id[gcode], group_parent[gcode] = k, theme_id[tcode]
    leaf_base = offset + n_theme + n_group
    n = len(industries)
    gid = lambda members: join(leaf_base + j + 1 for j in sorted(members))
    lid = lambda members: join(sorted(members))
    rows = []
    if modelling:
        rows.append(["Y: Final Consumption", "final_consumption", leaf_base + n + 1, 0, 1, 2,
                     "FINALCONSUMPTION", "None", "None"])
    else:
        rows.append(["Total", "total", 1, 0, 1, 1, "TOTAL", gid(range(n)), lid(range(n))])
    for i, (tcode, tname, groups) in enumerate(spec.THEMES):
        members = [j for _, _, ranges in groups for j in spec.group_industries(ranges)]
        rows.append([prefix + tname, tcode, theme_id[tcode], 0 if modelling else 1, i + 1, 2, "AGG",
                     gid(members), lid(members)])
    local = 0
    for tcode, _, groups in spec.THEMES:
        for gcode, gname, ranges in groups:
            local += 1
            members = spec.group_industries(ranges)
            rows.append([prefix + gname, gcode, group_id[gcode], group_parent[gcode], local, 3, "AGG",
                         gid(members), lid(members)])
    for tcode, _, groups in spec.THEMES:
        for gcode, _, ranges in groups:
            for j in spec.group_industries(ranges):
                rows.append([prefix + industries[j], f"i{j + 1:03d}", leaf_base + j + 1, group_id[gcode], j + 1,
                             4, "LEAF", "None", "None"])
    ids = [r[2] for r in rows]
    assert len(set(ids)) == len(ids), "global ids are not unique"
    names = [r[0] for r in rows]
    assert len(set(names)) == len(names), "two nodes have the same name"
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
