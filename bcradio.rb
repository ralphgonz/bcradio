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
  puts "REQUEST: #{request}"
  next if request.nil?

  method, full_path = request.split(/\s/)
  _, params = full_path.split('?')

  responseData = ''
  if params.nil?
    _, query = full_path.split('/', 2)
    puts "QUERY: #{query}"

    if query.nil? || query.empty?
      query = "index.html"
    end

    if query == "index.html" || query.split('/').length() > 1
      responseData = File.binread(query)
    else
      userName = query
      uri = URI("https://bandcamp.com/#{userName}")
      responseData = Net::HTTP.get_response(uri).body
    end
  else
    puts "PARAMS: #{params}"
    pHash = CGI::parse(params)
    puts "FANID: #{pHash['fan-id']}, OLDERTHANTOKEN: #{pHash['older-than-token']}, COUNT: #{pHash['count']}"
    uri = URI("https://bandcamp.com/api/fancollection/1/collection_items")
    body = "{\"fan_id\":#{pHash['fan-id'].first()},\"older_than_token\":\"#{pHash['older-than-token'].first()}\",\"count\":#{pHash['count'].first()}}"
    puts "BODY: #{body}"
    responseData = Net::HTTP.post(uri, body, "Content-Type" => "application/json").body
  end

  response = Response.new(code: 200, data: responseData)
  response.send(session)
  session.close
end
