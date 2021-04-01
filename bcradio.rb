# bcradio.rb
require 'socket'
require 'net/http'
require 'cgi'

server = TCPServer.new 5678
$stdout.sync = true

class Response
  attr_reader :code

  def initialize(code:, data: "")
    @response =
    "HTTP/1.1 #{code}\r\n" +
    "Content-Length: #{data.size}\r\n" +
    "\r\n" +
    "#{data}\r\n"
    @code = code
  end

  def send(client)
    client.write(@response)
  end
end

class BcRadio
  def initialize session
    @session = session
    @query = nil
    @responseData = nil
    request = session.gets
    return if request.nil?
    method, path = request.split(/\s/)
    return if path.nil?
    path, paramString = path.split('?')
    @params = paramString.nil? ? {} : CGI::parse(paramString)
    _, @query = path.split('/', 2)
    if @query.nil? || @query.empty?
      @query = "index.html"
    end
  end

  def process_request
    case @query
    when nil
      return
    when "moredata"
      @responseData = handle_more_data_request
    when /^userdata\/(.+)/
      @responseData = handle_user_data_request $1
    else
      @responseData = handle_file_request
    end    
  end

  def send_response
    return unless @responseData
    response = Response.new(code: 200, data: @responseData)
    response.send(@session)
  end

  def close
    @session.close
  end

  private

  def handle_file_request
    File.binread(@query)
  end

  def handle_user_data_request userName
    puts "User: #{userName} at #{Time.now}"
    uri = URI("https://bandcamp.com/#{userName}")
    Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == 'https') do |http|
      bcRequest = Net::HTTP::Get.new(uri.request_uri)
      if @params.key?("identity-cookie")
        bcRequest['Cookie'] = "identity=#{CGI.escape(@params['identity-cookie'].first())}"
      end
      http.request(bcRequest).body
    end
  end

  def handle_more_data_request
    uri = URI("https://bandcamp.com/api/fancollection/1/collection_items")
    Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == 'https') do |http|
      bcRequest = Net::HTTP::Post.new(uri.request_uri)
      if @params.key?("identity-cookie")
        bcRequest['Cookie'] = "identity=#{CGI.escape(@params['identity-cookie'].first())}"
      end
      bcRequest['Content-Type'] = "application/json"
      bcRequest.body = "{\"fan_id\":#{@params['fan-id'].first()},\"older_than_token\":\"#{@params['older-than-token'].first()}\",\"count\":#{@params['count'].first()}}"
      http.request(bcRequest).body
    end
  end
end

while session = server.accept
  begin
    bcRadio = BcRadio.new session
    bcRadio.process_request
  rescue => e
    puts "==== #{e.message} at #{Time.now}"
  else
    bcRadio.send_response  
  ensure
    bcRadio.close    
  end
end
