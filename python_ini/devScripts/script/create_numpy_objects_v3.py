###############################################################################
#                                                                             #
# A python script that reads EXIOBASE v3.3 product by product tables          #
# (according industry technology assumption) in transaction form for the      #
# the year 2011. Subsequently these data are transformed into numpy objects   #
# that will be used in the ExioVisuals version 2. The matrices made are:      #
# - final demand matrix (Y.npy),                                              #
# - leontief inverse matrix (L.npy),                                          #
# - indicators matrix (B.npy).                                                #
#                                                                             #
# The final demand matrix contains the total final demand of each             #
# country/region and has dimensions 9800 products x 49 countries. The unit of #
# expression of each number is million Euros.                                 #
# The Leontief inverse matrix has dimensions 9800 x 9800 products. The unit   #
# of expression of each number is million Euro of output needed of a          #
# particular  to create a million of Euro of a particular product.            #
# The B-matrix is a rather heterogeneous matrix. Partly it contains           #
# 'classic' extensions: factor inputs, GHG emissions and resources use.       #
# These 'classic' extensions are available at the lowest level of detail      #
# such as CO2, CH4, N2O but also at aggregated level such as GHG emission     #
# indicator. The second part of the B-matrix are total product output and     #
# product input coefficients. They are duplications of the information that   #
# actually is available in the A-matrix in transaction form. The values in    #
# B-matrix are expressed in different unit but always as coefficient i.e.     #
# per million Euro output.                                                    #
#                                                                             #
# Author: Institute of Environmental Sciences (CML), Leiden University        #
#                                                                             #
# Version 2: Include total product output and product input coefficients      #
#                                                                             #
# Version 3: Exclude product input coefficients                               #
#                                                                             #
###############################################################################
import numpy as np
import os.path
import csv
import copy


