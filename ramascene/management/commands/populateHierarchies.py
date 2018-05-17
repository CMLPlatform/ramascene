from django.core.management.base import BaseCommand
from ramascene.models import Country, Product, Indicator

import sys




class Command(BaseCommand):
    """
    Populate database with pre developed csv files residing in python_ini folder
    """
    def handle(self, *args, **options):
        try:
            indicatorData = getfile('python_ini/data/mod_indicators.csv')
            countryData = getfile('python_ini/data/mod_final_countryTree_exiovisuals.csv')
            productData = getfile('python_ini/data/mod_final_productTree_exiovisuals.csv')

            populate(indicatorData, "Indicator")
            populate(countryData, "Country")
            populate(productData, "Product")
        except Exception as e:
            sys.exit("Adding database objects Failed.."+e)


#function that adds to DB
def addProduct(name, code, global_id, parent_id, local_id, level,identifier, leaf_children_global, leaf_children_local):
    e, created = Product.objects.get_or_create(name=name, code=code, global_id=global_id, parent_id=parent_id,
                                               local_id=local_id, level=level,identifier=identifier,
                                               leaf_children_global=leaf_children_global,
                                               leaf_children_local=leaf_children_local)

    return e

#function that adds to DB
def addCountry(name, code, global_id, parent_id, local_id, level,identifier, leaf_children_global, leaf_children_local):
    e, created = Country.objects.get_or_create(name=name, code=code, global_id=global_id, parent_id=parent_id,
                                               local_id=local_id, level=level,identifier=identifier,
                                               leaf_children_global=leaf_children_global,
                                               leaf_children_local=leaf_children_local)


    return e

#function that adds to DB
def addIndicator(name, unit, global_id, parent_id, local_id, level):
    e, created = Indicator.objects.get_or_create(name=name, unit=unit, global_id=global_id, parent_id=parent_id,
                                               local_id=local_id, level=level)


    return e

def populate(data_obj, model_type):
    if model_type =="Indicator":
        # add children now
        for x in data_obj:
            try:
                name = x[0]
                unit = x[1]
                global_id = int(x[2])
                parent_id = int(x[3])
                local_id = int(x[4])
                level = int(x[5])
                addIndicator(name, unit, global_id, parent_id, local_id, level)
                print("Adding to database: " + name)
            except Exception as e:
                sys.exit("Adding database objects Failed.." + e)
    else:
        # add children now
        for x in data_obj:
            try:
                name = x[0]
                code = x[1]
                global_id = int(x[2])
                parent_id = int(x[3])
                local_id = int(x[4])
                level = int(x[5])
                identifier = x[6]
                leaf_children_global = x[7]
                leaf_children_local = x[8]

                if model_type =="Product":
                    addProduct(name, code, global_id, parent_id, local_id, level,identifier, leaf_children_global,
                               leaf_children_local)
                elif model_type =="Country":
                    addCountry(name, code, global_id, parent_id, local_id, level,identifier, leaf_children_global,
                               leaf_children_local)

                else:
                    sys.exit("Model_type not recognized.")
                print("Adding to database: "+name)
            except Exception as e:
                sys.exit("Adding database objects Failed.."+e)

    # go through the data
    print('***Done!! All objects have been added***')



def getfile(myFile):
    # open the file

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
    # remove header and last line -> it is always structured the same
    data.pop(0)
    data.pop(-1)

    return data