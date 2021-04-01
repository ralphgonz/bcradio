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

def process_request request
  return if request.nil?
  method, path = request.split(/\s/)
  return if path.nil?
  path, paramString = path.split('?')
  params = paramString.nil? ? {} : CGI::parse(paramString)
  _, query = path.split('/', 2)
  case query
  when "moredata"
    uri = URI("https://bandcamp.com/api/fancollection/1/collection_items")
    Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == 'https') do |http|
      bcRequest = Net::HTTP::Post.new(uri.request_uri)
      if params.key?("identity-cookie")
        bcRequest['Cookie'] = "identity=#{CGI.escape(params['identity-cookie'].first())}"
      end
      bcRequest['Content-Type'] = "application/json"
      bcRequest.body = "{\"fan_id\":#{params['fan-id'].first()},\"older_than_token\":\"#{params['older-than-token'].first()}\",\"count\":#{params['count'].first()}}"
      http.request(bcRequest).body
    end
  when /^userdata\/(.+)/
    userName = $1
    puts "User: #{userName} at #{Time.now}"
    uri = URI("https://bandcamp.com/#{userName}")
    Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == 'https') do |http|
      bcRequest = Net::HTTP::Get.new(uri.request_uri)
      if params.key?("identity-cookie")
        bcRequest['Cookie'] = "identity=#{CGI.escape(params['identity-cookie'].first())}"
      end
      http.request(bcRequest).body
    end
  else
    if query.nil? || query.empty?
      query = "index.html"
    end
    File.binread(query)
  end    
end

while session = server.accept
  begin
    request = session.gets
    responseData = process_request request
  rescue => e
    puts "==== #{e.message} at #{Time.now}"
  else
    if responseData
      response = Response.new(code: 200, data: responseData)
      response.send(session)
    end  
  ensure
    session.close    
  end
end
