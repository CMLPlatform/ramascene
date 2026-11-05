"""Size of the dataset: how many industries (products) and regions the matrices are built from.

The matrices are laid out region by region: row index = region * n_products + product. The sizes come from
settings, so a new EXIOBASE version with another classification only needs `DATASET_N_PRODUCTS` and
`DATASET_N_COUNTRIES` changed (EXIOBASE 3.11.2 industry-by-industry: 163 and 49; the older 3.3 product-by-product data was 200 and 49).
The defaults below keep the earlier dataset working.
"""
from django.conf import settings


def n_products():
    return int(getattr(settings, "N_PRODUCTS", 163))


def n_countries():
    return int(getattr(settings, "N_COUNTRIES", 49))


def n_rows():
    """Side of the square matrices A and L."""
    return n_products() * n_countries()
