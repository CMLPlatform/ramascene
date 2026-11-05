"""Split one country of a multi-regional input-output table into its NUTS2 regions (CircuMAT method).

Method of Stadler/Aguilar-Hernandez et al., "CircuMAT" (J. Ind. Ecol. 2026, doi 10.1007/s44498-026-00024-0),
Miller & Blair's "more than two region" logic with simple location quotients, written for any number of regions in
one pass (the reference script main_v3.py adds one region at a time and inverts the table after every region).

Everything is done on flows, so the regions add up to the nation by construction:

  * output share of industry i in region r  s[i, r]   employment share, or the income share if the industry
                                                       has no employment data
  * location quotient                       SLQ[i, r]  (emp[i,r] / emp[r]) / (emp[i] / emp), 1 without data
  * local supply fraction                   q = min(SLQ, 1);  imported-from-other-regions fraction e = 1 - q
  * regions with SLQ >= 1 are exporters; the demand that importing regions cannot cover is supplied by the exporters
    in proportion to their income share c[r] (the adjustment factor of Eq. 8)
  * technology is the national one: regional industry j in region s uses the national flow Z[i, j] * s[j, s]
  * final demand follows the household income share h[s] (all seven categories)
  * international imports: intermediate imports follow the importing industry's output (national technology), final
    demand imports follow the income share; international exports follow the exporting industry's output share
  * value added is the residual (column of x minus column sum of Z), extensions keep the national intensities

Inputs are the national matrices of the dataset: A (N x N), Y7 (N x 7*regions), x (N,). The country is replaced
by its K regions; they are appended after the other countries. Nothing outside the country changes.
"""
from dataclasses import dataclass

import numpy as np

N_FD = 7


@dataclass
class Regionalized:
    A: np.ndarray            # (N', N') technical coefficients
    Y7: np.ndarray           # (N', 7 * (countries - 1 + K)) final demand, 7 categories per region
    x: np.ndarray            # (N',) output
    world: np.ndarray        # positions of the untouched countries in the national tables (N - n,)
    n_regions: int
    n_industries: int
    output_share: np.ndarray    # (n, K) s
    q: np.ndarray               # (n, K) local supply fraction
    income_share: np.ndarray    # (K,)

    def region_slice(self, k):
        start = len(self.world) + k * self.n_industries
        return slice(start, start + self.n_industries)

    def value_added(self):
        """x minus column sums of Z; Z = A * x."""
        return self.x - (self.A * self.x[None, :]).sum(axis=0)


def shares_from_proxies(emp, income):
    """emp: (K, n) employment by region and EXIOBASE industry (zeros where no data), income: (K,).

    Returns output share s (n, K), SLQ (n, K), income share c (K,)."""
    emp = np.asarray(emp, dtype=float)
    income = np.asarray(income, dtype=float)
    K, n = emp.shape
    c = income / income.sum()
    total_by_industry = emp.sum(axis=0)                       # (n,)
    has_data = total_by_industry > 0
    region_total = emp.sum(axis=1)                            # (K,)
    grand = region_total.sum()
    with np.errstate(divide="ignore", invalid="ignore"):
        ind_share = np.where(has_data[None, :], emp / np.where(has_data, total_by_industry, 1)[None, :], 0.0)  # (K, n)
        reg_share = region_total / grand if grand > 0 else np.full(K, 1.0 / K)
        slq = ind_share / np.where(reg_share > 0, reg_share, 1.0)[:, None]
    s = np.where(has_data[None, :], ind_share, c[:, None])
    slq = np.where(has_data[None, :], slq, 1.0)
    return s.T.copy(), slq.T.copy(), c


