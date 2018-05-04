"""
####
Date: 14th of March 2018
Author: Sidney Niccolson
Purpose: Prepare a CSV from original Tree Raw Data.
        It contains additional fields useful for optimized use in Django Database and EXIOBASE
        Fields:
            "Identifier" -> to identify if Root, Aggregation or Leaf
            "leaf_children_global" -> the leafs that belong to a given node represented in global_ids
            "leaf_children_local" -> the leafs that belong to a given node represented in EXIOBASE indices
        MAX-DEPTH/hierarchies: 4 levels for this script
Usage: change path of MY_TREE_FILE to the country or product files
####
"""

import csv
import os, sys
from collections import defaultdict
import itertools

MY_TREE_FILE = '../data/final_countryTree_exiovisuals.csv'
BINS = {}
MYDATA = []

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
    #remove header and last line -> it is always structured the same and we reconstruct later in a modified manner
    data.pop(0)
    data.pop(-1)

    return data

#non-optimized function to count and add children to their parent
def countchildren(data):


    #create a bin that contains as key "parentId" as value tuple(code, empty list)
    #we want to extract all levels except the leaf level so all aggregations

    for x in range(len(data)):
        parentIdx = data[x][3]
        #if parent_id = 0 (top leaf), we don't take it into account

        #parentIdx is unique as its the dict key, assign an empty list to be used for later
        BINS[parentIdx] = []



    #loop over whole dataset
    for x in range(len(data)):

        parentIdx = data[x][3]
        globalIdx = data[x][2]
        #for each key
        for aggregation_id in BINS:


            # if parent Id of the data set equals a bin key
            #basically store global id's per aggregation
            if aggregation_id == parentIdx:
                #add the actual global id to that specific key, which is a list to append to
                myTuples = (BINS[aggregation_id])
                lst = list(myTuples)
                lst.append(globalIdx)
                t = tuple(lst)
                #return tuple now filled with corresponding leafs
                BINS[aggregation_id] = t



    return BINS

def constructFinalCSV(data, dictOfChildren):

    # get the max level (the most disaggregated nodes/leafs)
    levels = []
    tester = {}
    for x in range(len(data)):
        level = data[x][5]
        global_id = data[x][3]
        levels.append(level)
        tester[global_id] = level
    maxLvl = max(levels)

    myLeafsGlobal = []
    myLeafsLocal = []

    #get all leafs -> Disaggregates
    for x in range(len(data)):
        level = data[x][5]


        global_id = data[x][2]
        local_id = data[x][4]
        if level == maxLvl:
            exiobase_offset = -1
            myLeafsGlobal.append(global_id)
            local_id = int(local_id) + exiobase_offset
            local_id = str(local_id)
            myLeafsLocal.append(local_id)

    #prepare myLeafs for export to CSV
    myLeafsGlobal = "#".join(myLeafsGlobal)
    myLeafsLocal = "#".join(myLeafsLocal)

    with open('../data/mod_'+os.path.basename(MY_TREE_FILE), 'w') as csvfile:
        writer = csv.writer(csvfile, delimiter='\t',
                                quotechar='|', quoting=csv.QUOTE_MINIMAL)
        #reconstruct headers with modifications
        writer.writerow(["name", "code", "global_id", "parent_id","local_id","level","identifier", "leaf_children_global", "leaf_children_local"])

        #final loop over dataset
        for x in range(len(data)):
            name= data[x][0]
            code = data[x][1]
            global_id = data[x][2]
            parent_id = data[x][3]
            local_id = data[x][4]
            level = data[x][5]
            myChildrenGlobal = ""
            myChildrenLocal = ""
            #first check level or alternatively said depth,
            #  we assume "LEAF" as leaf, "AGG" as a node (aggregate), "TOTAL" as root
            if level == maxLvl:
                #we have leafs
                identifier = "LEAF"
                myChildrenGlobal = "None"
                myChildrenLocal = "None"
                #print("writing modified row for: " + name)
                writer.writerow(
                [name, code, global_id, parent_id, local_id, level, identifier, myChildrenGlobal, myChildrenLocal])
            #if total is somewhere in the datastructure, this is not always the case!
            elif code == "total":
                identifier = "TOTAL"
                myChildrenGlobal = myLeafsGlobal
                myChildrenLocal = myLeafsLocal
                #print("writing modified row for: " + name)
                writer.writerow(
                [name, code, global_id, parent_id, local_id, level, identifier, myChildrenGlobal, myChildrenLocal])
            #else we assume a node which is nor leaf nor root
            else:
                identifier = "AGG"
                #final matching: if dictkey matches parentid of raw data get values
                # for each key
                for aggregation_id in dictOfChildren:
                    if aggregation_id == parent_id:
                        # now we can use the global_id to fetch the correct values
                        resultChildrenofAgg = dictOfChildren[global_id]
                        prepareChildren = list(resultChildrenofAgg)


                        myChildrenGlobal, myChildrenLocal = getLowestChildren(level,maxLvl, prepareChildren, global_id, data)
                        #we are not there yet, as when an Aggregate has children that are Aggregates themselves
                        #we need to dive even deeper
                        #thus the number of levels would be needed to traverse to the lowest level
                        #print(resultChildrenofAgg)


                        #prepare for output
                        #prepareChildren = list(resultChildrenofAgg)
                        #myChildren = "#".join(prepareChildren)
                #print("writing modified row for: " + name)
                        writer.writerow(
                                [name, code, global_id, parent_id, local_id, level, identifier, myChildrenGlobal, myChildrenLocal])
            print("Row :" + name + " added.")
