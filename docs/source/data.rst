####
Data
####

EXIOBASE
========

The tool uses EXIOBASE 3.11.2, a multi-regional environmentally extended input-output (EEIO) database
(`Zenodo record 23039074 <https://zenodo.org/records/23039074>`_). The data cover the years 2015 to 2024 in
industry-by-industry format. 2024 is a now-cast: EXIOBASE projects it from earlier years and newer statistics.
The RaMa-Scene dataset version that the application reads is ``v5``.

* 163 industries, including recycling and waste treatment.
* 49 countries and regions.
* 132 indicators. They cover product output, value added, employment, greenhouse gas emissions, material
  extraction, energy use, land use, water consumption and withdrawal, nitrogen and phosphorus emissions, and
  deforestation. Some indicators have sub-indicators, for example employment by skill level.
* Land use and deforestation are not in the 2024 data. The catalog lists them as unavailable for that year and
  the job API rejects a request for them.

Greenhouse gases are added up with the 100-year global warming potentials of IPCC AR6 (CH4 27, N2O 273, SF6 25,200,
NF3 17,400). HFC and PFC are delivered in kg CO2-eq. Biogenic CO2 is left out; CH4 and N2O from burning biomass
are included. The values are in ``scripts/exiobase_spec.py``.

The tables of the earlier datasets (``v4``: EXIOBASE 3.3, product by product, 200 products, 1995 to 2011) are no
longer used.

More information about EXIOBASE is on `exiobase.eu <http://exiobase.eu/>`_.

Matrices
========

The application does not calculate from the raw tables on request. It reads these precalculated numpy matrices for
each year:

``L``
    The Leontief inverse (total requirements matrix). It is stored ready to use and opened memory-mapped.

``Y``
    Final demand: one column per region. The seven categories of EXIOBASE (households, non-profit institutions,
    government, fixed capital, inventories, valuables and exports) are summed.

``Y7``
    Final demand with the seven categories kept apart. The NUTS2 regionalization needs it.

``B``
    The extension coefficients: the impact of one unit of output, per indicator.

``A``
    The technical coefficients. Only scenarios that change the technology of a sector read it.

The matrices are not in the repository. :doc:`python-ini` describes where the application reads them.

Classifications
===============

Users select groups, such as a continent. The application maps each group to its leaf items before it calculates.
The trees come from the ExioVisuals classifications. They are in ``python_ini/data/`` and are loaded into the
database by ``python manage.py populateHierarchies``.

Regions (CircuMAT)
==================

The NUTS2 view uses the region lists in ``python_ini/data/nuts2_map.json`` and ``circumat_regions.csv``.
These lists name the regions of each supported country. The regional values are a split of the value of the
country and not an independent measurement.

Converting a new release
========================

``scripts/convert_exiobase.py`` turns the yearly EXIOBASE archives into the matrices above. It computes
A = Z x\ :sup:`-1` and L = (I - A)\ :sup:`-1`, builds the indicators from the stressor tables and checks the result:
output equals intermediate use plus final demand, L reproduces the output, and the footprints of all final demand
add up to the direct totals. The checks are stored in ``validation.json`` per year. The script also writes
``dataset_v5.json`` with the years, the now-cast years, the indicator recipes and the indicators that are missing in
a year. ``scripts/build_hierarchies.py`` writes the classification files in ``python_ini/data/`` from it.

Stressors recorded for an industry without output cannot be turned into a coefficient. They are not part of any
footprint. For greenhouse gases this is below 0.001 % of the total.

Licence
=======

EXIOBASE 3.11.2 is licensed for non-commercial use. Results derived from it may be published with attribution, but
not the coefficients or raw data points of the database itself. Check the licence before the application shows
direct impacts per industry and region on a public server.

Precalculated example
=====================

The page opens with a precalculated analysis in ``frontend/public/precalculated.json``. The script
``scripts/make_precalculated.py`` writes it from the dataset.

Limits
======

* The data end in 2024, and 2024 is a now-cast. Results before 2024 are historic.
* EEIO is a linear model. It assumes fixed proportions between inputs and outputs.
* Scenario results are counterfactual calculations, not forecasts.
