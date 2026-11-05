##################
Modelling overview
##################

The following explanations references the ramascene.modelling module code.

General description
===================

In order to create scenarios using EEIO data, operations need to be performed on the source data to obtain their
counterfactual. Counter-factual scenarios are IO tables representing a structure of the economy different
from the baseline structure.
They are constructed by adjusting particular elements in the matrices composing the IO system.

In order to create counter-factual IO tables, the RaMa-SCENE platform takes as a reference A, the technical
coefficient matrix, and Y, the final demand matrix. These two matrices are a representation of the relationship of
input products to outputs (A) and the demand of products by final consumers (Y).

Changes in relationships in the way products are manufactured are therefore implemented by modifying the A matrix,
while variations in the way products are consumed by final consumers are applied on final demand.

Once the A and Y matrix are modified through ramascene.modelling module, they are processed by ramascene.analyze
module so to output results.

Settings
========

Through the interface, in the “Scenario modelling” panel, users add *interventions*. Each intervention gives the
coordinates of the IO elements to change and the magnitude of the change for these intersected values.

The coordinates are defined by row-wise and column-wise items:

Row-wise:

* Product: the supply of a product;
* Originating from: the region that is supplying the product.

Column-wise:

* Consumed by: who is consuming the product, namely final consumers (Y) or a manufacturing activity (S);
* Consumed where: the region in which the consumption of the product is conducted.

The magnitude of the change by which the intersected values are modified is specified under the “Technical Change
Coefficient”. Here both negative and positive relative values can be specified. A negative relative value defines the
reduction that need to be calculated relative to the baseline data while a positive one defines an increase.

Once the coordinates and the change are set, the user can add more interventions, remove one, or load a preset.
The editor accepts changes from -50 % to 50 %. The API accepts changes from -100 % to 100 %.

When the user is satisfied, they select “Apply scenario to results” and press “Run scenario”. The results then show
the scenario and the change against the baseline.

Processing the settings
=======================

Through the ramascene.modelling module, each added change is processed iteratively. If any change was specified to be
applied in “Y: final consumption” the final demand matrix Y is used as a reference, otherwise the software references
the technical coefficient matrix (A).

The objective of these operations is to obtain a counter-factual final demand matrix **Y** :sup:`alt` and Leontief inverse matrix **L** :sup:`alt`.

The following equation exemplifies how changes in any given matrix are applied:

.. image:: ystatic/eq_1.PNG


Where **M** :sub:`ij` is a value of specific coordinates in the matrix of reference M. If the coordinates ij are part of a set of pre-determined coordinates Ω, then **M** :sub:`ij` is different from its baseline.

The selected value is then modified by following this equation:

.. image:: ystatic/eq_2.PNG

Where **M** :sub:`ij` :sup:`alt` is the modified value intersected through the coordinates and *k* is the technical change coefficient by which **M** :sub:`ij` is modified.

This process is easily applied to final demand in the following way:

.. image:: ystatic/eq_3_4.PNG


However, in order to obtain a counterfactual Leontief inverse matrix **L** :sup:`alt` , these changes need to be applied to the technical coefficient matrix **A**:

.. image:: ystatic/eq_5_6.PNG

From the counter-factual **A** :sup:`alt` the counterfactual **L** :sup:`alt` is calculated by using the following equation:

.. image:: ystatic/eq_7.PNG

The total product output is then calculated through the IO equation employing **L** :sup:`alt` and  **Y** :sup:`alt` :

.. image:: ystatic/eq_8.PNG

Fast update of the Leontief inverse
===================================

A full inversion of **I** - **A** takes about 20 seconds and 2.3 GB of memory. Most interventions change only a small
part of **A**. The change **D** = **A** :sup:`alt` - **A** is then sparse and has a low rank. In that case, the
ramascene.woodbury module updates the stored **L** with the Sherman-Morrison-Woodbury identity. It never builds
**L** :sup:`alt` in full. It reads only the rows and columns of **L** that the calculation needs.

The update uses the smaller of the touched rows and the touched columns. A change to one sector across all its
suppliers is a rank-1 update. When the rank is above ``MAX_WOODBURY_RANK`` (4000), the code falls back to a full
inversion. A change to final demand does not need **L** to change at all. It changes only **Y**.
