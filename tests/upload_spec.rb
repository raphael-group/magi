# test whether or not datasets have been uploaded already
require './pageobjects.rb'
require 'pathname.rb'

standard_datasets = ["STAD", "BLCA", "BRCA", "COADREAD", "GBM", "HNSC", "KIRC", "LAML",  "LUAD", "LUSC", "OV", "UCEC"]

# todo: figure out how to not repeat this segment
test_user = "cbio.tester"
test_pass = "Adenine=Uracil"

# initialize the browser and give the browser type here
site = Site.new(Watir::Browser.new :chrome)

RSpec.configure do |config|
  config.before(:each) {@home_page = site.home_page.open}
 # config.after(:suite) {site.close}
end

# to run tests, 
# This tests whether the standard datasets are loaded
RSpec.describe "MAGI" do
  it "has standard databases loaded" do
    dataset_page = @home_page.nav_to_datasets_page

    expect(dataset_page.get_dataset_names).to include(*standard_datasets)
  end

  it "is able to upload dataset" do
    login_page = @home_page.nav_to_login_page
    login_page.login(test_user, test_pass)

    upload_page = @home_page.nav_to_upload_page

    # upload this manifest file to the page
    manifest_file = Pathname.new(Dir.pwd + "/../public/data/manifests/tcga-pancancer-blca.json").cleanpath
    test_name = "BLCA-test"
    home = upload_page.upload_via_manifest(manifest_file, test_name)
    
    expect(home.is_home?).to be true

    dataset_page = home.nav_to_datasets_page
    expect(dataset_page.get_dataset_names).to include(test_name)
  end
end
