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
  it "accepts google logins" do
    # dataset_page = @home_page.nav_to_datasets_page
    login_page = @home_page.nav_to_login_page

    home = login_page.login(test_user, test_pass)
    expect(home.is_home?).to be true
    expect(home.logout_link).to exist
    if home.logout_link.exists?
      expect(home.user).to eql "Magi Tester"
    end
  end

  it "cleanly logs out after logging in" do
    @home_page.logout_link.click  
    expect(@home_page.user).to be_nil
  end
end
