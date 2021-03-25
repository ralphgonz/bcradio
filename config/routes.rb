Rails.application.routes.draw do
  root "params#init"

  get "/params", to: "params#init"
  get "/player", to: "player#init"
  get "/username", to: "player#username"
  get "/moredata", to: "player#moredata"
end
