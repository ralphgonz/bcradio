# bcradio.rb
require 'socket'
require 'net/http'
require 'cgi'

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

server = TCPServer.new 5678
$stdout.sync = true

while session = server.accept
  request = session.gets
  next if request.nil?

  method, path = request.split(/\s/)
  next if path.nil?
  path, paramString = path.split('?')
  params = paramString.nil? ? {} : CGI::parse(paramString)

  responseData = ''
  if !params.key?("fan-id")
    _, query = path.split('/', 2)

    if query.nil? || query.empty?
      query = "index.html"
    end

    if query == "index.html" || query.split('/').length() > 1
      responseData = File.binread(query)
    else
      userName = query
      puts "User: #{userName}"
      uri = URI("https://bandcamp.com/#{userName}")
      Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == 'https') do |http|
        bcRequest = Net::HTTP::Get.new(uri.request_uri)
        if params.key?("identity-cookie")
          bcRequest['Cookie'] = "identity=#{CGI.escape(params['identity-cookie'].first())}"
        end
        responseData = http.request(bcRequest).body
      end
    end
  else
    uri = URI("https://bandcamp.com/api/fancollection/1/collection_items")
    Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == 'https') do |http|
      bcRequest = Net::HTTP::Post.new(uri.request_uri)
      if params.key?("identity-cookie")
        bcRequest['Cookie'] = "identity=#{CGI.escape(params['identity-cookie'].first())}"
      end
      bcRequest['Content-Type'] = "application/json"
      bcRequest.body = "{\"fan_id\":#{params['fan-id'].first()},\"older_than_token\":\"#{params['older-than-token'].first()}\",\"count\":#{params['count'].first()}}"
      responseData = http.request(bcRequest).body
    end
  end

  response = Response.new(code: 200, data: responseData)
  response.send(session)
  session.close
end
