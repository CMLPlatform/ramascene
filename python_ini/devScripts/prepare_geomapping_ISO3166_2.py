import json
import xlrd

"""
####
Date: 13th of April 2018
Author: Sidney Niccolson
Purpose: Prepare a json for Geomapping.
        Output of RamaScene calculations and querymanagement is country names
        Geomapping uses ISO2 (2-letter codes). So a conversion step is needed.
        The Desire countryMapping excel contains the mapping we need. Some ISO2 were missing, thus a small mod file has
        added codes > ref: https://www.iso.org/obp/ui/
        ref standards: ISO 3166
Usage:  you can change path to EXC_FILE, MOD_FILE to other files if another EXIOBASE version is used. The same accounts
        for Rest OF dictionary
####
"""

EXC_FILE = '../data/mod_CountryMappingDESIRE.xlsx'
MOD_FILE = '../data/mod_final_countryTree_exiovisuals.csv'

DICT_RF = {"WE": "Rest of Europe", "WM": "Rest of Middle East", "WL": "Rest of America",
           "WA": "Rest of Asia and Pacific",
           "WF": "Rest of Africa"}

OFFSET = -1


# create dict from file without Rest of.
def get_dict(file):
    f = open(file, 'r')
    # get the content
    F = f.read()
    # split (make an array where each element is determined by an enter)
    U = F.split('\n')
    # Create empty list
    data = []
    # fill the empty list with the data (this time split even further by tabs)
    for line in U:
        data.append(line.split('\t'))
    # remove header and last line
    data.pop(0)
    data.pop(-1)

    result_dict = {}

    # loop over data object
    for x in range(len(data)):
        identifier = data[x][6]
        global_name = data[x][0]
        # if aggregate
        if identifier == "TOTAL" or identifier == "AGG":
            children_global = data[x][7]
            # get the list of corresponding global IDs
            children_global = get_list(children_global)
            ch_is02_list = []
            # loop over this list to get the actual ISO2 codes using the OFFSET for positions
            for y in children_global:
                posidx = y + OFFSET
                # get ISO number
                iso2 = (data[posidx][1])
                # if ISO2 is in Rest Of category
                if iso2 in DICT_RF:
                    # get the corresponding 'real' ISO2 codes of these Rest of categories
                    iso2_rest = get_iso2_rest(EXC_FILE, iso2)
                    # returned value is a dict
                    lst = list(iso2_rest.values())
                    for z in lst:
                        for k in z:
                            ch_is02_list.append(k)
                            # ch_is02_list.append(iso2_new)

                else:
                    # just append
                    ch_is02_list.append(iso2)
            # for each aggregate use the name as key and attach iso2 values as array
            result_dict[global_name] = ch_is02_list

        elif identifier == "LEAF":
            is02_list = []

            # check if it is not a Rest Of country
            if not global_name in DICT_RF.values():
                # normal countries so just get the code
                code = data[x][1]
                result_dict[global_name] = [code]

            else:
                # use code
                code = data[x][1]
                iso2_rest = get_iso2_rest(EXC_FILE, code)
                lst = list(iso2_rest.values())
                for z in lst:
                    for k in z:
                        is02_list.append(k)
                result_dict[global_name] = is02_list


        else:
            print("Identifier not recognized. Please check the files you are loading in.")
    return result_dict


# add to json file
def get_iso2_rest(file, desire_rest):
    workbook = xlrd.open_workbook(file, on_demand=True)
    worksheet = workbook.sheet_by_name('CountryList')
    # create dict
    data_dict = {}

    # get number of rows
    rows = worksheet.nrows
    # create empty list
    em_list = []
    # loop over each row
    for row in range(rows):

        # get the cell that contains DESIRE region category
        cell = worksheet.cell(row, 6)
        # we identify rest of by RoW marker
        identifier = worksheet.cell(row, 7).value
        # if the given desire region category is found in the cell of interest and it is identified as rest of
        if desire_rest == cell.value and identifier.startswith('RoW', 0, 3):
            # get the corsponding real iso2 codes
            iso2 = worksheet.cell(row, 0).value
            if iso2:
                em_list.append(iso2)
    # construct dictionary
    data_dict[desire_rest] = em_list
    return data_dict


def get_list(a_list):
    # split on hashtag if multiple elements
    a_list = a_list.split("#")
    # convert that list to a list of integers
    a_list = list(map(int, a_list))
    return a_list


def create_json(dct):
    with open('../data/geomapping_ISO3166_2.json', 'w') as outfile:
        json.dump(dct, outfile, indent=4)


# Start execution here!
if __name__ == '__main__':
    data_dict = get_dict(MOD_FILE)
    create_json(data_dict)
    # final_json = getfileExcel(EXC_FILE, data_dict)
