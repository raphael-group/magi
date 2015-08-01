require 'watir-webdriver'
require 'headless'
headless = Headless.new
headless.start
b = Watir::Browser.start 'www.google.com'
puts b.title
b.close
headless.destroy
