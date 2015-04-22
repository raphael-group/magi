# test whether or not datasets have been uploaded already
require './pageobjects.rb'
require 'pathname.rb'

pancancer_datasets = ["BLCA", "BRCA", "COADREAD", "GBM", "HNSC", "KIRC", "LAML",  "LUAD", "LUSC", "OV", "UCEC"]

# todo: figure out how to not repeat this segment
test_user = "cbio.tester"
test_pass = "Adenine=Uracil"

site = Site.new(Watir::Browser.new :chrome)
RSpec.configure do |config|
  config.before(:each) {@home_page = site.home_page.open}
  config.after(:suite) {site.close}
end

# to run tests, 
# This tests whether the standard datasets are loaded
RSpec.describe "MAGI" do
  it "can query datasets OV and UCEC" do
    @home_page.nav_home
    datasets = ["OV", "UCEC"]
    query_page = @home_page.query_gene_sets(datasets)
    datasets.each do |set|
      expect(query_page.verify_dataset(set)).to be true
    end
  end

  it "can query for sample TCGA-CU-A0YR" do
    @home_page.nav_home

    sample = "TCGA-CU-A0YR"
    query_page = @home_page.query_sample(sample)
    expect(query_page.verify_sample(sample)).to be true
  end

 #  it "can calculate enrichments for a standard query" do
 #    @home_page.nav_home

 #    std = 'SWI-SNF / TCGA Pan-Cancer'
 #    query_page = @home_page.standard_query(std)
 #    pancancer_datasets.each do |set|
 #      expect(query_page.verify_dataset(set)).to be true
 #    end
    
 #    enrichment_page = query_page.nav_to_enrichments

 # # stale element here - has problems
 #    expect(enrichment_page.category_available?("Gender")).to be true
 #    enrichment_page.select_category("Gender")

 #    expect(enrichment_page.gene_available?("ARID2")).to be true
 #    enrichment_page.select_gene("ARID2")

 #    expect(enrichment_page.contingency_table).exists?.to be true
 #  end

end
