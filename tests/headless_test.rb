require 'watir-webdriver'
require 'headless'
headless = Headless.new
headless.start

RSpec.describe "TEST HEADLESS" do
  it "gets a page title" do
    b = Watir::Browser.start :page
    puts b.title + 'is from' + :page
    expect(b.title).to eql "Google"
    b.close
  end
end
headless.destroy

