import numpy as np
from ramasceneMasterProject.settings import PATH_TO_B, PATH_TO_L, PATH_TO_Y

"""
This file is used for loading in IO objects in memory
"""

np.__config__.show()
#load extensions
B_data = np.load(PATH_TO_B)
print("loaded B: ")
print(B_data.shape)

#load Leontief
L_data = np.load(PATH_TO_L)
print("loaded L: ")
print(L_data.shape)

#load final demand
Y_data = np.load(PATH_TO_Y)
print("loaded Y: ")
print(Y_data.shape)



