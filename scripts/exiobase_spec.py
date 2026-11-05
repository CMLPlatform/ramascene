"""What the RaMa-Scene dataset built from EXIOBASE 3.11.2 (industry by industry) contains.

One place for the three decisions that shape the data, so the conversion script, the hierarchy
builder and the documentation all agree:

  * GWP100         the factors used to add greenhouse gases together
  * SECTIONS       how the 163 EXIOBASE industries are grouped into the three-level tree shown in the app
  * indicator_table()  which stressor rows make up each indicator (and the child indicators below it)

Nothing here reads data files except indicator_table(), which looks at the stressor labels of one year
(the labels are the same in every year).
"""
from collections import OrderedDict

DATASET_VERSION = "v5"
EXIOBASE_VERSION = "3.11.2"
N_INDUSTRIES = 163
N_REGIONS = 49
# Years EXIOBASE 3.11.2 projects instead of measures ("2024 is a now-cast" on the Zenodo page)
NOWCAST_YEARS = [2024]
N_FINAL_DEMAND = 7  # categories per region in Y.txt, summed to one column per region for the app

# IPCC AR6, 100-year horizon, without climate-carbon feedbacks. NF3 = 17,400 is the value the
# EXIOBASE 3.11.2 changelog prescribes; the others are the AR6 values that go with it. HFC and PFC are
# already delivered in kg CO2-eq. Methane is taken as 27.0 (non-fossil) for all sources.
GWP100 = OrderedDict([("CO2", 1.0), ("CH4", 27.0), ("N2O", 273.0), ("SF6", 25200.0), ("NF3", 17400.0)])

# (section code, section name, [(group code, group name, first industry, last industry), ...])
# Industry numbers are 0-based positions in the EXIOBASE industry list (x.txt order).
SECTIONS = [
    ("A", "Agriculture, hunting and forestry", [
        ("A1", "Crop cultivation", 0, 7),
        ("A2", "Animal farming and animal products", 8, 14),
        ("A3", "Manure treatment", 15, 16),
        ("A4", "Forestry and logging", 17, 17)]),
    ("B", "Fishing", [
        ("B1", "Fishing and fish farming", 18, 18)]),
    ("C", "Mining and quarrying", [
        ("C1", "Mining of coal, lignite and peat", 19, 19),
        ("C2", "Oil and gas extraction", 20, 22),
        ("C3", "Mining of uranium and thorium", 23, 23),
        ("C4", "Mining of metal ores", 24, 30),
        ("C5", "Other mining and quarrying", 31, 33)]),
    ("D", "Manufacturing", [
        ("D1", "Food products and beverages", 34, 44),
        ("D2", "Tobacco products", 45, 45),
        ("D3", "Textiles, wearing apparel and leather", 46, 48),
        ("D4", "Wood, pulp, paper and printing", 49, 54),
        ("D5", "Coke, refined petroleum and nuclear fuel", 55, 57),
        ("D6", "Chemicals, plastics and fertilisers", 58, 62),
        ("D7", "Rubber and plastic products", 63, 63),
        ("D8", "Glass, ceramics, cement and other non-metallic minerals", 64, 70),
        ("D9", "Basic metals and casting", 71, 83),
        ("D10", "Fabricated metal products", 84, 84),
        ("D11", "Machinery and equipment", 85, 89),
        ("D12", "Transport equipment", 90, 91),
        ("D13", "Furniture and manufacturing n.e.c.", 92, 92),
        ("D14", "Recycling", 93, 94)]),
    ("E", "Electricity, gas and water supply", [
        ("E1", "Electricity production", 95, 106),
        ("E2", "Electricity transmission and distribution", 107, 108),
        ("E3", "Gas and steam supply", 109, 110),
        ("E4", "Water supply", 111, 111)]),
    ("F", "Construction", [
        ("F1", "Construction", 112, 113)]),
    ("G", "Trade", [
        ("G1", "Motor vehicle trade, repair and fuel retail", 114, 115),
        ("G2", "Wholesale trade", 116, 116),
        ("G3", "Retail trade", 117, 117)]),
    ("H", "Hotels and restaurants", [
        ("H1", "Hotels and restaurants", 118, 118)]),
    ("I", "Transport, storage and communication", [
        ("I1", "Land transport and pipelines", 119, 121),
        ("I2", "Water transport", 122, 123),
        ("I3", "Air transport", 124, 124),
        ("I4", "Supporting and auxiliary transport activities", 125, 125),
        ("I5", "Post and telecommunications", 126, 126)]),
    ("J", "Financial intermediation", [
        ("J1", "Financial intermediation", 127, 127),
        ("J2", "Insurance and pension funding", 128, 128),
        ("J3", "Auxiliary financial activities", 129, 129)]),
    ("K", "Real estate, renting and business activities", [
        ("K1", "Real estate", 130, 130),
        ("K2", "Renting of machinery and equipment", 131, 131),
        ("K3", "Computer and related activities", 132, 132),
        ("K4", "Research and development", 133, 133),
        ("K5", "Other business activities", 134, 134)]),
    ("L", "Public administration", [
        ("L1", "Public administration and defence", 135, 135)]),
    ("M", "Education", [
        ("M1", "Education", 136, 136)]),
    ("N", "Health and social work", [
        ("N1", "Health and social work", 137, 137)]),
    ("O", "Waste treatment and disposal", [
        ("O1", "Incineration of waste", 138, 144),
        ("O2", "Biogasification and composting", 145, 149),
        ("O3", "Waste water treatment", 150, 151),
        ("O4", "Landfill of waste", 152, 157)]),
    ("P", "Other service activities", [
        ("P1", "Membership, recreational and other services", 158, 160),
        ("P2", "Private households with employed persons", 161, 161),
        ("P3", "Extra-territorial organizations and bodies", 162, 162)]),
]


