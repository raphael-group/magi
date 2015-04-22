def assert message, &block 
  begin
    result = block.call
    if (result)
      puts "Assertion PASSED for #{message}".green
    else
      puts "Assertion FAILED for #{message}".red
    end
    return result
  rescue => e
    puts "Assertion FAILED for #{message} with exception '#{e}'".red
  end
end

