##########
User guide
##########

This page explains how to use the web application. A user does not need to log in.

The page
========

The page has three areas.

* **Scenario modelling** (left panel): the scenario editor and a trend chart.
* **Main area**: the selection controls and the results.
* **Analysis queue** (right panel): one entry for each run, with its progress.

Select **Close** on a side panel to hide it. Select its tab at the edge of the page to open it again.
The **About** link in the top bar opens the project page. The **Help** button shows a short reminder.

When the page opens, it shows a precalculated example. Choose your own selection and press **Run analysis**
to replace it.

Run an analysis
===============

1. Choose a **Sector**, a **Country**, an **Indicator**, and a **Year**.
2. Choose the **Level**: *Country*, or *NUTS2* for the regions of a country (see below).
3. Press **Run analysis**. Press **Stop** to cancel the runs that are in progress.

When you change the selection after a run, the page tells you that the results are for the earlier selection.
Press **Run analysis** to update them.

Results
=======

The results answer three questions about the selected sector.

1. **What is the footprint of the sector in the country?** The cards show the footprint in the country and in the
   world, and the top sectors and top regions of the global footprint.
2. **What is the contribution of other sectors, and where are they?** The stacked bars show the sectors in the
   supply chain, split by country, and the countries in the supply chain, split by sector.
3. **What are the direct impacts of the sector in each region?** The table lists the regions, the share of the direct
   impact, and the value. It shows the largest rows and the selected region. Press **Show all** to see every row.

Hover over a value to see the exact quantity with its unit. See :doc:`calculations` for how the numbers are made.

NUTS2 regions
-------------

For some countries, the **NUTS2** level shows regions inside the country. These come from the CircuMAT regions.
The regional values are a placeholder split of the value of the country. They are not regional measurements.

Scenarios
=========

A scenario changes the model before the calculation. The results then show the scenario and the change against
the baseline. See :doc:`modelling` for the method.

1. In the left panel, press **+ Add intervention**.
2. Choose the **Type** of change.

   * *Final demand*: consumers buy more or less of a product.
   * *Technology change*: a sector uses more or less of a product as an input.

3. Choose the product, the country where it is produced (**Produced in**), and the country where it is consumed
   (**Consumed in**). For a technology change, also choose the **Consuming sector**.
4. Set the change in percent. A negative value is a reduction. The editor accepts values from -50 % to 50 %.
5. Add more interventions if needed. They apply together.
6. Tick **Apply scenario to results**, then press **Run scenario**.

Use **Load preset** to start from an example scenario. A preset is built from your current country and sector.

The trend chart in the left panel shows the footprint over several years, with the scenario beside the baseline.

Analysis queue
==============

Each run appears in the right panel with its steps and their progress. A run that fails shows the error. A summary
of the main numbers is listed under a finished run.

Privacy
=======

The page loads no external fonts or scripts. It stores the answer to the analytics banner in your browser.
Analytics are not active at this time.

More help
=========

* :doc:`data` explains what the numbers are.
* The `Feedback form <https://www.jotform3.leidenuniv.nl/CMLformJweb/rama-scene-feedback>`_ is open for comments.
