import geopandas as gpd
import pandas as pd
import matplotlib.pyplot as plt
import json
import numpy as np
from datetime import datetime

"""
Date: 13th of April 2018
Author: Sidney Niccolson
Dependencies: see requirements.txt and install tkinter (sudo apt-get install python3-tk)
This script does the following:
1:read in a ISO_3166 countries file. See geo-countries folder.
2:generate object with meta-data, containing aggregated info for ramascene
  the meta-data comes from a custom json file. In order to create the custom json file, the DESIRE CountryMapping excel file was used.
3:read in these objects and actual aggregate with dissolve function
4:writing to file as geojson
The final file is in the output folder. This file is ready to be converted to topojson (ramascene viz. format) with mapshaper.
In mapshaper export with command $"id-field=id" "drop-table"
See geomapping_files.tar.gz for functional geojson and topojson files
"""

FNAME_GEO = "./geo-countries/archive/countries.geojson"
FNAME_MAP = "./data/geomapping_ISO3166_3.json"
SETTING = "country_lvl" #either "country_lvl", "continental_lvl", "total_lvl"

def get_files(fname_geo, fname_map):
    #load countries data as geopandas dataframe
    df = gpd.read_file(fname_geo)
    #plot
    '''
    countries = df.plot(figsize=(10, 3));
    countries.plot()
    plt.show()
    '''
    #load json mapping object
    mapper = json.load(open(fname_map))
    #return file data as dataframe and dict
    return df, mapper

#make special dicts for mappings
def separate(map):
    #containing rest of countries
    rest_dct = {}
    #containing normal countries
    normal_dct = {}
    #containing continents
    cont_dct = {}
    #containing total
    tot_dct = {}
    #if value list has more elements than 1 it is an aggregate
    for key, value in map.items():
        #rest of countries
        if len(value) > 1 and key.startswith("Rest"):
            rest_dct[key] = value
        #continents
        elif len(value) > 1 and key != "Total":
            cont_dct[key] = value
        #normal countries
        elif len(value) == 1:
            normal_dct[key] = value
        #total
        elif len(value) >1 and key == "Total":
            tot_dct[key] = value
        else:
            print("The list is empty. Please recheck your json file.")
    return rest_dct, normal_dct, cont_dct, tot_dct

 #for each country code in dataframe, try to match with specialized dicts
def append_columns_and_match(df, rest_dct,normal_dct,cont_dct,tot_dct):
    # create dummy rows to dataframe to be filled in later
    df_dummified = make_dummies(df)

    index_map_rest = {}
    index_map_continent = {}
    index_map_countries = {}
    index_map_total = {}
    #loop over rows
    for index, row in df.iterrows():
        #get the country codes
        country_code = row["ISO_A3"]
        #loop over mapping dct's
        idx_map_rest = inner_loop(country_code,"Rest", rest_dct, index, index_map_rest)
        idx_map_continent = inner_loop(country_code, "Continent", cont_dct, index, index_map_continent)
        idx_map_countries = inner_loop(country_code, "Countries", normal_dct, index, index_map_countries)
        idx_map_total = inner_loop(country_code, "Total", tot_dct, index,  index_map_total)
    if SETTING == "country_lvl":
        #call map functions
        df = mapper(idx_map_rest, df_dummified, "Rest")
        rest_df = dissolve_rest(df)
        df = mapper(idx_map_countries, df_dummified, "Countries")
        countries_df = normal_countries(df)
        return rest_df, " ", countries_df, " "
    elif SETTING == "continental_lvl":
        df = mapper(idx_map_continent, df_dummified, "Continent")
        cont_df = dissolve_agg(df)
        return " ", cont_df, " ", " "
    elif SETTING == "total_lvl":
        df = mapper(idx_map_total, df_dummified, "Total")
        total_df = dissolve_total(df)
        return " ", " "," ",total_df
    else:
        print("Please enter correct SETTING.")

#get index position of dataframe that matches with the custom dict
def inner_loop(country_code,marker, dct, idx, index_map):
    # loop over dct, we need to now the key as well
    for key, value_list in dct.items():
        # loop over each value
        for x in value_list:
            #fix for ISO code ROMANIA
            if x == "ROM":
                x = "ROU"
            # if there is a match
            if country_code == x and x != "ATA":
                index_map[idx] = key
    return index_map

def mapper(idx_map, df_dummified, marker):
    #the mapper has the correct index and a label as value
    for key, value in idx_map.items():
        #on index position change the value in the dataframe
        df_dummified.at[key, marker] = value
    return df_dummified

def make_dummies(df):
    #create dummy array of zeros
    length = len(df.index)
    buckets = np.arange(length).tolist()
    #convert to string as we are going to use that later
    buckets = [str(integral) for integral in buckets]

    #make columns to join in the end
    tot = gpd.GeoDataFrame({'Total': buckets})
    rest = gpd.GeoDataFrame({'Rest': buckets})
    cont = gpd.GeoDataFrame({'Continent': buckets})
    countries = gpd.GeoDataFrame({'Countries': buckets})

    #add columns
    df["Total"] = tot
    df["Rest"] = rest
    df["Continent"] = cont
    df["Countries"] = countries

    return df
