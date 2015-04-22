# page object classes 
require 'watir-webdriver'

class BrowserContainer
  def initialize(browser)
    @browser = browser
  end  
end


class Site < BrowserContainer
  def URL 
    return ""
  end

  def home_page 
    @home_page = HomePage.new(@browser)
  end
  
  def dataset_page 
    @dataset_page = DatasetsPage.new(@browser)
  end
   
  def login_page 
    @dataset_page = LoginPage.new(@browser)
  end

  def upload_page 
    @dataset_page = UploadPage.new(@browser)
  end
  
  def close
    @browser.close
  end

  def open
    @browser.goto URL()
    self
  end

  def nav_to_login_page
    @browser.button(:text => "Login via Google").click
    next_page = LoginPage.new(@browser)
    next_page
  end

  def nav_to_query_page
    @browser.button(:text => "Query").click
    next_page = HomePage.new(@browser)
    next_page
  end
 
  def nav_to_upload_page
    @browser.link(:text => "Upload").click
    next_page = UploadPage.new(@browser)
    next_page
  end

  def nav_home
    @browser.link(:text => 'MAGI').click
    next_page = HomePage.new(@browser)
    next_page
  end

  def is_home?
    return (@browser.url == URL())
  end

  def logout_link
    return @browser.link(:text => "Logout")
  end

  def user
    # to the left of logout
    if logout_link.exists?
      return logout_link.parent.link(:index=>0).text
    else
      return nil
    end
  end

  def logout
    if logout_link.exists?
      logout_link.click
    end
  end

  def open_feedback?
    @browser.link(:text => 'Feedback').click
    open = true
    # these next few lines don't quite work
#    open = @browser.div(:id => "webklipper-publisher-widget-container-frame-container").exists?
#    if open # close
#        @browser.div(:id => "webklipper-publisher-widget-container-frame-container").click
#    end
    return open
  end

end

# BASE_URL = ENV["SITE_URL"]
BASE_URL = 'http://cbio-test.cs.brown.edu/'
class HomePage < Site
  def URL 
    return BASE_URL
  end
  
  def nav_to_datasets_page
    @browser.link(:text => "View Dataset Summaries").click
    next_page = DatasetsPage.new(@browser)
    next_page
  end

  def nav_to_login_page
    @browser.button(:text => "Login via Google").click
    next_page = LoginPage.new(@browser)
    next_page
  end
 
  def nav_to_upload_page
    @browser.link(:text => "Upload Your Data").click
    next_page = UploadPage.new(@browser)
    next_page
  end

  def query_sample(sample)
    @browser.link(:text => "Query samples").click
    @browser.text_field(:id => "sample-typeahead").value = sample
    @browser.send_keys(:tab, :enter)
    
    return SampleInfoPage.new(@browser)
  end

  def query_gene_sets(gene_sets)
    # click the dropdown
    @browser.button(:class => /dropdown-toggle/).click
    
    # clear all
    @browser.label(:class => /checkbox/, :text => 'Select all').click
    @browser.label(:class => /checkbox/, :text => 'Select all').click

    gene_sets.each do |gene_set|
      @browser.label(:class => /checkbox/, :text => gene_set).click
    end
    @browser.button(:id => "submit-genes").click
    Watir::Wait.while { @browser.div(:id => "loading").visible? }
    return GeneInfoPage.new(@browser)
  end

  def standard_query(std)
    @browser.link(:text => std).click
    @browser.button(:id => "submit-genes").click
    Watir::Wait.while { @browser.div(:id => "loading").visible? }
    return GeneInfoPage.new(@browser)
  end

  def start_tutorial
    # /text/ matches take longer but can't access elements 
    # by exact text alone
    @browser.link(:text => "Get the tour").click
  end

  def step_tutorial
    next_button = @browser.link(:text => /NEXT/)
    finish_button = @browser.link(:text => /FINISH/)
    if next_button.exists?
      next_button.click
    elsif finish_button.exists?
      finish_button.click
    end
    return next_button.exists? || finish_button.exists?
  end
end

class SampleInfoPage < Site
  def verify_sample(name)
    page_info = @browser.body.text
    return page_info.include?(name)
  end
end

class GeneInfoPage < Site
  def verify_dataset(name)
    dataset_info = @browser.div(:id => "collapseDataset").text
    return dataset_info.include?(name)
  end
  
  def nav_to_enrichments
    @browser.link(:text => /Enrichment statistics/).click
    return GeneEnrichmentPage.new(@browser)
  end
end

class GeneEnrichmentPage < Site
  def select_gene(name)
    @browser.link(:text => name).click
  end

  def gene_available?(name)
    return @browser.link(:text => name).exists?
  end

  def select_category(name)
    @browser.select(:id => "category").select(name)
  end

  def category_available?(name)
    return @browser.select(:id => "category").include?(name)    
  end
  
  def contingency_table
    return @browser.div(:id => "contingency-table").table
  end
end

class DatasetsPage < Site
  def URL
    return "#{BASE_URL}datasets"
  end

  def get_dataset_names
    t = @browser.table.strings
    dataset_col = t.index("Name")
    return t.transpose[1].drop(1)
  end

  def verify_dataset(name)
    t = @browser.table.strings
    return t.text.include(name)
  end

end

class LoginPage < Site
  def URL
    return "#{BASE_URL}auth/google/returnTo"
  end

  def login(uname, passwd)
    @browser.text_field(:id => "Email").value = uname
    @browser.text_field(:id => "Passwd").value = passwd
    @browser.button(:text => "Sign in").click

    # accept any permissions - todo: test this more
    if @browser.title == "Request for Permissions"
      Watir::Wait.while(@browser.button(:id => "Accept").enabled)
      @browser.button(:id => "Accept").click
    end

    nav_home
  end
end

class UploadPage < Site
  def URL
    return "#{BASE_URL}upload"
  end

  def upload_via_manifest(filename, dataset_name)
    # filename needs to be an absolute path
    @browser.file_field.set(filename)
    @browser.text_field(:id => 'dataset').value = dataset_name
    
    @browser.button(:text => "Submit").click
    Watir::Wait.until {@browser.div(:id => 'status').text.include? 'Success!'}
    @browser.link(:text => "homepage").click
    home = HomePage.new(@browser)
  end
end
