import numpy as np
import scipy.linalg
from ramascene import productindexmanger as pim
from ramascene import querymanagement


class Modelling:
    """
    This class contains the methods for modeling
    """

    def __init__(self, ready_model_details, Y_data, load_A, year, model_details):
        self.Y_data = Y_data
        self.L = None
        self.A = None
        self.ready_model_details = ready_model_details
        self.load_A = load_A
        self.year = year
        self.model_details = model_details

    def apply_model(self):
        # copy Y to prevent any race conditions
        self.Y = self.Y_data.copy()
        # if we need to load A
        if True in self.load_A:
            # copy-on-write: an intervention copies only the pages it changes
            self.A = querymanagement.get_numpy_objects(self.year, "A", mmap_mode="c")
        # else just use L
        else:
            self.L = querymanagement.get_numpy_objects(self.year, "L")

        # loop over the different interventions, such that we can apply changes individually
        A_modified = False
        changed_rows, changed_columns = [], []

        # unpack data structures
        products = self.unpack(self.ready_model_details.items(), 'product')
        consumed_by = self.unpack(self.ready_model_details.items(), 'consumedBy')
        origin_reg = self.unpack(self.ready_model_details.items(), 'originReg')
        consumed_reg = self.unpack(self.ready_model_details.items(), 'consumedReg')
        tech_changes = self.unpack(self.ready_model_details.items(), 'techChange')
        identifiers = self.unpack(self.ready_model_details.items(), 'identifiers')

        # loop over any of the unpacked datastructures as their length are the same
        for intervention_idx, value in enumerate(products):
            product = value

            product_idx = np.arange(0, 200)
            country_idx = np.arange(0, 49)

            # convert to numpy arrays explicitly
            calc_ready_product = querymanagement.convert_to_numpy(product)
            calc_ready_origin_reg = querymanagement.convert_to_numpy(origin_reg[intervention_idx])
            calc_ready_consumed_reg = querymanagement.convert_to_numpy(consumed_reg[intervention_idx])
            calc_ready_consumed_by = querymanagement.convert_to_numpy(consumed_by[intervention_idx])
            tech_change = tech_changes[intervention_idx]

            # consuming_cat = [0, 1, 10, 76, 199] # mock up for testing
            if identifiers[intervention_idx] == "FINALCONSUMPTION":  # needs to be adapted to take ids

                # identify local coordinates
                ids = pim.ProductIndexManager(calc_ready_product,
                                              calc_ready_origin_reg,
                                              product_idx,
                                              country_idx
                                              )
                rows = ids.get_consumed_product_ids()
                columns = calc_ready_consumed_reg

                self.Y = self.model_final_demand(self.Y, rows, columns, tech_change)

            else:  # needs to be adapted to take ids

                ids = pim.ProductIndexManager(calc_ready_product,
                                              calc_ready_origin_reg,
                                              calc_ready_consumed_by,
                                              calc_ready_consumed_reg
                                              )

                rows = ids.get_consumed_product_ids()
                columns = ids.get_produced_product_ids()

                self.A = self.model_intermediates(self.A, rows, columns, tech_change)
                changed_rows.append(rows)
                changed_columns.append(columns)

                A_modified = True

        if A_modified is True:
            self.L = scenario_leontief(self.year, self.A,
                                       np.unique(np.concatenate(changed_rows)),
                                       np.unique(np.concatenate(changed_columns)))
            self.A = None
        # else the original L, as loaded above, is already in self.L

        return self.Y, self.L

    # noinspection PyMethodMayBeStatic
    def model_final_demand(self, Y, rows, columns, tech_change):
        """
        It allows for modification of values within final demand
        for scenario building
        """
        changed = Y[np.ix_(rows, columns)] * (1 - -float(tech_change[0]) * 1e-2)
        # float() accepts "nan" and "1e400" (inf), and L never sees Y, so check here
        if not np.isfinite(changed).all():
            raise ValueError("non-finite final demand; check the final-demand inputs")
        Y[np.ix_(rows, columns)] = changed
        return Y

    # noinspection PyMethodMayBeStatic
    def model_intermediates(self, A, rows, columns, tech_change):
        """
        It allows for modification of values within intermediates
        for scenario building

        """
        # Work in progress
        changed = A[np.ix_(rows, columns)] * (1 - -float(tech_change[0]) * 1e-2)
        # Check before the solve, which takes ~1.5 s on the full A: a nan makes
        # the solution nan, and an inf on the diagonal yields a finite but wrong one.
        if not np.isfinite(changed).all():
            raise ValueError("non-finite technical coefficients; check the technical-change inputs")
        A[np.ix_(rows, columns)] = changed

        return A

    # noinspection PyMethodMayBeStatic
    def unpack(self, structure, name):
        """
        Unpack deep structure of modelling details (these are arrays of local ids per intervention)

        """
        array_obj = [val for key, val in structure if key == name]
        # remove outer list
        [array_obj] = array_obj
        return array_obj


