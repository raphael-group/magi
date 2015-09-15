require './pageobjects.rb'

# todo: figure out how to not repeat this segment
test_user = "cbio.tester"
test_pass = "Adenine=Uracil"

# substitute with :firefox to test firefox
# for IE testing run on windows with :ie
# for safari/mobile browsers, check watirwebdriver.com for information

browser = BrowserCore.new("firefox").core
browser.run_headless
site = Site.new(browser.core)

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
