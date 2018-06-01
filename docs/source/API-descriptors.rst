###############
API descriptors
###############
The React front-end has access to mapping coordinates reflecting product categories, countries and indicators.
See project root static_assets:

1. final_countryTree_exiovisuals.csv
2. final_productTree_exiovisuals.csv
3. mod_indicators.csv

These mapping coordinates are not only used to render tree selectables, but also to transmit the global id's of the product categories, countries and indicators
over the websocket channel. In turn the back-end handles these messages to perform calculations and store results.

API routing:

* API URL Websockets: ``<domain-ip>/ramascene/``
* API URL AJAX:  ``<domain-ip>/ajaxhandling/``
* Interface format: JSON

Interface descriptors [websocket message to back-end]:

+---------------------------+-------------------------+------------------------------------------+
| Stage                     | Instances relation      | Variable name, dataType, example         |
+===========================+=========================+==========================================+
| Dimension                 | Production, Consumption | **var name: querySelection**             |
|                           |                         |  *JSON key: dimType, JSON value:  String*|
|                           |                         |       ex.:  \"dimType\":\"Production\"   |
+---------------------------+-------------------------+------------------------------------------+
| Visualization             | TreeMap, GeoMap         | **var name: querySelection**             |
|                           |                         |  *JSON key: vizType, JSON value:  String*|
|                           |                         |       ex.:  \"vizType\":\"TreeMap\"      |
+---------------------------+-------------------------+------------------------------------------+
| Filter                    | Product                 | **var name: querySelection**             |
|                           |                         |  *JSON key: nodesSec, JSON value: array* |
|                           |                         |       ex.:  \"nodesSec\":\"[1]\"         |
+---------------------------+-------------------------+------------------------------------------+
| Filter                    | Country                 | **var name: querySelection**             |
|                           |                         |  *JSON key: nodesReg, JSON value: array* |
|                           |                         |       ex.:  \"nodesReg\":\"[4,5]\"       |
+---------------------------+-------------------------+------------------------------------------+
| Filter                    | Indicator               | **var name: querySelection**             |
|                           |                         |  *JSON key: ext, JSON value: array*      |
|                           |                         |       ex.:  \"ext\":\"[8]\"              |
+---------------------------+-------------------------+------------------------------------------+
| All                       | → to back-end           | **var name: querySelection & action**    |
|                           |    [WS send]            |  *JSON : querySelection, JSON: action*   |
|                           |                         |       ex.:see table below                |
+---------------------------+-------------------------+------------------------------------------+

**→ to back-end complete payload example:**

| {
|           \"action\":
|               \"start_calc\",
|           \"querySelection\":{
|                \"dimType\":\"Production\",
|                \"vizType\":\"TreeMap\",
|                \"nodesSec\":[1],
|                \"nodesReg\":[4,5],
|                \"ext\":[8]
|                }
|  }



Interface descriptors [websocket messages from back-end]:

+---------------------------+-------------------------+------------------------------------------+
| Stage                     | Instances relation      | Variable name, dataType, example         |
+===========================+=========================+==========================================+
+---------------------------+-------------------------+------------------------------------------+
| Action request status     | from Back-end →         | **var name: action**                     |
|                           |   [WS response]         |  *JSON key: action, JSON value: string*  |
|                           |                         |       ex.:  {\"action\":\"started\"}     |
+---------------------------+-------------------------+------------------------------------------+
| Job status                | from Back-end →         |**var name: job_status**                  |
|                           |   [WS response]         | *JSON key: job_status,JSON value: string*|
|                           |                         |       ex.:  {\"job_status\":\"started\"} |
+---------------------------+-------------------------+------------------------------------------+
| Job status                | from Back-end →         |**var name: job_id**                      |
|                           |   [WS response]         | *JSON key: job_id,JSON value: int*       |
|                           |                         |       ex.:  {\"job_id\":\"165\"}         |
+---------------------------+-------------------------+------------------------------------------+
| Job name                  | from Back-end →         |**var name: job_name**                    |
|                           |   [WS response]         | *JSON key: job_name,JSON value: JSON*    |
|                           |                         |       ex.:  full querySelection as names |
+---------------------------+-------------------------+------------------------------------------+

**→ from back-end complete response example:**

| {
|  \"job_id\":176,
|  \"action\":\"check status\",
|  \"job_status\":\"completed\",
|  \"job_name\":\{
|                'nodesReg': ['Total'],
|                'vizType': 'TreeMap',
|                'nodesSec': ['Fishing', 'Mining and quarrying', 'Construction'],
|                'dimType': 'Consumption',
|                'extn': ['Value Added: Total']
|               }
| }


Interface descriptors [AJAX response]:

+---------------------------+-------------------------+------------------------------------------+
| Stage                     | Instances relation      | Variable name, dataType, example         |
+===========================+=========================+==========================================+
+---------------------------+-------------------------+------------------------------------------+
| Retrieve calculation      | from Back-end →         | **var name: unit**                       |
|                           |   [AJAX response]       |  *JSON key: name, JSON value: string*    |
|                           |                         |       ex.:  {\"Value Added\":\"[M.EUR]\"}|
+---------------------------+-------------------------+------------------------------------------+
| All                       | from Back-end →         | **var name: job_id**                     |
|                           |   [AJAX response]       |  *JSON key: job_id, JSON value: int*     |
|                           |                         |       ex.:  {\"job_id\":\"175\"}         |
+---------------------------+-------------------------+------------------------------------------+
| All                       | from Back-end →         | **var name: rawResultData**              |
|                           |  [AJAX response]        |  *JSON key: name, JSON value: array*     |
|                           |                         |       ex.:  {\"Europe\":\"[1256.67]\"}   |
+---------------------------+-------------------------+------------------------------------------+
| All                       | from Back-end →         | **var name: job_name**                   |
|                           |   [AJAX response]       |  *JSON key: job_name, JSON value: JSON*  |
|                           |                         |       ex.:  full querySelection as names |
+---------------------------+-------------------------+------------------------------------------+

**→ from back-end complete response example:**

| {
| \"job_id\":
|          175,
| \"unit\":
|          {\"GHG emissions: Total\": \"kg CO2 eq\"},
| \"job_name\":
|          {\"nodesReg\": [\"Europe\"],
|           \"nodesSec\": [\"Fishing\"],
|           \"dimType\": \"Production\",
|           \"extn\": [\"GHG emissions: Total\"],
|           \"vizType\": \"GeoMap\"},
| \"rawResultData\":
|          {\"Europe\": 13787995489.580374}
| }

