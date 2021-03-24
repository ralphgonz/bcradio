Rails.application.routes.draw do
  root "params#init"

  get "/params", to: "params#init"
end
