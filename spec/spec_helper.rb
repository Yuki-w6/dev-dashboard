ENV['WAKATIME_API_KEY'] ||= 'test-wakatime-key'
ENV['GH_PAT']           ||= 'test-github-token'
ENV['GH_USER']          ||= 'test-user'

require_relative '../scripts/fetch_metrics'

RSpec.configure do |config|
  config.mock_with :rspec do |mocks|
    mocks.verify_partial_doubles = true
  end
  config.disable_monkey_patching!
  config.order = :random
  Kernel.srand config.seed
end
