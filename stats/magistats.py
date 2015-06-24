# a local statistics 
from scipy import stats
import numpy
import sklearn.metrics

# return contingency table, x categories, y categories
def tabulate(x_list, y_list):
	x_cats, xinv = numpy.unique(x_list, return_inverse=True)
	y_cats, yinv = numpy.unique(y_list, return_inverse=True)

	c_table = numpy.zeros((len(x_cats), len(y_cats)))
	for pair in zip(xinv, yinv):
		c_table[pair[0]][pair[1]] += 1
		
	pretty_table = [[""] + list(y_cats)]
	for x, row in zip(x_cats, c_table.tolist()):
		pretty_table.append([x] + row)

	return (c_table, x_cats, y_cats, pretty_table)

# statistics reporters
class Fisher(object):
	def __init__(self, x_cats, y_cats):
		self.x_cats = list(x_cats)
		self.y_cats = list(y_cats)

	def calc(self, c_table): # two-sided
		p = stats.fisher_exact(c_table)[1]
		html = "<b>P-value</b> = %s" % format(p, 'g')
		tex = "$P = %s$" % format(p, 'g')
		res = dict(p=p, X=", ".join(self.x_cats), Y=", ".join(self.y_cats),
				   report=dict(tex=tex, html=html))
		return res
	
	def title(self):
		return "Fisher's exact test, %s vs %s on %s vs %s membership" % \
		   (self.x_cats[0], self.x_cats[1], self.y_cats[0], self.y_cats[1])

class Chi2(object):
	def __init__(self, x_cats, y_cats):
		self.x_cats = list(x_cats)
		self.y_cats = list(y_cats)

	def calc(self, c_table):
		res = dict(zip(["chi2", "p", "DOF", "Expected"],
				  stats.chi2_contingency(c_table)))
		res["Valid (all cells > 5)"] = bool((res["Expected"] >= 5).all())
		res["Expected"] = res["Expected"].tolist()
		res["X"] = ", ".join(self.x_cats)
		res["Y"] = ", ".join(self.y_cats)
		tex = "$\chi^2(%d) = %0.4f, P = %0.4f$" % (res['DOF'],res['chi2'],res['p'])
		html = "&chi;<sup>2</sup>(%d) = %s, <b>P-value</b> = %s" % (res['DOF'],format(res['chi2'], 'g'),format(res['p'], 'g'))
		res["report"] = dict(tex=tex, html=html)
		return res

	def title(self):
		return "Chi square test, (%s) on (%s) membership" % \
		   (", ".join(self.x_cats), ", ".join(self.y_cats))

class AdjustedRandIndex(object):
	def __init__(self, x_labeling, y_labeling):
		self.x_cats = list(x_labeling)
		self.y_cats = list(y_labeling)

	def calc(self, x_cluster, y_cluster):
		# get the adjusted rand index
		ARI = sklearn.metrics.adjusted_rand_score(x_cluster, y_cluster)
		report = dict(tex="$ARI = {}$".format(ARI), html="ARI = {}".format(round(ARI, 3)))
		return {"ARI": ARI, "report": report}

	def title(self):
		return "Adjusted Rand Index, (%s) vs (%s) labeling" % \
			   (self.x_cats, self.y_cats)


########## validation ########### 
def check_same_type(lis, name):
	t = set(map(type, lis))
	if type(None) in t: t.remove(type(None))
	if len(t) > 1:
		return name + " has non-homogeneous type"
	elif not t:
		return name + " is all None/null"
	return None

def check_exists_and_same_type(data, field_name):
	if field_name not in data:
		return "Missing %s variable" % field_name
	else:
		return check_same_type(data[field_name], field_name)

######### common data operations ##############
	# removing nulls in pairs
def remove_paired_nulls(raw, x_field, y_field):
	xIndicesToRemove = set( i for i, x in enumerate(raw[x_field]) if x is None or x.lower() == 'null' )
	yIndicesToRemove = set( i for i, y in enumerate(raw[y_field]) if y is None or y.lower() == 'null' )
	indicesToRemove = xIndicesToRemove | yIndicesToRemove
	raw[x_field] = [ x for i, x in enumerate(raw[x_field]) if i not in indicesToRemove ]
	raw[y_field] = [ y for i, y in enumerate(raw[y_field]) if i not in indicesToRemove ]
	return indicesToRemove
	
