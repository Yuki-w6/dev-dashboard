require 'json'

RSpec.describe 'fetch_metrics.rb' do
  def stub_http_response(body:, success: true, code: '200')
    fake_response = instance_double(Net::HTTPResponse, body: body, code: code)
    allow(fake_response).to receive(:is_a?).with(Net::HTTPSuccess).and_return(success)

    http_double = instance_double(Net::HTTP)
    allow(http_double).to receive(:use_ssl=)
    allow(http_double).to receive(:request).and_return(fake_response)
    allow(Net::HTTP).to receive(:new).and_return(http_double)

    fake_response
  end

  describe '#fetch_wakatime' do
    it 'converts seconds to integers and keeps languages/projects in seconds' do
      stub_http_response(body: {
        'data' => {
          'total_seconds' => 3661.9,
          'languages' => [{ 'name' => 'Ruby', 'total_seconds' => 120.4 }],
          'projects'  => [{ 'name' => 'dev-dashboard', 'total_seconds' => 200.9 }]
        }
      }.to_json)

      expect(fetch_wakatime).to eq(
        'total_seconds' => 3661,
        'languages' => [{ 'name' => 'Ruby', 'seconds' => 120 }],
        'projects'  => [{ 'name' => 'dev-dashboard', 'seconds' => 200 }]
      )
    end

    it 'defaults languages and projects to an empty array when absent' do
      stub_http_response(body: { 'data' => { 'total_seconds' => 0 } }.to_json)

      expect(fetch_wakatime).to eq(
        'total_seconds' => 0,
        'languages' => [],
        'projects'  => []
      )
    end

    it 'raises when the API responds with an error status' do
      stub_http_response(body: 'unauthorized', success: false, code: '401')

      expect { fetch_wakatime }.to raise_error(RuntimeError, 'HTTP 401: unauthorized')
    end
  end

  describe '#fetch_github' do
    it 'extracts commit/PR/issue counts from the contributions collection' do
      stub_http_response(body: {
        'data' => {
          'user' => {
            'contributionsCollection' => {
              'totalCommitContributions' => 5,
              'totalPullRequestContributions' => 2,
              'totalIssueContributions' => 1,
              'contributionCalendar' => { 'totalContributions' => 42 }
            }
          }
        }
      }.to_json)

      expect(fetch_github).to eq(
        'commits' => 5,
        'pull_requests' => 2,
        'issues' => 1,
        'total_contributions' => 42
      )
    end

    it 'raises when the user cannot be found' do
      stub_http_response(body: { 'data' => { 'user' => nil } }.to_json)

      expect { fetch_github }.to raise_error(RuntimeError, 'contributionsCollection is nil')
    end

    it 'raises when the API responds with an error status' do
      stub_http_response(body: 'bad credentials', success: false, code: '401')

      expect { fetch_github }.to raise_error(RuntimeError, 'HTTP 401: bad credentials')
    end
  end
end
