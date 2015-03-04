AMP, DEL, SNV = 0, 1, 2

class MutationData():
	"""Class to store / accumulate mutation data."""
	patientID_mutatedGenes = dict()
	genes_mutatedPatient = dict()
	patientID_tumorTypes = dict()
	tumor_tys = set()

	def __init__(self):
		self.patientID_mutatedGenes = dict()
		self.genes_mutatedPatient = dict()
		self.patientID_tumorTypes = dict()
		self.tumor_tys = set()

	def load_mutation_data(self, file_loc, ctype):
		"""Loads the mutation data in the given file. """
		#patient2mutations, mutation2patients = {}, {}	
		self.tumor_tys.add(ctype)
		self.patientID_mutatedGenes[ctype] = dict()
		self.genes_mutatedPatient[ctype] = dict()

		for line in [l.rstrip() for l in open(file_loc) if not l.startswith('#')]:
			arr = filter(lambda g: g != "", line.split('\t'))
			patient, mutations = arr[0], arr[1:]			
			
			self.patientID_mutatedGenes[ctype][patient] = {AMP : set(), DEL : set(), SNV : set(mutations)}			        
			#self.patientID_mutatedGenes[ctype][patient][SNV] = set(mutations)
			self.patientID_tumorTypes[patient] = ctype
			for gene in mutations:		
				if not gene in self.genes_mutatedPatient[ctype].keys():
					self.genes_mutatedPatient[ctype][gene] = {AMP : set(), DEL : set(), SNV : set()}			        					
				self.genes_mutatedPatient[ctype][gene][SNV].add(patient)		

	def add_genes(self, tumor_ty, genes):
		to_add = set(genes) - set( self.genes_mutatedPatient[tumor_ty].keys() )
		for g in to_add:
			self.genes_mutatedPatient[tumor_ty][g] = {AMP : set(), DEL : set(), SNV : set()}

	def add_patients(self, tumor_ty, patients):
		to_add = set(patients) - set( self.patientID_mutatedGenes[tumor_ty].keys() )
		for p in to_add:
			self.patientID_mutatedGenes[tumor_ty][p] = {AMP : set(), DEL : set(), SNV : set()}

	def add_mutation(self, tumor_ty, patient, gene, ty):
		self.patientID_mutatedGenes[tumor_ty][patient][ty].add( gene )
		self.genes_mutatedPatient[tumor_ty][gene][ty].add( patient )

	def genes(self):
		return set( [ g for t in self.tumor_tys for g in self.genes_mutatedPatient[t].keys() ] )

	def patients(self):
		return set( [ p for t in self.tumor_tys for p in self.patientID_mutatedGenes[t].keys() ] )

	def restrict_genes(self, genelist):
		"""Restricts mutation data to only the genes in the given genelist."""
		genes_mutatedPatient = dict([(t, dict()) for t in self.tumor_tys])
		for t in self.tumor_tys:
			genes_mutatedPatient[t] = dict([(g, patients)
				                            for g, patients in self.genes_mutatedPatient[t].items()
				                            if g in genelist ])

		self.new_mutation_data_from_genemap(genes_mutatedPatient)

	def remove_genes(self, genelist):
		"""Removes all genes in the genelist from the mutation data."""
		genes_mutatedPatient = dict([(t, dict()) for t in self.tumor_tys])
		for t in self.tumor_tys:
			genes_mutatedPatient[t] = dict([(g, patients)
				                            for g, patients in self.genes_mutatedPatient[t].items()
				                            if g not in genelist ])
			
		self.new_mutation_data_from_genemap(genes_mutatedPatient)

	def new_mutation_data_from_genemap(self, genes_mutatedPatient):
		"""Recreates the mutation data from a new map of genes to mutated patients."""
		patientID_mutatedGenes = dict([(ty, dict()) for ty in self.tumor_tys])
		patients = set()
		for t in self.tumor_tys:
			for g, variants in genes_mutatedPatient[t].items():
				for var_ty, mutated_samples in variants.items():
					for p in mutated_samples:
						if p not in patients:
							patientID_mutatedGenes[t][p] = {AMP:set(), DEL:set(), SNV:set()}
							patients.add( p )
						patientID_mutatedGenes[t][p][var_ty].add( g )

		self.patientID_tumorTypes = dict([(p, ty) for p, ty in self.patientID_tumorTypes.items()
                                                  if p in patients])
		self.genes_mutatedPatient = genes_mutatedPatient
		self.patientID_mutatedGenes = patientID_mutatedGenes

	def report_gene_freqs(self):
		"""Reports a dictionary mapping each gene to the number of patients with a mutation in that gene."""
		gene2numMutations = dict([(g, 0) for t in self.tumor_tys
			                      for g in self.genes_mutatedPatient[t]])
		for t in self.tumor_tys:
			for g, variants in self.genes_mutatedPatient[t].items():
				gene2numMutations[g] += len(variants[AMP]) + len(variants[DEL]) + len(variants[SNV])				

		return gene2numMutations

	def report_patient_freqs(self):
		"""Reports a dictionary mapping each patient to the number of genes that patient has mutated."""
		patient2numMutations = dict([(p, 0) for t in self.tumor_tys
			                      for p in self.patientID_mutatedGenes[t]])
		for t in self.tumor_tys:
			for p, variants in self.patientID_mutatedGenes[t].items():
				patient2numMutations[p] += len(variants[AMP]) + len(variants[DEL]) + len(variants[SNV])

		return patient2numMutations
	
	def remove_patients(self, patient_list):
		"""Removes a list of patients from the mutation data."""
		genes_mutatedPatient = dict([(t, dict()) for t in self.tumor_tys])
		for t in self.tumor_tys:
			for g, variants in self.genes_mutatedPatient[t].items():
				genes_mutatedPatient[t][g] = {AMP:set(), DEL:set(), SNV:set()}
				for var_ty, patients in variants.items():
					genes_mutatedPatient[t][g][var_ty] = patients - patient_list

		self.new_mutation_data_from_genemap(genes_mutatedPatient)

        def patients_with_no_mutations(self):
                patient2numMutations = self.report_patient_freqs()
                return set([p for p, freq in patient2numMutations.items() if freq == 0])

