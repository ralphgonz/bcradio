# frozen_string_literal: true

# bcradio.rb [PORT] [true|false]
#	Copyright 2021 Ralph Gonzalez

require 'socket'
require 'net/http'
require 'cgi'
require 'pg'

$verbose = true
port = ARGV.empty? ? 5678 : ARGV[0]
heroku_redirect_http = ARGV.empty? ? false : ARGV[1] == 'true'
server = TCPServer.new port
$stdout.sync = true

# Http response wrapper
class Response
  attr_reader :code

  def initialize(code:, data: '')
    if code == 301
      @response = "HTTP/1.1 301 Moved Permanently\r\n#{data}\r\n\r\n"
    elsif data
      @response = "HTTP/1.1 #{code}\r\nContent-Length: #{data.size}\r\n\r\n#{data}\r\n"
    else
      @response = "HTTP/1.1 #{code}\r\n\r\n\r\n"
    end
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
    @method = nil
    @uri = nil
    @body = nil
    @response_data = nil
    @params = {}
    @headers = {}
    get_uri session
    return if @uri.nil?

    parse_headers session
    get_body session if @method == 'POST'
    @initialized = true
  end

  def validate_https_request
    !@headers['host'].include?('bcradio.muskratworks.com') || @headers['x-forwarded-proto'] != 'http'
  end

  def process_request
    case @method
    when 'GET'
      process_get_request
    when 'POST'
      process_post_request
    when 'DELETE'
      process_delete_request
    end
  end

  def process_get_request
    parse_uri
    puts "==== Processing GET request #{@query} at #{Time.now}" if $verbose
    case @query
    when %r{^userdata/(.+)}
      @response_data = handle_user_data_request Regexp.last_match(1)
    when 'moredata'
      @response_data = handle_more_data_request
    when 'playlists'
      @response_data = handle_playlists_request nil
    when %r{^playlists/(.+)}
      @response_data = handle_playlists_request Regexp.last_match(1)
    when /.+/
      @response_data = handle_file_request
    end
  end

  def process_post_request
    parse_uri
    puts "==== Processing POST request #{@query} at #{Time.now}" if $verbose
    case @query
    when %r{^publish/(.+)/(.+)/(.+)}
      handle_toggle_publish_request Regexp.last_match(1), CGI.unescape(Regexp.last_match(2)), Regexp.last_match(3), @body.strip
    end
  end

  def process_delete_request
    parse_uri
    puts "==== Processing DELETE request #{@query} at #{Time.now}" if $verbose
    case @query
    when %r{^publish/(.+)/(.+)}
      handle_toggle_publish_request Regexp.last_match(1), CGI.unescape(Regexp.last_match(2)), 0, nil
    end
  end

  def send_response
    return unless @response_data || @method != 'GET'

    puts "==== Sending response at #{Time.now}" if $verbose
    response = Response.new(code: 200, data: @response_data)
    response.send(@session)
  end

  def send_redirect
    puts "==== Sending 301 redirect at #{Time.now}" if $verbose
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

    @method, @uri = request.strip.split(/\s/)
  end

  def parse_headers session
    while (line = session.gets)
      line = line.strip.downcase
      break if line.empty?

      key, val = line.split(/:\s*/)
      next if key.nil?

      @headers[key.downcase] = val
    end
  end

  def get_body session
    nchars = @headers['content-length'].to_i
    @body = session.read(nchars)
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

  def handle_playlists_request user_name
    puts "==== Playlists request for #{user_name || 'all users'} at #{Time.now}" if $verbose
    result = ''
    begin
      con = PG.connect dbname: 'bcradio', user: 'bcruser'
      query = 'select * from playlists'
      query += " where username='#{con.escape_string(user_name)}'" if user_name
      query += ' order by username, playlist_name'
      rs = con.exec query
      results = []
      rs.each do |row|
        results.append("#{row['username']}|#{row['playlist_name']}|#{row['history']}|#{row['url']}")
      end
      result = results.join("\r\n")
    ensure
      con&.close
    end
    result
  end

  def handle_toggle_publish_request user_name, playlist_name, history, url
    puts "==== Handle #{url ? 'publish' : 'unpublish'} request for #{user_name} playlist #{playlist_name} at #{Time.now}" if $verbose
    begin
      con = PG.connect dbname: 'bcradio', user: 'bcruser'
      if url
        query = "insert into playlists (username,playlist_name,history,url) values ('#{con.escape_string(user_name)}','#{con.escape_string(playlist_name)}',#{history},'#{con.escape_string(url)}')"
      else
        query = "delete from playlists where username='#{con.escape_string(user_name)}' and playlist_name='#{con.escape_string(playlist_name)}'"
      end
      con.exec query
    ensure
      con&.close
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
    puts "==== ERROR #{e.message} at #{Time.now}\r\n#{e.backtrace}"
  ensure
    bc_radio.close
  end
end
