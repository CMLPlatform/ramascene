########
Frontend
########

The frontend is a single-page application in ``frontend/``. It uses React, TypeScript, and Vite.
nginx serves the built files. In production the browser sends requests for ``/api/`` to the Django API
through nginx.

Tools
=====

* Package manager: npm (``package.json`` and ``package-lock.json``).
* ``npm run dev``: development server. It proxies ``/api`` to Django on port 8000 (see ``vite.config.ts``).
* ``npm test``: unit tests (Vitest).
* ``npm run build``: type check and production build in ``frontend/dist``.
* The Inter font is bundled with the application. The page does not call any external font service.

Pages
=====

The application has no router. It reads the part after ``#`` in the address.

* ``#analysis`` (default): the analysis page.
* ``#about``: the About page (``About.tsx``). It describes the project, the methods, the resources, and the funding.

The analysis page has three areas:

* **Scenario modelling** (left panel): the interventions, a preset menu, and the trend chart.
* **Main area**: the selection (sector, country, indicator, year, and region level), the result figures, and the direct-impact table.
* **Analysis queue** (right panel): one entry for each run, with its progress.

Both side panels can be closed.

Source files
============

``src/main.tsx``
    Entry point.

``src/App.tsx``
    The main component. It holds the state, starts runs, and renders the page.

``src/About.tsx``
    The About page.

``src/api.ts``
    The client for the REST API: ``fetchCatalog``, ``startJob``, and ``pollJob``. It also defines the types of
    the requests and responses. See :doc:`API-descriptors`.

``src/scenario.ts`` and ``src/presets.ts``
    The intervention drafts from the editor, their conversion to API interventions, and the built-in presets.

``src/components.tsx``
    Small display components: ``Field``, ``Stat``, ``RankList``, ``StackedBars``, ``TrendChart``, and the consent banner.

``src/stacks.ts``, ``src/trend.ts``, ``src/format.ts``, ``src/units.ts``
    Helpers that prepare data for the charts and format numbers and units.

``src/nuts2.ts``
    The NUTS2 regional view (CircuMAT). The regional values are a placeholder split of the country value.

``src/precalculated.ts``
    Loads ``public/precalculated.json``, the analysis that the page shows when it opens.
    ``scripts/make_precalculated.py`` writes this file. Run it again when the dataset changes.

``src/consent.ts``
    Stores the analytics choice of the visitor in the browser. Analytics are not loaded yet.

How a run works
===============

When the user presses "Run analysis", ``App.tsx`` sends a baseline job and, if "Apply scenario" is selected, a
scenario job. Each run is one entry in the Analysis queue. The client polls the job until it completes or fails.
A run can be stopped. The queue keeps the results in memory only.
