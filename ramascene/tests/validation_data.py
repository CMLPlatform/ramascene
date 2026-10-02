"""Reader for the analytical validation fixtures.

The CSVs in validation_files/ were produced by an external Octave
implementation (column 10, `octave_results`) for EXIOBASE year 2011, v3.
Shared by the offline regression harness and the older websocket/Celery test.
"""

import os

VALIDATION_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "validation_files")

FILES_TO_TEST_AGAINST = [
    "validation_analytical_1_v3.csv",
    "validation_analytical_2_v3.csv",
    "validation_analytical_3_v3.csv",
    "validation_analytical_4_v3.csv",
]


def open_validation_file(fn):
    """Parse a validation CSV into a front-end query, expected results and unit."""
    with open(fn) as csv_file:
        F = csv_file.read()
        U = F.split("\n")
        data = []
        for line in U:
            data.append(line.split("\t"))
        nodesReg = []
        nodesSec = []
        results = {}
        unit = {}
        data.pop(0)
        data.pop(-1)
        for parts in data:
            nodesReg.append(int(parts[3]))
            nodesSec.append(int(parts[4]))
            extn = [int(parts[5])]
            dimType = parts[0]
            vizType = parts[1]
            year = [parts[2]]
            results[parts[6]] = float(parts[9])
            unit[parts[8]] = parts[7]

        # clean (only single element for list depending on vizType)
        if len(nodesReg) > len(set(nodesReg)):
            regions = set(nodesReg)
            nodesReg = list(regions)
        if len(nodesSec) > len(set(nodesSec)):
            sectors = set(nodesSec)
            nodesSec = list(sectors)

    query = {
        "action": "default",
        "querySelection": {
            "dimType": dimType,
            "vizType": vizType,
            "nodesSec": nodesSec,
            "nodesReg": nodesReg,
            "extn": extn,
            "year": year,
        },
    }
    return query, results, unit