################ set of tests for contingency-type data ##################
class contingency_tests(object):
# expects that rawdata contains two homogeneous vectors under entries 'X' and 'Y' of equal length
	def validate(self, raw): 
		errors = []
		for f in ['X','Y']:
			err = check_exists_and_same_type(raw, f) 
			if err:
				errors.append(err)
		
		if 'X' in raw and 'Y' in raw: # should be same length
			if len(raw['X']) <> len(raw['Y']):
				errors.append('X and Y are unequal lengths')
				
		return errors

	def tests(self, rawdata):
		# remove the nulls
		indicesRemoved = remove_paired_nulls(rawdata,'X','Y')

		# get contingency table
		(c_table, x_cats, y_cats, pretty_table) = \
				  tabulate(rawdata['X'], rawdata['Y'])

		# construct the results object, including the contingency table
		result = dict(table=pretty_table, \
					  stats={}, \
					  samplesRemoved=len(indicesRemoved))

		# check the number of categories
		nx, ny = len(x_cats), len(y_cats)
		if nx == 1 or ny == 1: # can't run tests on a vector
			pass

		elif nx == 2 and ny == 2:
			# run on 2x2 table
			fisher = Fisher(x_cats, y_cats)
			result['stats'][fisher.title()] = fisher.calc(c_table)

		else:
			# run the r x c chi-squared test
			chi2 = Chi2(x_cats, y_cats)
			result['stats'][chi2.title()] = chi2.calc(c_table)

			# calculate marginal distributions
			if (nx == 2 and ny > 2) or (nx > 2 and ny == 2):
				# calculate marginal distributions
				margin_X = numpy.sum(c_table,1)
				margin_Y = numpy.sum(c_table,0)
				total = numpy.sum(margin_X)

				# generate all pairs of categories
				Xs = range(nx) if nx > 2 else [0]
				Ys = range(ny) if ny > 2 else [0]
				for i, j in [ (x, y) for x in Xs for y in Ys ]:
					# Create a new dataset where we simplify the category with more
					# than two values into a binary category
					sub_table = numpy.zeros((2,2))
					sub_table[0,0] = c_table[i,j]
					sub_table[0,1] = margin_X[i] - c_table[i,j]
					sub_table[1,0] = margin_Y[j] - c_table[i,j]
					sub_table[1,1] = total - numpy.sum(sub_table)
					subx_cats = [x_cats[i], "Not " + x_cats[i]] if nx > 2 else x_cats
					suby_cats = [y_cats[j], "Not " + y_cats[j]] if ny > 2 else y_cats

					# Perform Fisher's exact test
					fisher = Fisher(subx_cats, suby_cats)
					sub_result = fisher.calc(sub_table)

					result['stats'][fisher.title()] = sub_result

		return result

################ set of tests for contingency-type data ##################
class partition_tests(object):
# expects that rawdata contains two homogeneous vectors under entries 'X' and 'Y' of equal length
	def validate(self, raw):
		errors = []
		for f in ['X','Y']:
			err = check_exists_and_same_type(raw, f) 
			if err:
				errors.append(err)
		
		if 'X' in raw and 'Y' in raw: # should be same length
			if len(raw['X']) <> len(raw['Y']):
				errors.append('X and Y are unequal lengths')

		return errors

	def tests(self, raw): # return the ARI
		indicesRemoved = remove_paired_nulls(raw, 'X','Y')

		# get the contingency table
		(_, x_cats, y_cats, pretty_table) = \
				  tabulate(raw['X'], raw['Y'])

		ari = AdjustedRandIndex(x_cats, y_cats)

		# construct the results object, including the contingency table
		result = dict(table=pretty_table,
					  stats={}, \
					  samplesRemoved=len(indicesRemoved))
		result['stats'][ari.title()] = ari.calc(raw['X'], raw['Y'])
		
		return result
