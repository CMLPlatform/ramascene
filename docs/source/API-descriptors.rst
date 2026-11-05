###############
API descriptors
###############

The frontend uses a JSON API over HTTP. All endpoints are under ``/api/``. No login is needed.
A live description (OpenAPI) is available from the running server:

* ``/api/docs/``: interactive Swagger page.
* ``/api/schema/``: the OpenAPI schema.

Global ids
==========

Products, countries and indicators have a *global id*. The catalog endpoint lists them.
A global id can stand for one item or for a group. For example, the id for "world" selects all countries.
The back end resolves a group to its leaf items before it calculates.
The classification files in ``python_ini/data/`` define the ids.

GET /api/catalog/
=================

Returns the items that a user can select.

.. code-block:: json

    {
      "years": [2015, 2016, "...", 2024],
      "nowcast_years": [2024],
      "unavailable": {"2024": [105, 106]},
      "products": [{"global_id": 12, "name": "Wheat", "code": "i01.a"}],
      "countries": [{"global_id": 3, "name": "Netherlands", "code": "NL"}],
      "indicators": [{"global_id": 5, "name": "GHG emissions: Total", "unit": "kg CO2 eq", "parent_id": 0, "level": 1}],
      "consumers": [{"global_id": 7, "name": "Final consumption", "final": true}],
      "nuts2": {"Netherlands": [{"code": "NL11", "name": "Groningen"}]}
    }

``consumers`` lists the things that can consume a product in a scenario: the final consumption node
(``final: true``) and the sectors. ``nuts2`` lists the regions per country for the CircuMAT regional view.

POST /api/jobs/
===============

Starts a calculation. The body has an ``action`` and a ``querySelection``.

.. code-block:: json

    {
      "action": "default",
      "querySelection": {
        "dimType": "Contribution",
        "vizType": "Sectoral",
        "nodesSec": [3, 4, 7],
        "nodesReg": [1],
        "extn": [2],
        "year": [2011]
      }
    }

.. list-table::
    :header-rows: 1
    :widths: 20 80

    * - Key
      - Meaning
    * - ``action``
      - ``default`` for a baseline calculation. ``model`` for a scenario.
    * - ``dimType``
      - ``Contribution`` or ``Hotspot``. See :doc:`calculations`.
    * - ``vizType``
      - ``Sectoral`` or ``Geographic``. This selects the grouping of the result.
    * - ``nodesSec``
      - List of product global ids.
    * - ``nodesReg``
      - List of country global ids.
    * - ``extn``
      - List of indicator global ids.
    * - ``year``
      - List with one year. The calculation uses the first year.

The four combinations of ``dimType`` and ``vizType`` map to the four calculation routes:

* ``Contribution`` and ``Sectoral``: route 1.
* ``Contribution`` and ``Geographic``: route 2.
* ``Hotspot`` and ``Geographic``: route 3.
* ``Hotspot`` and ``Sectoral``: route 4.

Any other combination returns HTTP 400.

Scenario jobs
-------------

For ``action`` equal to ``model``, add ``model_details``. It is a list of interventions.
At least one intervention is required.

.. code-block:: json

    {
      "originReg": [3],
      "consumedReg": [3],
      "product": [12],
      "consumedBy": [7],
      "techChange": [-20]
    }

* ``originReg``: the region that supplies the product.
* ``consumedReg``: the region that consumes the product.
* ``product``: the product that changes.
* ``consumedBy``: one consumer. It is the final consumption node or a sector.
* ``techChange``: the relative change in percent. The value must be between -100 and 100.

Every id must exist. Otherwise the API returns HTTP 400. See :doc:`modelling` for the meaning of a change.

Responses
---------

``202 Accepted``
    The job is queued.

    .. code-block:: json

        {"job_id": 41, "status": "started", "status_url": "/api/jobs/41/"}

``400 Bad Request``
    The body is not valid. The response lists the errors per field.

``429 Too Many Requests``
    The number of active jobs reached ``RAMASCENE_MAX_ACTIVE_JOBS`` (default 50).
    The client must try again later.

GET /api/jobs/<id>/
===================

Returns the status of a job. The ``result`` key is present only when the status is ``completed``.

.. code-block:: json

    {
      "job_id": 41,
      "name": "{'action': 'default', 'dimType': 'Contribution', ...}",
      "status": "completed",
      "created": "2026-11-05T10:12:09Z",
      "result": {
        "unit": {"2": "kg CO2 eq"},
        "rawResultData": {"Wheat": 1.2e9}
      }
    }

``name`` is the selection of the request, written as text. ``status`` is ``started``, ``completed`` or ``failed``. An unknown id returns HTTP 404.

The ``result`` always holds ``job_name``, ``job_id``, ``unit`` and ``rawResultData``. The sectoral contribution route (route 1) adds
``consumed`` (the footprint per consumed sector) and ``supply`` (the sectors and countries in the supply chain).

Polling
=======

The client polls the job endpoint at a fixed interval until the status is ``completed`` or ``failed``.
``frontend/src/api.ts`` implements this in ``pollJob``. It supports a timeout and cancel through an
``AbortSignal``.