def getLowestChildren(level,maxLvl, children, gb, data):
    myChildrenGlobal = ""
    myChildrenGlobal_asList = []
    for x in range(len(level)):
            #first in line, if we add an iterator is to add 1 to the level than this node is Ok as it has its leafs
            #for the other ones we need to get get children until Max level is satisfied, HOW TO DO THAT?
            counter = 1
            currentLvl = level[x]
            currentLvl = int(currentLvl) + counter

            if str(currentLvl) == maxLvl:

                myChildrenGlobal = "#".join(children)



                myChildrenGlobal_asList.append(children)

            elif str(currentLvl + counter) == maxLvl:
                ## APPLY DICTIONARY AGAIN
                #after DO COUNTER +=1
                #call specialized function again
                #getLowestChildren([1,2,3],5,"test",890)
                special_dict = defaultdict(list)
                for y in range(len(children)):


                    # now we can use the global_id to fetch the correct values
                    resultChildrenofAgg = BINS[children[y]]
                    prepareChildren = list(resultChildrenofAgg)
                    #sometimes a key is already in dict. we want to add a value to it
                    special_dict[gb].append(prepareChildren)

                for key in special_dict:
                    myValues = special_dict[key]
                    #join list of list
                    myMergedValues = (list(itertools.chain.from_iterable(myValues)))
                    myChildrenGlobal_asList.append(myMergedValues)
                    myChildrenGlobal = "#".join(myMergedValues)
                #print("not printing")
            else:
                print("Too many levels are found, the depth is too high.")
                sys.exit("Too many levels are found, the depth is too high. The created file is corrupted")
    myChildrenLocal_asList = []
    #second-to last step is to find all local IDs given + an offset (-1) for exiobase
    for el in myChildrenGlobal_asList:
        temp_list = []
        #el is a list in itself so we need to dive deeper
        for sub_el in el:
            real_idx = int(sub_el) - 1
            mySpecificLocalId = data[real_idx][4]
            mySpecificLocalId_offsetted = int(mySpecificLocalId) - 1

            temp_list.append(str(mySpecificLocalId_offsetted))
        myChildrenLocal_asList.append(temp_list)
    #last step is to prepare for csv
    for el in myChildrenLocal_asList:
        myChildrenLocal = "#".join(el)
    return myChildrenGlobal, myChildrenLocal


# Start execution here!
if __name__ == '__main__':
    data = getfile(MY_TREE_FILE)
    dictOfChildren = countchildren(data)
    csvData = constructFinalCSV(data,dictOfChildren)
