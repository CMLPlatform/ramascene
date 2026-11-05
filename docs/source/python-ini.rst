#########################
Python initialise scripts
#########################

This page describes the commands and files that prepare the application. The application needs the first two
at deployment. The preparation of the raw data is separate.

Management commands
===================

``python manage.py populateHierarchies``
    Fills the database with the classifications from ``python_ini/data/``:

    * ``mod_indicators.csv``: indicators.
    * ``mod_final_countryTree_exiovisuals.csv``: the country tree.
    * ``mod_final_productTree_exiovisuals.csv``: the product tree.
    * ``modelling_mod_final_productTree_exiovisuals.csv``: the consumers for scenarios.

    The ``api`` container runs this command at start.

``python manage.py clear_models``
    Removes the stored jobs and results.

Other data files
================

``python_ini/data/nuts2_map.json`` and ``circumat_regions.csv``
    The NUTS2 regions per country for the CircuMAT regional view.

The classification trees map the groups that a user selects, such as "Europe", to the leaf countries and
products that the calculations use. The back end aggregates the results to the group again.

Dataset
=======

The application reads EXIOBASE as binary numpy matrices (``L``, ``Y``, ``B``, and ``A`` for scenarios), one folder
for each year. ``DATASETS_DIR`` points to the folders and ``DATASETS_VERSION`` selects the version.
The matrices are not in this repository. ``L`` is stored precalculated and opened memory-mapped.

The scripts that convert the raw EXIOBASE tables and the geography sources into these files are in a separate
repository, ``ramascene-preprocessing``. The running application does not need them.
