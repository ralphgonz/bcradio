# frozen_string_literal: true

# bcradio.rb
require 'socket'
require 'net/http'
require 'cgi'

port = ARGV.empty? ? 5678 : ARGV[0]
server = TCPServer.new port
$stdout.sync = true

# Http response wrapper
class Response
  attr_reader :code

  def initialize(code:, data: '')
    @response = <<~END_OF_STRING
      HTTP/1.1 #{code}
      Content-Length: #{data.size}
      
      #{data}
    END_OF_STRING
    @code = code
  end

  def send(client)
    client.write(@response)
  end
end

# Main BcRadio server
class BcRadio
  def initialize session
    @session = session
    @query = nil
    @response_data = nil
    @params = {}
    request = session.gets
    return if request.nil?

    _method, uri = request.split(/\s/)
    parse_uri uri
  end

  def process_request
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

    response = Response.new(code: 200, data: @response_data)
    response.send(@session)
  end

  def close
    @session.close
  end

  ##############################################################################
  private

  def parse_uri uri
    return if uri.nil?

    uri, param_string = uri.split('?')
    @params = param_string.nil? ? {} : CGI.parse(param_string)
    _, @query = uri.split('/', 2)
    @query = 'index.html' if @query.nil? || @query.empty?
  end

  def handle_file_request
    File.binread(@query)
  end

  def handle_user_data_request user_name
    puts "User: #{user_name} at #{Time.now}"
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
puts "Starting server at #{Time.now}"
while (session = server.accept)
  begin
    bc_radio = BcRadio.new session
    bc_radio.process_request
  rescue => e # rubocop:disable Style/RescueStandardError
    puts "==== #{e.message} at #{Time.now}"
  else
    bc_radio.send_response
  ensure
    bc_radio.close
  end
end
