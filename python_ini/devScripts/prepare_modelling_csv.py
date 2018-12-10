"""
####
Date: 23rd of November 2018
Author: Sidney Niccolson
Purpose: Modify the product csv made from prepare_csv.py for use as a tree in modelling view.
        It create to files: prefix=modelling_mod for DB use and prefix=modelling_ for front-end use
        MAX_NUMBER_OF_GLOBAL_IDS and MAX_NUMBER_OF_LOCAL_IDS refers to the product.csv made from prepare_csv
        Check header for which column it refers to

Usage: if the mod_final_productTree.csv is available you can run the script. Please check the MAX_ if there are any changes
####
"""

import csv
import os, sys
from collections import defaultdict
import itertools

MY_TREE_FILE = '../data/mod_final_productTree_exiovisuals.csv'
BINS = {}
MYDATA = []
MAX_NUMBER_OF_GLOBAL_IDS = 276
MAX_NUMBER_OF_LOCAL_IDS = 200
OFFSET = 1


def getfile(myFile):
    # open the file
    # *** > give the path to the file.

    f = open(myFile, 'r')

    # get the content
    F = f.read()

    # split (make an array where each element is determined by an enter)
    U = F.split('\n')

    # Create empty list
    data = []

    # fill the empty list with the data (this time split even further by tabs)
    for line in U:
        data.append(line.split('\t'))
    # remove header and last line -> it is always structured the same and we reconstruct later in a modified manner
    data.pop(0)
    data.pop(-1)

    return data


def constructFinalCSV(data):
    with open('../data/modelling_' + os.path.basename(MY_TREE_FILE), 'w') as csvfile:
        assets_fn = open('../data/modelling_' + os.path.basename('final_productTree_exiovisuals.csv'), 'w')
        writer = csv.writer(csvfile, delimiter='\t',
                            quotechar='|', quoting=csv.QUOTE_MINIMAL)
        assets_writer = csv.writer(assets_fn, delimiter='\t',
                                   quotechar='|', quoting=csv.QUOTE_MINIMAL)
        # reconstruct headers with modifications
        writer.writerow(
            ["name", "code", "global_id", "parent_id", "local_id", "level", "identifier", "leaf_children_global",
             "leaf_children_local"])
        assets_writer.writerow(["name", "code", "global_id", "parent_id", "local_id", "level"])

        # final loop over dataset
        for x in range(len(data)):
            name = "S: " + data[x][0]
            code = data[x][1]
            global_id = int(data[x][2]) - OFFSET
            parent_id = int(data[x][3]) - OFFSET
            local_id = data[x][4]
            level = data[x][5]
            identifier = data[x][6]
            leaf_children_global = data[x][7]
            leaf_children_local = data[x][8]
            # the total is not relevant, we remove it and replace with final consumption parameter
            if name == "S: Total":
                name = "Y: Final Consumption"
                code = "final_consumption"
                global_id = MAX_NUMBER_OF_GLOBAL_IDS
                parent_id = 0
                local_id = data[x][4]
                level = 2
                identifier = "FINALCONSUMPTION"
                leaf_children_global = "None"
                leaf_children_local = "None"
                writer.writerow(
                    [name, code, global_id, parent_id, local_id, level, identifier, leaf_children_global,
                     leaf_children_local])
                assets_writer.writerow(
                    [name, code, global_id, parent_id, local_id, level])
            else:
                writer.writerow(
                    [name, code, global_id, parent_id, local_id, level, identifier, leaf_children_global,
                     leaf_children_local])
                assets_writer.writerow(
                    [name, code, global_id, parent_id, local_id, level])
            print("Row :" + name + " added.")


# Start execution here!
if __name__ == '__main__':
    data = getfile(MY_TREE_FILE)
    constructFinalCSV(data)