def main():
    # SETTINGS
    years = range(1995, 2000)
    raw_data_dir = os.path.join('..', 'data', 'raw')
    clean_data_dir = os.path.join('..', 'data', 'clean')
    auxilary_data_dir = os.path.join('..', 'data', 'auxiliary')
    iot_filename_stub = 'mrIot_3.3_'
    finaldemands_filename_stub = 'mrFinalDemand_3.3_'
    factorinputs_filename_stub = 'mrFactorInputs_3.3_'
    emissions_filename_stub = 'mrEmissions_3.3_'
    materials_filename_stub = 'mrMaterials_3.3_'
    indicators_filename = 'indicators_v3.txt'
    ghg_index = [0, 1, 2, 27, 28, 29, 52, 53, 54, 55, 56, 57, 58, 59, 77, 78, 403, 404, 405, 406, 407, 410]
    va_index = [0, 1, 2, 3, 4, 5, 6, 7, 8]
    material_index = range(419, 439, 1)
    tolerance = 1E-3
    prd_cnt = 200
    fd_cnt = 7
    cntr_cnt = 49
    save_files = True
    include_emission_multiplier_matrices = False  # be sure to have loads of mem if you want to do this
    import os as ost
    print(ost.getcwd())
    for yr in years:

        yr_string = str(yr)
        print('Processing raw data for the year {}'.format(yr_string))

        # CREATE CANONICAL FILENAMES
        iot_filename = iot_filename_stub + yr_string + '.txt'
        finaldemands_filename = finaldemands_filename_stub + yr_string + '.txt'
        factorinputs_filename = factorinputs_filename_stub + yr_string + '.txt'
        emissions_filename = emissions_filename_stub + yr_string + '.txt'
        materials_filename = materials_filename_stub + yr_string + '.txt'
        full_iot_fn = os.path.join(raw_data_dir, yr_string, iot_filename)
        full_finaldemands_fn = os.path.join(raw_data_dir, yr_string, finaldemands_filename)
        full_factor_inputs_fn = os.path.join(raw_data_dir, yr_string, factorinputs_filename)
        full_emissions_fn = os.path.join(raw_data_dir, yr_string, emissions_filename)
        full_materials_fn = os.path.join(raw_data_dir, yr_string, materials_filename)
        full_indicators_fn = os.path.join(auxilary_data_dir, indicators_filename)

        # READ FILES
        iot = read_file(full_iot_fn)
        final_demands = read_file(full_finaldemands_fn)
        factor_inputs = read_file(full_factor_inputs_fn)
        emissions = read_file(full_emissions_fn)
        materials = read_file(full_materials_fn)
        indicators = read_file(full_indicators_fn)

        # CREATE NUMPY ARRAYS
        Z = list_to_numpy_array(iot, 3, 2)
        Y = list_to_numpy_array(final_demands, 3, 2)
        W = list_to_numpy_array(factor_inputs, 2, 2)
        va = np.sum(W[va_index, :], axis=0, keepdims=True)
        E = list_to_numpy_array(emissions, 3, 2)
        E = E[ghg_index, :]  # select CO2, CH4 and N2O emissions
        M = list_to_numpy_array(materials, 2, 2)
        M = M[material_index, :]  # select "domestic extraction used" metals and minerals
        o_coeff = np.zeros((1, prd_cnt * cntr_cnt))  # dummy place holder, will be filled later
        M = np.vstack((o_coeff, W, E, M))  # stack all extensions
        H = list_to_numpy_array(indicators, 0, 0)
        M = np.dot(np.transpose(H), M)

        # CALCULATE TOTALS
        to = np.sum(Z, axis=1, keepdims=True) + np.sum(Y, axis=1, keepdims=True)  # total output ($)
        ti = np.transpose(np.sum(Z, axis=0, keepdims=True) + va)  # total outlays ($)

        # CALCULATE COEFFICIENTS
        A = np.dot(Z, invdiag(to[:, 0]))  # input-output coefficients matrix ($/$)
        B = np.dot(M, invdiag(to[:, 0]))  # extension coefficients (xx/$)

        # FILL IN TOTAL OUTPUT COEFFICIENTS IN B MATRIX AND REPLACE DUMMY
        o_coeff = copy.deepcopy(to)
        o_coeff[o_coeff > 0] = 1
        B[0, :] = np.transpose(o_coeff)

        # LEONTIEF INVERSE
        I = np.eye(prd_cnt * cntr_cnt)  # unity matrix ($)
        L = np.linalg.inv(I - A)  # Leontief inverse matrix ($/$)

        # CALCULATE EMISSION MULTIPLIERS
        if include_emission_multiplier_matrices:
            Q = np.dot(B, L)  # multipliers (xx/$)

        # CHECK
        # balanced to start with ?
        diff = np.abs(to - ti)
        for index in np.ndindex(diff.shape):
            if diff[index] > tolerance:
                print('difference to and ti larger than {} million Euro. Difference is {} at index {}.'
                      .format(tolerance, diff[index], index))

        # calculated total output equal to to initial total output
        x = np.dot(L, np.sum(Y, axis=1, keepdims=True))
        diff = np.abs(x - to)
        for index in np.ndindex(diff.shape):
            if diff[index] > tolerance:
                print('difference x and to larger than {} million Euro. Difference is {} at index {}.'
                      .format(tolerance, diff[index], index))

        # AGGREGATE FINALDEMAND
        Y_new = np.zeros([9800, 49])
        for cntr_idx in range(0, cntr_cnt):
            for fd_idx in range(0, fd_cnt):
                old_idx = cntr_idx * fd_cnt + fd_idx
                new_idx = cntr_idx
                Y_new[:, new_idx] = Y_new[:, new_idx] + Y[:, old_idx]
        Y = Y_new

        # SOME DELETING
        del Z
        del W
        del va
        del E
        del iot
        del final_demands
        del factor_inputs
        del emissions
        del materials

        # CREATE DETAILED MULTIPLIERS MATRIX
        if include_emission_multiplier_matrices:
            ext_cnt = np.size(B, 0)
            P = np.zeros((prd_cnt * cntr_cnt, prd_cnt * cntr_cnt, ext_cnt + 1))
            P[:, :, ext_cnt] = L  # add total requirements matrix at the end
            for ext_idx in range(0, ext_cnt):
                b = B[ext_idx, :]  # take out a single extension from extension coefficients matrix
                b = np.transpose(b)  # transpose
                P[:, :, ext_idx] = L
                for prd_idx in range(0, prd_cnt * cntr_cnt):
                    P[:, prd_idx, ext_idx] = np.multiply(b, P[:, prd_idx, ext_idx])

        # CREATE CANONICAL FILENAMES
        full_io_fn = os.path.join(clean_data_dir, yr_string, 'A_v3.npy')
        full_leontief_fn = os.path.join(clean_data_dir, yr_string, 'L_v3.npy')
        full_finaldemand_fn = os.path.join(clean_data_dir, yr_string, 'Y_v3.npy')
        full_extensions_fn = os.path.join(clean_data_dir, yr_string, 'B_v3.npy')
        if include_emission_multiplier_matrices:
            full_multipliers_fn = os.path.join(clean_data_dir, yr_string, 'Q_v3.npy')
            full_detailed_multipliers_fn = os.path.join(clean_data_dir, yr_string, 'P_v3.npy')

        # SAVING MULTIREGIONAL DATA AS BINARY NUMPY ARRAY OBJECTS
        if save_files:
            np.save(full_io_fn, A)
            np.save(full_leontief_fn, L)
            np.save(full_finaldemand_fn, Y)
            np.save(full_extensions_fn, B)
            if include_emission_multiplier_matrices:
                np.save(full_multipliers_fn, Q)
                np.save(full_detailed_multipliers_fn, P)


def invdiag(data):
    result = np.zeros(data.shape)
    for index in np.ndindex(data.shape):
        if data[index] != 0:
            result[index] = 1 / data[index]
    return np.diag(result)


def list_to_numpy_array(list_data, row_header_cnt, col_header_cnt):
    matrix = []
    row_idx = 0
    for list_row in list_data:
        if row_idx >= col_header_cnt:  # skip rows with column headers
            matrix.append(list_row[row_header_cnt:len(list_row)])
        row_idx += 1
    return np.asarray(matrix, dtype=np.double)


def read_file(filename):
    with open(filename) as f:
        reader = csv.reader(f, delimiter='\t')
        d = list(reader)
    return d


main()