def dissolve_total(df):
    # make a new dataframe that only contains rest_of_countries
    dfa = gpd.GeoDataFrame(columns=["ADMIN", "ISO_A3", 'geometry'])
    # change column name
    #df = df.rename(columns={'Total': 'ID'})

    for index, row in df.iterrows():
        check = str(row[3])
        # check if is not integer (then it is a continent
        if not represent_int(check):
            # update ADMIN to actual NAME LABEL
            row[0] = row[3]
            row[1] = row[3]
            # append full row
            dfa.loc[index] = row

    total = dfa[["ADMIN", "ISO_A3", 'geometry']]
    print("[4] Dissolving Total...")
    # dissolve on ID
    tot = total.dissolve(by='ADMIN')

    return tot


def dissolve_rest(df):
    #make a new dataframe that only contains rest_of_countries
    dfa = gpd.GeoDataFrame(columns=["ADMIN", "ISO_A3",'geometry' ])
    # change column name
    #df = df.rename(columns={'Rest': 'ID'})

    for index, row in df.iterrows():
        check = str(row[4])
        #print(type(row))
        if check.startswith("Rest of"):
            row[0] = row[4]
            row[1] = row[4]
            #print(row[0])
            dfa.loc[index] = row

    all_countries_from_rest = dfa[["ADMIN", "ISO_A3", 'geometry']]
    print("[1] Dissolving rest_of_countries...")
    rest_of = all_countries_from_rest.dissolve(by='ADMIN')

    '''
    #plotting
    world = rest_of.plot(figsize=(10, 3));
    world.plot()
    plt.show()
    '''
    return rest_of
def dissolve_agg(df):
    #make a new dataframe that only contains rest_of_countries
    dfa = gpd.GeoDataFrame(columns=["ADMIN", "ISO_A3",'geometry' ])
    # change column name
    #df = df.rename(columns={'Continent': 'ID'})

    for index, row in df.iterrows():
        check = str(row[5])
        #check if is not integer (then it is a continent
        if not represent_int(check):
            # update ADMIN to actual NAME LABEL
            row[0] = row[5]
            row[1] = row[5]
            # append full row
            dfa.loc[index] = row

    all_countries_from_cont = dfa[["ADMIN", "ISO_A3", 'geometry']]
    print("[2] Dissolving continents...")
    #dissolve on ID
    cont = all_countries_from_cont.dissolve(by='ADMIN')

    return cont

def normal_countries(df):
    #make a new dataframe that only contains rest_of_countries
    dfa = gpd.GeoDataFrame(columns=["ADMIN", "ISO_A3",'geometry' ])
    # change column name
    #df = df.rename(columns={'Continent': 'ID'})

    for index, row in df.iterrows():
        check = str(row[6])
        #check if is not integer (then it is a country)
        if not represent_int(check):
            # update ADMIN to actual NAME LABEL
            row[0] = row[6]
            row[1] = row[6]
            # append full row
            dfa.loc[index] = row

    print("[3] Making dataframe for explicit countries...")
    explicit_countries = dfa[["ADMIN", "ISO_A3", 'geometry']]

    #nothing to dissolve just return
    return explicit_countries

def represent_int(s):
    try:
        int(s)
        return True
    except ValueError:
        return False

def write(rest,cont,countries,total):
    #append all of them to rest dataframe
    '''
    world = countries.plot(figsize=(10, 3));
    world.plot()
    plt.show()
    '''
    if SETTING == "country_lvl":
        #combine rest of and countries
        country_df = gpd.GeoDataFrame(pd.concat([rest,countries], ignore_index=True))
        country_df = country_df.rename(columns={'ISO_A3': 'id'})
        #write to file
        try:
            country_df.to_file(driver='GeoJSON', filename=r'./output/'+SETTING+'.geojson')
        except Exception as e:
            print(e)
            print("***Failed creating file. File already exists***")
    elif SETTING == "continental_lvl":
        continental_df = cont.rename(columns={'ISO_A3': 'id'})
        try:
            continental_df.to_file(driver='GeoJSON', filename=r'./output/'+SETTING+'.geojson')
        except Exception as e:
            print(e)
            print("***Failed creating file. File already exists***")
    elif SETTING == "total_lvl":
        tot_df = total.rename(columns={'ISO_A3': 'id'})
        try:
            tot_df.to_file(driver='GeoJSON', filename=r'./output/'+SETTING+'.geojson')
        except Exception as e:
            print(e)
            print("***Failed creating file. File already exists***")
    else:
        print("Failed to write. Please enter correct SETTING.")

# Start execution here!
if __name__ == '__main__':
    startTime = datetime.now()
    print("***starting at: "+ str(startTime) +" ***")
    print("opening files...")
    df, map_dct = get_files(FNAME_GEO,FNAME_MAP)
    print("seperating mapping dictionaries by rest_of, continent, explicit countries and total...")
    rest_dct, normal_dct, cont_dct, tot_dct = separate(map_dct)
    print("appending markers for dissolve stage and make matches...")
    rest, cont, countries, total = append_columns_and_match(df, rest_dct,normal_dct,cont_dct, tot_dct)
    print("writing to file...")
    write(rest,cont,countries,total)
    print("script finished...")
    print("script time taken: "+ str(datetime.now() - startTime)+" ***")