def regionalize(A, Y7, x, country, shares, n_industries=163):
    """Replace `country` (0-based position among the national regions) by K regions.

    shares = (s, slq, c) from shares_from_proxies."""
    s, slq, c = shares
    n = n_industries
    K = s.shape[1]
    N = A.shape[0]
    n_cty = Y7.shape[1] // N_FD
    ci = np.arange(country * n, (country + 1) * n)
    world = np.setdiff1d(np.arange(N), ci)
    ycols_c = np.arange(country * N_FD, (country + 1) * N_FD)
    ycols_w = np.setdiff1d(np.arange(Y7.shape[1]), ycols_c)
    Nw = len(world)

    Zcc = A[np.ix_(ci, ci)] * x[ci][None, :]
    Zcw = A[np.ix_(ci, world)] * x[world][None, :]
    Zwc = A[np.ix_(world, ci)] * x[ci][None, :]
    Ycc = Y7[np.ix_(ci, ycols_c)]
    Ycw = Y7[np.ix_(ci, ycols_w)]
    Ywc = Y7[np.ix_(world, ycols_c)]

    q = np.minimum(slq, 1.0)
    e = 1.0 - q
    exporter = (e <= 1e-12)
    weight = exporter * c[None, :]
    wsum = weight.sum(axis=1, keepdims=True)
    w = np.divide(weight, wsum, out=np.zeros_like(weight), where=wsum > 0)         # (n, K)  w[i, r]
    # M[i, r, s]: share of region s's demand for i that is delivered by region r
    M = q[:, None, :] * np.eye(K)[None, :, :] + w[:, :, None] * e[:, None, :]       # (n, K, K)

    Zrr = np.einsum("ij,irs,js->risj", Zcc, M, s).reshape(K * n, K * n)
    Yrr = np.einsum("ic,irs,s->risc", Ycc, M, c).reshape(K * n, K * N_FD)
    Zw_r = np.einsum("wj,js->wsj", Zwc, s).reshape(Nw, K * n)
    Zr_w = np.einsum("iw,ir->riw", Zcw, s).reshape(K * n, Nw)
    Yw_r = np.einsum("wc,s->wsc", Ywc, c).reshape(Nw, K * N_FD)
    Yr_w = np.einsum("iw,ir->riw", Ycw, s).reshape(K * n, Ycw.shape[1])

    x_reg = Zrr.sum(axis=1) + Zr_w.sum(axis=1) + Yrr.sum(axis=1) + Yr_w.sum(axis=1)
    x_world = x[world]
    xn = np.concatenate([x_world, x_reg])

    Nn = Nw + K * n
    A_new = np.zeros((Nn, Nn))
    A_new[:Nw, :Nw] = A[np.ix_(world, world)]
    inv_reg = np.divide(1.0, x_reg, out=np.zeros_like(x_reg), where=x_reg > 0)
    inv_w = np.divide(1.0, x_world, out=np.zeros_like(x_world), where=x_world > 0)
    A_new[:Nw, Nw:] = Zw_r * inv_reg[None, :]
    A_new[Nw:, :Nw] = Zr_w * inv_w[None, :]
    A_new[Nw:, Nw:] = Zrr * inv_reg[None, :]

    Y_new = np.zeros((Nn, (n_cty - 1 + K) * N_FD))
    Y_new[:Nw, :Ycw.shape[1]] = Y7[np.ix_(world, ycols_w)]
    Y_new[Nw:, :Ycw.shape[1]] = Yr_w
    Y_new[:Nw, Ycw.shape[1]:] = Yw_r
    Y_new[Nw:, Ycw.shape[1]:] = Yrr
    return Regionalized(A_new, Y_new, xn, world, K, n, s, q, c)


def expand_extensions(B, country, n_regions, n_industries=163):
    """B (indicators x N) for the regionalized table: untouched countries, then the country's intensities per region."""
    n = n_industries
    N = B.shape[1]
    ci = np.arange(country * n, (country + 1) * n)
    world = np.setdiff1d(np.arange(N), ci)
    return np.concatenate([B[:, world]] + [B[:, ci]] * n_regions, axis=1)
