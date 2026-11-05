==========================
RaMa-Scene documentation
==========================

RaMa-Scene is the RAw MAterials SCENario Efficiency improvement assessment tool and blended learning package.
It is a web application for Environmentally Extended Input-Output (EEIO) analysis with EXIOBASE. It helps
students, experts, and decision makers analyse the global economy and improvements to the circular economy.

The application began as an EIT Raw Materials project. The RaMa-Scene, Circumat, and Getting the Data Right
projects funded this work.

This documentation has three parts.

**For users**

* :doc:`user-guide`: how to run an analysis and build a scenario.
* :doc:`data`: the data behind the tool.
* :doc:`calculations`: how each result is calculated.
* :doc:`modelling`: how a scenario changes the model.

**For developers**

* :doc:`intro`: how the parts of the application work together.
* :doc:`API-descriptors`: the REST API.
* :doc:`frontend`: the React application.
* :doc:`testing`: unit tests and validation tests.
* :doc:`modules`: the Python modules, from their docstrings.

**For operators**

* :doc:`deployment`: how to run the application with Docker.
* :doc:`python-ini`: management commands and data files.
* :doc:`performance`: memory, workers, and load tests.

.. toctree::
    :caption: Users
    :maxdepth: 2
    :hidden:

    user-guide
    data
    calculations
    modelling

.. toctree::
    :caption: Developers
    :maxdepth: 2
    :hidden:

    intro
    API-descriptors
    frontend
    testing
    modules

.. toctree::
    :caption: Operators
    :maxdepth: 2
    :hidden:

    deployment
    python-ini
    performance

Project partners
================

* `Leiden University, CML <https://www.universiteitleiden.nl/en/science/environmental-sciences>`_
* `TU Delft <https://www.tudelft.nl/io/>`_
* `Fraunhofer IBP <https://www.ibp.fraunhofer.de/>`_
* `VITO <https://vito.be/en>`_

The source code is on `GitHub <https://github.com/CMLPlatform/ramascene>`_. The licence is GPL-3.0.
