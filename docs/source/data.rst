####
Data
####

EXIOBASE
========

The tool uses EXIOBASE v3.3.sm, a multi-regional environmentally extended input-output (EEIO) database. The data
cover the years 1995 to 2011. The tables are in the Industry Technology Assumption (ITA) and in
product-by-product format. The RaMa-Scene dataset version that the application reads is ``v4``. This version
adds secondary raw materials to the products.

* 200 products, including secondary raw materials.
* 49 countries and regions.
* A list of indicators. It includes product output, value added, employment, greenhouse gas emissions, and
  material extraction. Some indicators have sub-indicators, for example employment by skill level.

More information about EXIOBASE is on `exiobase.eu <http://exiobase.eu/>`_.

Matrices
========

The application does not calculate from the raw tables on request. It reads these precalculated numpy matrices for
each year:

``L``
    The Leontief inverse (total requirements matrix). It is stored ready to use and opened memory-mapped.

``Y``
    Final demand.

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

Precalculated example
=====================

The page opens with a precalculated analysis in ``frontend/public/precalculated.json``. The script
``scripts/make_precalculated.py`` writes it from the dataset.

Limits
======

* The data end in 2011. Results are historic.
* EEIO is a linear model. It assumes fixed proportions between inputs and outputs.
* Scenario results are counterfactual calculations, not forecasts.
