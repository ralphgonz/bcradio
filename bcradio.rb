# frozen_string_literal: true

# bcradio.rb [PORT] [true|false]
require 'socket'
require 'net/http'
require 'cgi'

$verbose = true
port = ARGV.empty? ? 5678 : ARGV[0]
heroku_redirect_http = ARGV.empty? ? false : ARGV[1] == 'true'
server = TCPServer.new port
$stdout.sync = true

# Http response wrapper
class Response
  attr_reader :code

  def initialize(code:, data: '')
    @response = "HTTP/1.1 #{code}\r\nContent-Length: #{data.size}\r\n\r\n#{data}\r\n"
    @code = code
  end

  def send(client)
    client.write(@response)
  end
end

# Main BcRadio server
class BcRadio
  attr_reader :initialized

  def initialize session
    @session = session
    @query = nil
    @response_data = nil
    @params = {}
    @headers = {}
    get_uri session
    return if @uri.nil?

    parse_headers session
    @initialized = true
  end

  def validate_https_request
    @headers['x-forwarded-proto'] != 'http'
  end

  def process_request
    parse_uri
    puts "==== Processing request #{@query} at #{Time.now}" if $verbose
    case @query
    when %r{^userdata/(.+)}
      @response_data = handle_user_data_request Regexp.last_match(1)
    when 'moredata'
      @response_data = handle_more_data_request
    when /.+/
      @response_data = handle_file_request
    end
  end

  def send_response
    return unless @response_data

    puts "==== Sending response at #{Time.now}" if $verbose
    response = Response.new(code: 200, data: @response_data)
    response.send(@session)
  end

  def send_redirect
    puts "==== Sending redirect at #{Time.now}" if $verbose
    data = "Location: https://#{@headers['host']}#{@uri}"
    response = Response.new(code: 301, data: data)
    response.send(@session)
  end

  def close
    @session.close
  end

  ##############################################################################
  private

  def get_uri session
    request = session.gets
    return if request.nil?

    method, @uri = request.split(/\s/)
    @uri = nil if method != 'GET'
  end

  def parse_headers session
    while (line = session.gets)
      break if line.strip.empty?

      key, val = line.split(/:\s*/)
      next if key.nil?

      @headers[key.downcase] = val
    end
  end

  def parse_uri
    uri_split, param_string = @uri.split('?')
    @params = param_string.nil? ? {} : CGI.parse(param_string)
    _, @query = uri_split.split('/', 2)
    @query = 'index.html' if @query.nil? || @query.empty?
  end

  def handle_file_request
    puts "==== Read file #{@query} at #{Time.now}" if $verbose
    File.binread(@query)
  end

  def handle_user_data_request user_name
    puts "==== User data request for #{user_name} at #{Time.now}"
    uri = URI("https://bandcamp.com/#{user_name}")
    Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == 'https') do |http|
      bc_request = Net::HTTP::Get.new(uri.request_uri)
      if @params.key?('identity-cookie')
        bc_request['Cookie'] = "identity=#{CGI.escape(@params['identity-cookie'].first)}"
      end
      http.request(bc_request).body
    end
  end

  def handle_more_data_request
    puts "==== More data request at #{Time.now}" if $verbose
    uri = URI('https://bandcamp.com/api/fancollection/1/collection_items')
    Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == 'https') do |http|
      bc_request = Net::HTTP::Post.new(uri.request_uri)
      if @params.key?('identity-cookie')
        bc_request['Cookie'] = "identity=#{CGI.escape(@params['identity-cookie'].first)}"
      end
      bc_request['Content-Type'] = 'application/json'
      bc_request.body = "{\"fan_id\":#{@params['fan-id'].first},"\
        "\"older_than_token\":\"#{@params['older-than-token'].first}\","\
        "\"count\":#{@params['count'].first.to_i}}"
      http.request(bc_request).body
    end
  end
end

puts '================================================================================'
puts "==== Starting server at #{Time.now}"
while (session = server.accept)
  begin
    bc_radio = BcRadio.new session
    next unless bc_radio.initialized

    if !heroku_redirect_http || bc_radio.validate_https_request
      bc_radio.process_request
      bc_radio.send_response
    else
      bc_radio.send_redirect
    end
  rescue => e # rubocop:disable Style/RescueStandardError
    puts "==== ERROR #{e.message} at #{Time.now}"
  ensure
    bc_radio.close
  end
end
