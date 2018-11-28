###############
API descriptors
###############
The React front-end has access to mapping coordinates reflecting product categories, countries and indicators.
See project root static_assets:

1. final_countryTree_exiovisuals.csv
2. final_productTree_exiovisuals.csv
3. mod_indicators.csv

These mapping coordinates are not only used to render tree selectables, but also to transmit the global id's of the product categories, countries and indicators
over the websocket channel. In turn the back-end handles these messages to perform calculations and store results. For example all countries and all products in the world represent the global id
[1]. The indicator [1] represents product output. For further reference see the mapping CSV files.

API routing:

* API URL Websockets: ``<domain-ip>/ramascene/``
* API URL AJAX:  ``<domain-ip>/ajaxhandling/``
* Interface format: JSON

Default calculations
====================

The following queries denote the communication between front-end and back-end for performing default calculations.

Interface descriptors [websocket message to back-end]:

+---------------------------+-------------------------+------------------------------------------+
| Stage                     | Instances relation      | Variable name, dataType, example         |
+===========================+=========================+==========================================+
| Calculation type          |  Default calculation    | **var name: action**                     |
|                           |                         |  *JSON key: action, JSON value:  String* |
|                           |                         |       ex.:  \"action\":\"default\"       |
+---------------------------+-------------------------+------------------------------------------+
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
|                           |                         |       ex.:  \"nodesSec\":\"[3,4,7]\"     |
+---------------------------+-------------------------+------------------------------------------+
| Filter                    | Country                 | **var name: querySelection**             |
|                           |                         |  *JSON key: nodesReg, JSON value: array* |
|                           |                         |       ex.:  \"nodesReg\":\"[1]\"         |
+---------------------------+-------------------------+------------------------------------------+
| Filter                    | Indicator               | **var name: querySelection**             |
|                           |                         |  *JSON key: extn, JSON value: array*     |
|                           |                         |       ex.:  \"extn\":\"[2]\"             |
+---------------------------+-------------------------+------------------------------------------+
| Year                      | Default reference year  | **var name: querySelection**             |
|                           |                         |  *JSON key: year, JSON value: array*     |
|                           |                         |       ex.:  \"year\":\"[2011]\"          |
+---------------------------+-------------------------+------------------------------------------+
| All                       | → to back-end           | **var name: querySelection & action**    |
|                           |    [WS send]            |  *JSON : querySelection, JSON: action*   |
|                           |                         |       ex.:see table below                |
+---------------------------+-------------------------+------------------------------------------+

**→ to back-end complete payload example:**

| {
|           \"action\":
|               \"default\",
|           \"querySelection\":{
|                \"dimType\":\"Production\",
|                \"vizType\":\"TreeMap\",
|                \"nodesSec\":[3,4,7],
|                \"nodesReg\":[1],
|                \"extn\":[2],
|                \"year\":[2011],
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
|                           |                         |       ex.:  {\"job_id\":\"176\"}         |
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
|                'dimType': 'Production',
|                'extn': ['Value Added: Total'],
|                'year': [2011]
|               }
| }

If the websocket message job_status is set to "completed", the front-end can perform a POST request for results via Ajax containing the job_id
named as 'TaskID'. For example in the above websocket response we see that job_id is 176, the Ajax POST request is 'TaskID:176'.

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
|                           |                         |       ex.:  {\"job_id\":\"176\"}         |
+---------------------------+-------------------------+------------------------------------------+
| All                       | from Back-end →         | **var name: rawResultData**              |
|                           |  [AJAX response]        |  *JSON key: name, JSON value: array*     |
|                           |                         |       ex.:  {\"Total\":\"[1256.67]\"}    |
+---------------------------+-------------------------+------------------------------------------+
| All                       | from Back-end →         | **var name: job_name**                   |
|                           |   [AJAX response]       |  *JSON key: job_name, JSON value: JSON*  |
|                           |                         |       ex.:  full querySelection as names |
+---------------------------+-------------------------+------------------------------------------+

**→ from back-end complete response example:**

| {
| \"job_id\":176,
| \"unit\": {\"Value Added: Total":"M.EUR"\},
| \"job_name\": {
|           \"nodesReg\": [\"Total\"],
|           \"nodesSec\": ["Fishing", "Mining and quarrying","Construction"],
|           \"dimType\": \"Production\",
|           \"extn\": ["Value Added: Total"],
|           \"year\": [2011],
|           \"vizType\": \"GeoMap\"
|           },
| \"rawResultData\":{
|          Fishing":75172.94699626492, "Mining and quarrying":2151937.135835223, "Construction":3148250.604361363
|          }
| }


An important aspect is that in the current version the back-end expects the websocket message to contain a single value for indicator and year. Additionally
if the query selection contains "GeoMap" the "nodesReg" descriptor can be an array of multiple elements denoting multiple countries,
while the "nodesSec" descriptor can only have a single indicator.
On the other hand if the query selection contains "TreeMap" the "nodesSec" descriptor can be an array of multiple elements
denoting multiple products, while the "nodesReg" descriptor can only have a single indicator.

Modelling calculations
======================

The following table denotes the communication between front-end and back-end for modelling calculations. Modelling is applied on existing default query selections.

+---------------------------+-------------------------+---------------------------------------------+
| Stage                     | Instances relation      | Variable name, dataType, example            |
+===========================+=========================+=============================================+
| Product of interest       |  Model details          | **var name: model_details**                 |
|                           |  : Product              |  *JSON key: product, JSON value:  array*    |
|                           |                         |       ex.:  \"product\":[1]                 |
+---------------------------+-------------------------+---------------------------------------------+
| Manufacturing region      |  Model details          | **var name: model_details**                 |
|                           |  : Product origin region|  *JSON key: originReg,JSON value:  array*   |
|                           |                         |       ex.:  \"originReg\":[3]               |
+---------------------------+-------------------------+---------------------------------------------+
| Model type of calculation |  Model details          | **var name: model_details**                 |
|                           |  : Model type           |  *JSON key: consumedBy, JSON value: array* |
|                           |                         |    ex.:  \"consumedBy\":[4]"|
+---------------------------+-------------------------+---------------------------------------------+
| Region consuming          |  Model details          | **var name: model_details**                 |
|                           |  : Region of consumption|  *JSON key: consumedReg, JSON value:  array*|
|                           |                         |       ex.:  \"consumedReg\":[5]             |
+---------------------------+-------------------------+---------------------------------------------+
| Technological change      |  Model details          | **var name: model_details**                 |
|                           |  : Technical change     |  *JSON key: techChange, JSON value:  array* |
|                           |                         |       ex.:  \"techChange\":[5]              |
+---------------------------+-------------------------+---------------------------------------------+

The technological change is a single value denoting a percentage. See below for a full query example:

**→ from back-end complete response example:**

| {
| "action": "model",
| "querySelection": {
|    "dimType": "Production",
|    "vizType": "TreeMap",
|    "nodesSec": [1],
|    "nodesReg": [4,5],
|    "ext": [8],
|    "year": [2011]
|    },
|    "model_details": [
|        {
|            "product": [1],
|            "originReg": [3],
|            "consumedBy": [4],
|            "consumedReg": [5],
|            "techChange": [-15]
|        },
|        {
|            "product": [6],
|            "originReg": [5],
|            "consumedBy": [7],
|            "consumedReg": [18],
|            "techChange": [20]
|        }
|    ]
| }


Multiple model selections can be added, however a user can only specify a single-selection per "product", "originReg",
"consumedBy", "consumedReg" in the array for this version of the application.
The websocket response contains the added model details specified by name.