# Above this many changed rows, factorizing I - A is cheaper than the update.
# NOTE: rough break-even on the 2011 data; the residual check covers accuracy.
LOW_RANK_MAX = 2000


def scenario_leontief(year, A, rows, columns):
    """The Leontief inverse of the scenario's A, which differs from the
    published A only in the block A[rows, columns].

    Updates the published L by Woodbury when the block is small and the
    result solves (I - A) x = y; otherwise factorizes I - A.
    """
    if len(rows) <= LOW_RANK_MAX:
        L = querymanagement.get_numpy_objects(year, "L")
        published = querymanagement.get_numpy_objects(year, "A", mmap_mode="r")
        change = A[np.ix_(rows, columns)] - published[np.ix_(rows, columns)]
        update = LowRankLeontief(L, rows, columns, change)
        # Woodbury is exact only if the published L inverts the published A.
        y = np.ones((A.shape[0], 1))
        x = update.dot(y)
        if np.linalg.norm(x - A @ x - y) <= 1e-9 * np.linalg.norm(y):
            return update
    # (I - A) over A's own buffer (a copy-on-write map, so this copies it once).
    M = np.asarray(A, dtype=np.float64)
    np.negative(M, out=M)
    M[np.diag_indices_from(M)] += 1
    return LeontiefSolve(M)


class LowRankLeontief:
    """L' = (I - A')^-1 for A' = A + U D V^T, where U and V select the changed
    rows and columns and D is the change, from the published L = (I - A)^-1:

        L' = L + L[:, rows] S^-1 D L[columns, :],   S = I - D L[columns, rows]

    One product with L per call and an r x r solve, instead of factorizing
    the full n x n matrix.
    """

    def __init__(self, L, rows, columns, change, _S=None, _trans=False):
        self.L, self.rows, self.columns, self.change = L, rows, columns, change
        self.S = _S if _S is not None else scipy.linalg.lu_factor(
            np.eye(len(rows)) - change @ L[np.ix_(columns, rows)])
        self.trans = _trans

    @property
    def T(self):
        return LowRankLeontief(self.L, self.rows, self.columns, self.change, self.S, not self.trans)

    def dot(self, y):
        L, rows, columns, D = self.L, self.rows, self.columns, self.change
        if not self.trans:
            x0 = L @ y
            x = x0 + L[:, rows] @ scipy.linalg.lu_solve(self.S, D @ x0[columns])
        else:
            x0 = L.T @ y
            x = x0 + L[columns, :].T @ (D.T @ scipy.linalg.lu_solve(self.S, x0[rows], trans=1))
        if not np.isfinite(x).all():
            raise ValueError("non-finite Leontief solution; check the technical-change inputs")
        return x


class LeontiefSolve:
    """L = (I - A)^-1 without forming it. M = I - A is LU-factorized once, in
    its own buffer, and the factors serve both ways the routes use L,
    L.dot(y) and L.T.dot(y).
    """

    def __init__(self, M, _lu=None, _trans=1):
        # M.T is Fortran-ordered, so LAPACK factorizes it in place instead of
        # copying 0.77 GB. These are the factors of M^T: trans=1 solves M x = y.
        self.lu = _lu if _lu is not None else scipy.linalg.lu_factor(M.T, overwrite_a=True, check_finite=False)
        self.trans = _trans

    @property
    def T(self):
        return LeontiefSolve(None, self.lu, 1 - self.trans)

    def dot(self, y):
        x = scipy.linalg.lu_solve(self.lu, y, trans=self.trans, check_finite=False)
        # Backstop for a non-finite A that no intervention introduced (the
        # changes are checked in model_intermediates).
        if not np.isfinite(x).all():
            raise ValueError("non-finite Leontief solution; check the technical-change inputs")
        return x