def check_sections(n=N_INDUSTRIES):
    """The groups must cover every industry exactly once, in order."""
    expected = 0
    for _, _, groups in SECTIONS:
        for code, _, first, last in groups:
            assert first == expected and last >= first, f"group {code} breaks the sequence at {expected}"
            expected = last + 1
    assert expected == n, f"groups cover {expected} industries, expected {n}"


def indicator_table(labels):
    """The indicator list, in the order of the rows of B.

    labels: {extension group: [stressor names]} read from the unit.txt files of one year.
    Returns a list of dicts with
        name, unit, level (1 or 2), parent (index in this list or None), recipe
    where recipe is a list of (group, stressor, weight); the special group "__output__" stands for
    the industry output itself (B row of ones).
    Level 1 indicators come first, then their children, as in the old tables, so the row of B
    is global_id - 1.
    """
    units = labels["__units__"]
    top = []  # (name, unit, recipe, [(child name, child unit, child recipe)])

    def rows(group, predicate):
        found = [(group, s, 1.0) for s in labels[group] if predicate(s)]
        assert found, f"no stressor in {group} matches"
        return found

    def unit_of(recipe):
        found = {units[(g, s)] for g, s, _ in recipe}
        assert len(found) == 1, f"mixed units {found}"
        return found.pop()

    def add(name, recipe, children=(), unit=None):
        top.append((name, unit or unit_of(recipe), recipe, list(children)))

    def child(name, recipe, unit=None):
        return (name, unit or unit_of(recipe), recipe)

    # --- economy -----------------------------------------------------------------------------------
    add("Product Output: Total", [("__output__", "output", 1.0)], unit="M.EUR")

    fi = rows("factor_inputs", lambda s: True)
    add("Value Added: Total", fi, [child(s, [(g, s, 1.0)]) for g, s, _ in fi])

    emp = rows("employment", lambda s: s.startswith("Employment people:"))
    add("Employment: Total", emp,
        [child(s.replace("Employment people:", "Employment:"), [(g, s, 1.0)]) for g, s, _ in emp])
    hrs = rows("employment", lambda s: s.startswith("Employment hours:"))
    add("Employment hours: Total", hrs, [child(s, [(g, s, 1.0)]) for g, s, _ in hrs])

    # --- greenhouse gases --------------------------------------------------------------------------
    air = labels["air_emissions"]
    ghg_children = OrderedDict([
        ("CO2 - combustion", ["CO2 - combustion - air"]),
        ("CH4 - combustion", ["CH4 - combustion - air", "CH4_bio - combustion - air"]),
        ("N2O - combustion", ["N2O - combustion - air", "N2O_bio - combustion - air"]),
        ("CO2 - waste", ["CO2 - waste - fossil - air"]),
        ("CH4 - waste", ["CH4 - waste - air"]),
        ("CO2 - non combustion", ["CO2 - non combustion - Cement production - air",
                                  "CO2 - non combustion - Lime production - air"]),
        ("CH4 - non combustion", [s for s in air if s.startswith("CH4 - non combustion - ")]),
        ("CO2 - agriculture", ["CO2 - agriculture - peat decay - air"]),
        ("CH4 - agriculture", ["CH4 - agriculture - air"]),
        ("N2O - agriculture", ["N2O - agriculture - air"]),
        ("SF6", ["SF6 - air"]),
        ("HFC", ["HFC - air"]),
        ("PFC", ["PFC - air"]),
        ("NF3", ["NF3 - air"]),
    ])

    def gas_of(stressor):
        head = stressor.split(" ")[0].split("_")[0]
        return head if head in GWP100 else "CO2-eq already"

    ghg_total, ghg_kids = [], []
    for name, names in ghg_children.items():
        for s in names:
            assert s in air, f"missing air-emission row {s!r}"
        mass = [("air_emissions", s, 1.0) for s in names]
        weighted = [("air_emissions", s, GWP100.get(gas_of(s), 1.0)) for s in names]
        ghg_total += weighted
        # children are reported in kg of the gas itself, like the old tables; HFC and PFC are CO2-eq
        ghg_kids.append(child(name, mass, unit="kg CO2-eq" if name in ("HFC", "PFC") else "kg"))
    add("GHG emissions: Total", ghg_total, ghg_kids, unit="kg CO2 eq")

    # --- materials ---------------------------------------------------------------------------------
    mat = labels["material"]
    prefix = "Domestic Extraction Used - "
    assert all(s.startswith(prefix) for s in mat)
    kind_of = lambda s: s[len(prefix):].split(" - ")[0]
    biomass = {"Primary Crops", "Crop residues", "Fodder crops (including biomass harvest from grassland)",
               "Grazed biomass", "Forestry", "Fishery"}
    classes = OrderedDict([
        ("Domestic Extraction Used - Biomass - Total", lambda s: kind_of(s) in biomass),
        ("Domestic Extraction Used - Fossil Fuels - Total", lambda s: kind_of(s) == "Fossil Fuels"),
        ("Domestic Extraction Used - Metal Ores - Total", lambda s: kind_of(s) == "Metal Ores"),
        ("Domestic Extraction Used - Non-Metallic Minerals - Total", lambda s: kind_of(s) == "Non-Metallic Minerals"),
    ])
    covered = set()
    add("Domestic Extraction Used - Total", rows("material", lambda s: True))
    for name, pred in classes.items():
        members = rows("material", pred)
        covered |= {s for _, s, _ in members}
        add(name, members, [child(s, [(g, s, 1.0)]) for g, s, _ in members])
    assert covered == set(mat), f"material rows not classified: {sorted(set(mat) - covered)[:5]}"

    # --- energy, land, water, nutrients, deforestation ---------------------------------------------
    for s in labels["energy"]:
        add(s, [("energy", s, 1.0)])

    land = labels["land"]
    land_classes = OrderedDict([
        ("Land use - Artificial surfaces", lambda s: s == "Artificial Surfaces"),
        ("Land use - Cropland, cropped area", lambda s: s.startswith("Cropland - cropped area")),
        ("Land use - Cropland, fallowed area", lambda s: s.startswith("Cropland - fallowed area")),
        ("Land use - Permanent pastures", lambda s: s.startswith("Permanent pastures")),
        ("Land use - Forest, naturally generating", lambda s: s.startswith("Naturally generating forest")),
        ("Land use - Forest, planted", lambda s: s == "Planted forest"),
    ])
    land_kids, seen = [], set()
    for name, pred in land_classes.items():
        members = rows("land", pred)
        seen |= {s for _, s, _ in members}
        land_kids.append(child(name, members))
    assert seen == set(land), f"land rows not classified: {sorted(set(land) - seen)[:5]}"
    add("Land use: Total", rows("land", lambda s: True), land_kids)

    water_kids = [child(f"Water consumption - {kind}",
                        rows("water", lambda s, k=kind: s.startswith(f"Water Consumption {k} - ")))
                  for kind in ("Green", "Blue", "Capillary")]
    add("Water consumption: Total", rows("water", lambda s: s.startswith("Water Consumption ")), water_kids)
    add("Water withdrawal: Blue", rows("water", lambda s: s.startswith("Water Withdrawal Blue - ")))

    nut = labels["nutrients"]
    n_rows = rows("nutrients", lambda s: s.startswith("N - "))
    add("Nitrogen emissions: Total", n_rows, [child(s, [(g, s, 1.0)]) for g, s, _ in n_rows])
    # "Pxx - agriculture - soil" is left out: it is not clear that it is additional to the P rows
    p_rows = rows("nutrients", lambda s: s.startswith("P - "))
    add("Phosphorus emissions: Total", p_rows, [child(s, [(g, s, 1.0)]) for g, s, _ in p_rows])

    for s in ("Deforestation attribution, unamortized", "Deforestation risk, amortized",
              "Deforestation emissions incl. peat drainage, amortized"):
        assert s in labels["deforestation"], s
        add(s, [("deforestation", s, 1.0)])

    # --- flatten: all level 1 first, then children in the same order ------------------------------
    table = []
    for name, unit, recipe, _ in top:
        table.append(dict(name=name, unit=unit, level=1, parent=None, recipe=recipe))
    for i, (_, _, _, kids) in enumerate(top):
        for cname, cunit, crecipe in kids:
            table.append(dict(name=cname, unit=cunit, level=2, parent=i, recipe=crecipe))
    return table


check_sections()
