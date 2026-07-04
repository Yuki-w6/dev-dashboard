require 'net/http'
require 'json'
require 'date'
require 'base64'

WAKATIME_API_KEY = ENV.fetch('WAKATIME_API_KEY')
GITHUB_TOKEN     = ENV.fetch('GH_PAT') { ENV.fetch('GITHUB_TOKEN') }
GITHUB_USER      = ENV.fetch('GH_USER') { ENV.fetch('GITHUB_USER') }

ROOT_DIR = File.expand_path('..', __dir__)
DATA_DIR = File.join(ROOT_DIR, 'data')
Dir.mkdir(DATA_DIR) unless Dir.exist?(DATA_DIR)

def http_get(uri, headers = {})
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true
  req = Net::HTTP::Get.new(uri)
  headers.each { |k, v| req[k] = v }
  res = http.request(req)
  raise "HTTP #{res.code}: #{res.body}" unless res.is_a?(Net::HTTPSuccess)
  JSON.parse(res.body)
end

def fetch_wakatime
  uri = URI('https://wakatime.com/api/v1/users/current/stats/last_7_days')
  token = Base64.strict_encode64(WAKATIME_API_KEY)
  data = http_get(uri, 'Authorization' => "Basic #{token}")['data']

  {
    'total_seconds' => data['total_seconds'].to_i,
    'languages' => (data['languages'] || []).map { |l| { 'name' => l['name'], 'seconds' => l['total_seconds'].to_i } },
    'projects'  => (data['projects']  || []).map { |p| { 'name' => p['name'], 'seconds' => p['total_seconds'].to_i } }
  }
end

def fetch_github
  uri = URI('https://api.github.com/graphql')
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true

  now  = DateTime.now
  from = (now - 365).strftime('%Y-%m-%dT00:00:00Z')
  to   = now.strftime('%Y-%m-%dT23:59:59Z')

  query = <<~GRAPHQL
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          totalCommitContributions
          totalPullRequestContributions
          totalIssueContributions
          contributionCalendar { totalContributions }
        }
      }
    }
  GRAPHQL

  req = Net::HTTP::Post.new(uri)
  req['Authorization'] = "Bearer #{GITHUB_TOKEN}"
  req['Content-Type']  = 'application/json'
  req.body = JSON.generate({ query: query, variables: { login: GITHUB_USER, from: from, to: to } })

  res = http.request(req)
  raise "HTTP #{res.code}: #{res.body}" unless res.is_a?(Net::HTTPSuccess)

  col = JSON.parse(res.body).dig('data', 'user', 'contributionsCollection')
  raise 'contributionsCollection is nil' if col.nil?

  {
    'commits'             => col['totalCommitContributions'].to_i,
    'pull_requests'       => col['totalPullRequestContributions'].to_i,
    'issues'              => col['totalIssueContributions'].to_i,
    'total_contributions' => col.dig('contributionCalendar', 'totalContributions').to_i
  }
end

if __FILE__ == $PROGRAM_NAME
  date      = Date.today.to_s
  snapshot  = { 'date' => date, 'wakatime' => fetch_wakatime, 'github' => fetch_github }

  daily_path = File.join(DATA_DIR, "#{date}.json")
  File.write(daily_path, JSON.pretty_generate(snapshot))

  history = Dir[File.join(DATA_DIR, '2*.json')]
              .sort
              .map { |f| JSON.parse(File.read(f)) }
  File.write(File.join(DATA_DIR, 'history.json'), JSON.pretty_generate(history))

  puts date
end
