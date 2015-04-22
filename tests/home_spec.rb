require './pageobjects.rb'

# todo: figure out how to not repeat this segment
test_user = "cbio.tester"
test_pass = "Adenine=Uracil"

site = Site.new(Watir::Browser.new :chrome)
RSpec.configure do |config|
  config.before(:each) {@home_page = site.home_page.open}
  config.after(:suite) {site.close}
end

RSpec.describe "MAGI" do
   it "runs a tutorial" do
    @home_page.start_tutorial
    while @home_page.step_tutorial
    end
  end
  
end
